import { useCallback, useEffect, useRef, useState } from "react";
import { loadState, saveState } from "./storage.js";
import { getCreds, setCreds, clearCreds, hasCreds, pullGist, pushGist } from "./sync.js";

const PUSH_DELAY = 2000; // debounce window for gist pushes after a user action
const PULL_THROTTLE = 3000; // min gap between background pulls on focus/foreground

// The exact indicator strings the header shows.
export const SYNC = {
  local: "local only",
  synced: "synced",
  syncing: "syncing…",
  offline: "offline",
  error: "sync error — check settings",
};

// network → offline; auth(401/403) / notfound(404) / other → check-settings.
const statusFor = (result) => {
  if (result.status === "ok") return SYNC.synced;
  if (result.status === "network") return SYNC.offline;
  return SYNC.error;
};

const cleanState = (raw) => ({
  days: raw && typeof raw.days === "object" ? raw.days : {},
  weeks: raw && typeof raw.weeks === "object" ? raw.weeks : {},
  updatedAt: raw && typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
});

// Signature of the *content* (updatedAt excluded). Used to tell a real user
// change apart from a no-op re-render / mount / StrictMode double-invoke / an
// adopted-remote setState — so we only persist and push on genuine edits.
const contentSig = (s) => JSON.stringify({ days: s.days || {}, weeks: s.weeks || {} });

// Offline-first sync controller. The component renders instantly from
// localStorage (via useState(loadState)); this hook then reconciles with the
// gist in the background and keeps them in sync — without the tracker
// components knowing anything about it.
//
// Auto-sync without re-touching credentials: creds persist in localStorage, a
// change auto-pushes (debounced, and flushed immediately when the app is
// backgrounded so mobile doesn't drop it), and returning to the app pulls the
// other device's latest.
export function useSync({ state, setState }) {
  const [status, setStatus] = useState(() => (hasCreds() ? SYNC.syncing : SYNC.local));
  const [creds, setCredsState] = useState(() => {
    const c = getCreds();
    return { gistId: c.gistId, hasToken: !!c.token };
  });

  const pushTimer = useRef(null); // non-null ⇒ a debounced push is pending
  const localUpdatedAt = useRef(loadState().updatedAt || 0);
  const lastSig = useRef(contentSig(loadState())); // what's currently persisted
  const lastPull = useRef(0); // throttles focus/foreground pulls
  const didInit = useRef(false);

  // Push the freshest local snapshot. keepalive lets the request complete even
  // as the page is being backgrounded/closed.
  const doPush = useCallback(async (opts = {}) => {
    const c = getCreds();
    if (!c.gistId || !c.token) {
      setStatus(SYNC.local);
      return;
    }
    setStatus(SYNC.syncing);
    setStatus(statusFor(await pushGist(c, loadState(), opts)));
  }, []);

  // Remote wins: mirror it into localStorage + React state. Pre-setting lastSig
  // to the remote content means the resulting setState is seen as "no change",
  // so it is never echoed back up as a push.
  const applyRemote = useCallback(
    (remote) => {
      const clean = cleanState(remote);
      lastSig.current = contentSig(clean);
      localUpdatedAt.current = clean.updatedAt;
      saveState(clean);
      setState(clean);
    },
    [setState]
  );

  // Pull, then last-writer-wins by updatedAt.
  const reconcile = useCallback(async () => {
    lastPull.current = Date.now();
    const c = getCreds();
    if (!c.gistId || !c.token) {
      setStatus(SYNC.local);
      return;
    }
    setStatus(SYNC.syncing);
    const res = await pullGist(c);
    if (res.status !== "ok") {
      setStatus(statusFor(res));
      return;
    }
    if (!res.state) {
      await doPush(); // gist file doesn't exist yet — create it from local
      return;
    }
    const remoteTs = typeof res.state.updatedAt === "number" ? res.state.updatedAt : 0;
    if (remoteTs > localUpdatedAt.current) {
      applyRemote(res.state);
      setStatus(SYNC.synced);
    } else {
      await doPush(); // local is newer or equal — push it up
    }
  }, [applyRemote, doPush]);

  // Send a pending push immediately (skip the debounce) — used when the app is
  // hidden/closed so a just-made change isn't lost on mobile.
  const flushPush = useCallback(() => {
    if (!pushTimer.current) return; // nothing pending
    clearTimeout(pushTimer.current);
    pushTimer.current = null;
    doPush({ keepalive: true });
  }, [doPush]);

  // Pull on returning to the app, throttled so rapid focus events don't hammer the API.
  const maybeReconcile = useCallback(() => {
    if (!hasCreds()) return;
    if (Date.now() - lastPull.current < PULL_THROTTLE) return;
    reconcile();
  }, [reconcile]);

  // Background reconcile once on mount (UI is already visible from localStorage).
  // The ref guard makes it fire once even under StrictMode's double-invoke.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    reconcile();
  }, [reconcile]);

  // Auto-sync around app lifecycle: flush a pending push when leaving, pull when
  // returning. Covers mobile app-switching (visibilitychange) and tab close
  // (pagehide) as well as desktop window focus.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushPush();
      else maybeReconcile();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushPush);
    window.addEventListener("focus", maybeReconcile);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushPush);
      window.removeEventListener("focus", maybeReconcile);
    };
  }, [flushPush, maybeReconcile]);

  // On a genuine content change: stamp + save locally immediately, then debounce
  // a push. No-op re-renders (same content) are ignored, so mount, StrictMode
  // re-runs, and adopted-remote updates never trigger a spurious write/push.
  useEffect(() => {
    const sig = contentSig(state);
    if (sig === lastSig.current) return;
    lastSig.current = sig;

    const ts = Date.now();
    localUpdatedAt.current = ts;
    saveState({ days: state.days, weeks: state.weeks, updatedAt: ts });

    if (!hasCreds()) {
      setStatus(SYNC.local);
      return;
    }
    setStatus(SYNC.syncing);
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null;
      doPush();
    }, PUSH_DELAY);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [state, doPush]);

  const saveSettings = useCallback(
    async ({ gistId, token }) => {
      setCreds({ gistId, token });
      const c = getCreds();
      setCredsState({ gistId: c.gistId, hasToken: !!c.token });
      await reconcile();
    },
    [reconcile]
  );

  const clearSettings = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = null;
    clearCreds();
    setCredsState({ gistId: "", hasToken: false });
    setStatus(SYNC.local);
  }, []);

  return {
    status,
    gistId: creds.gistId,
    hasToken: creds.hasToken,
    saveSettings,
    clearSettings,
    syncNow: reconcile,
  };
}
