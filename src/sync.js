// Cross-device sync layer: a private GitHub Gist is the database.
//
// This module is pure (no React). It owns two things:
//   1. credential storage — the Gist ID and PAT live in localStorage ONLY, on
//      this device. The token is never logged, exported, or written anywhere
//      else (in particular it is never part of the synced state payload).
//   2. the Gist REST calls — pull/push the single file "simon2-data.json".
//
// Every network function returns a tagged result so callers can distinguish
// auth (401/403) vs not-found (404) vs network failure vs other errors, and
// never throws.

export const GIST_ID_KEY = "simon2_gist_id";
export const TOKEN_KEY = "simon2_token";
export const GIST_FILENAME = "simon2-data.json";

const API = "https://api.github.com/gists/";

// ─── Credentials (this device only) ──────────────────────────────────────────
export function getCreds() {
  try {
    return {
      gistId: localStorage.getItem(GIST_ID_KEY) || "",
      token: localStorage.getItem(TOKEN_KEY) || "",
    };
  } catch {
    return { gistId: "", token: "" };
  }
}

export function hasCreds() {
  const { gistId, token } = getCreds();
  return !!(gistId && token);
}

// Sets the Gist ID always; sets the token only when a new one is provided, so a
// blank token field means "keep the token already stored on this device".
export function setCreds({ gistId, token }) {
  try {
    if (typeof gistId === "string") localStorage.setItem(GIST_ID_KEY, gistId.trim());
    if (token && token.trim()) localStorage.setItem(TOKEN_KEY, token.trim());
    return true;
  } catch {
    return false;
  }
}

export function clearCreds() {
  try {
    localStorage.removeItem(GIST_ID_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// ─── Gist REST ────────────────────────────────────────────────────────────────
const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

const classify = (res) => {
  if (res.status === 401 || res.status === 403) return "auth";
  if (res.status === 404) return "notfound";
  return "error";
};

// Result: { status: "ok", state } | { status: "ok", state: null } (file absent)
//       | { status: "auth" | "notfound" | "network" | "error" }
export async function pullGist({ gistId, token }) {
  let res;
  try {
    res = await fetch(API + encodeURIComponent(gistId), { headers: authHeaders(token) });
  } catch {
    return { status: "network" };
  }
  if (!res.ok) return { status: classify(res) };

  let data;
  try {
    data = await res.json();
  } catch {
    return { status: "error" };
  }

  const file = data && data.files && data.files[GIST_FILENAME];
  if (!file) return { status: "ok", state: null }; // gist exists but our file isn't there yet

  let content = file.content;
  if (file.truncated && file.raw_url) {
    try {
      content = await (await fetch(file.raw_url, { headers: authHeaders(token) })).text();
    } catch {
      return { status: "network" };
    }
  }

  try {
    return { status: "ok", state: JSON.parse(content) };
  } catch {
    return { status: "error" }; // corrupt remote JSON — don't clobber local
  }
}

// Result: { status: "ok" | "auth" | "notfound" | "network" | "error" }
// opts.keepalive lets the request outlive the page (flush-on-background). The
// payload is tiny, well under the 64KB keepalive limit.
export async function pushGist({ gistId, token }, state, opts = {}) {
  const body = JSON.stringify({
    files: { [GIST_FILENAME]: { content: JSON.stringify(state) } },
  });
  let res;
  try {
    res = await fetch(API + encodeURIComponent(gistId), {
      method: "PATCH",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body,
      keepalive: opts.keepalive === true,
    });
  } catch {
    return { status: "network" };
  }
  return res.ok ? { status: "ok" } : { status: classify(res) };
}
