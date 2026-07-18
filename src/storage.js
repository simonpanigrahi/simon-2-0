// Persistence seam for the campaign state.
//
// Components only ever call loadState()/saveState(state) — they never touch
// localStorage directly. That keeps this module the single place persistence
// lives, so a remote-sync layer can be added later WITHOUT touching components:
// wrap these two functions (e.g. saveState also pushes to a server, loadState
// merges a remote snapshot) and keep the same signatures.
//
// State shape is fixed by the spec: { days: {ISO: {q, side}}, weeks: {n: {boss, hpLost}} }
// plus an `updatedAt` (epoch ms) stamped on every write — used by the sync layer
// for last-writer-wins across devices. Components never read updatedAt.

export const STORAGE_KEY = "simon2_campaign_v1";

export const emptyState = () => ({ days: {}, weeks: {}, updatedAt: 0 });

// Guard against partially-shaped or hand-edited data so the UI never crashes on
// a missing `days`/`weeks`. Unknown top-level keys are dropped.
const normalize = (raw) => {
  if (!raw || typeof raw !== "object") return emptyState();
  return {
    days: raw.days && typeof raw.days === "object" ? raw.days : {},
    weeks: raw.weeks && typeof raw.weeks === "object" ? raw.weeks : {},
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
  };
};

// Synchronous by design (localStorage is sync). Returns a valid state on
// first-run (empty), corrupted JSON, or when storage is unavailable.
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return normalize(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

// Returns true on success, false if the write failed (quota, private mode, …)
// so the caller can surface a "save failed" hint instead of throwing.
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
