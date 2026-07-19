# SIMON 2.0 — Project context

Context primer for any AI/agent session picking up this repo. Reflects the finished state: the tracker, cross-device sync, and PWA installability are all built, tested, and deployed.

## What this is
A personal, single-user goal-tracker PWA for one user (Simon), tracking a self-imposed 26-week "campaign" (GATE exam prep + research + life habits, Jul 2026 → Jan 2027). Gamified: weekly **boss fights** from a fixed season plan, 7 daily **quests**, XP-driven **levels/rank**, a **streak** on minimum-viable-day habits, and a weekly **HP** meter. Hosted as a static site on **GitHub Pages**, used interchangeably across Ubuntu, a Tab S9+, and an iPhone.

## Current phase: feature-complete v1
The three build tasks are done — port of the tracker, GitHub-Gist sync, and PWA. **Scope is frozen until Nov 1, 2026** (see README). Do not add features unless asked. Likely future asks: self-hosting fonts for offline, history/analytics views, editing past days.

## Repo & hosting
- **Repo:** `simonpanigrahi/simon-2-0`, **public** (started private; made public to unblock Pages on the free plan).
- **Live URL:** https://simonpanigrahi.github.io/simon-2-0/
- **CI/CD:** `.github/workflows/deploy.yml` builds and deploys `dist/` to Pages on **every push to `main`** (also manual `workflow_dispatch`). Pages source = GitHub Actions. The live public site reflects `main` within ~30s — be deliberate about pushes.
- **Branch:** `main`.

## Hard constraints (do not violate)
- **Plain JavaScript only. No TypeScript.**
- **No UI component libraries. No Tailwind / no CSS framework.** All styling is hand-written CSS in **one file** (`src/index.css`).
- **No routing, no state libraries.**
- **Vite `base` must stay `/simon-2-0/`** — matches the Pages subpath; it's referenced by the manifest, service worker, and SW registration. Changing it breaks asset URLs, sync scope, and the SW.
- Dependencies stay minimal: only `react`, `react-dom` (deps) and `vite`, `@vitejs/plugin-react` (devDeps).

## Architecture
- **`src/data.js`** — campaign constants (`SEASON` = 27 entries, index 0 = pre-season; `QUESTS` = 7 habits; `LEVELS`) + pure derivations (`computeXp`, `computeStreak`, `computeLast7`, `weekOf`, `levelFor`). No React, no I/O — fully testable. **XP is always derived from state, never stored** (quest ×10, side ×20, boss ×150).
- **`src/storage.js`** — the `localStorage` layer. `loadState()` / `saveState(state)`, synchronous. State shape: `{ days: {ISO: {q, side}}, weeks: {n: {boss, hpLost}}, updatedAt }`. `normalize()` guards against corrupt/partial JSON (falls back to empty state; first-run safe). Components never read `updatedAt`.
- **`src/sync.js`** — pure GitHub Gist REST + credential storage (no React). Pull/push the gist file `simon2-data.json`. Creds live in `localStorage` only (`simon2_gist_id`, `simon2_token`). **The token is never logged, committed, exported, or put in the synced payload** — keep it that way. Network results are tagged so callers distinguish auth (401/403) / not-found (404) / network / other.
- **`src/useSync.js`** — offline-first controller hook. Renders instantly from `localStorage`, reconciles with the gist in the background, **last-writer-wins by `updatedAt`**. Every write stamps `updatedAt`; each action saves locally immediately and **debounces a gist push by 2s**. Uses a **content-signature guard** (not a first-run flag) so mount / StrictMode double-invoke / adopted-remote setState never trigger a spurious push — important, don't regress this. Exposes the indicator strings via `SYNC`.
- **`src/SettingsModal.jsx`** — gear-opened modal for Gist ID + token, with "Stored only on this device"; the token value is never rendered back.
- **`src/App.jsx`** — the tracker UI (header + XP ribbon, boss-fight panel with week nav, quest list, side quests, 7-day scorecard, laws footer) plus the sync indicator, gear, and modal. Persistence/sync are entirely inside `useSync`; the tracker sections don't know about sync.
- **`src/main.jsx`** — React root; registers the service worker in production at `BASE_URL + 'sw.js'`.
- **`vite.config.js`** — `base` + React plugin + a build plugin that emits `dist/sw.js`. Cache name is versioned by a content hash of the exact shell (includes hashed asset names) → new `sw.js` every deploy, old caches purged on activate. Navigations network-first, hashed assets cache-first, cross-origin (GitHub API, fonts) left to the network.
- **`public/`** — `manifest.json` (name "Simon 2.0", short_name "S2", standalone, `#191B14`, start_url/scope `/simon-2-0/`), `icons/` (brass "S2" monogram: 192, 512, maskable-512, apple-touch-icon-180), `favicon.svg`.
- **`index.html`** — manifest link, apple-touch-icon, iOS standalone meta, `viewport-fit=cover`, Google Fonts. Vite rewrites `/`-absolute paths with the base at build.

## Data flow (how a change propagates)
Action → `setState` in `App.jsx` → `useSync` effect stamps `updatedAt` + `saveState` (immediate) → debounced `pushGist` (if creds) → indicator `syncing… → synced`. On load: `loadState` (instant render) → background `pullGist` → adopt-remote-or-push by timestamp. XP/streak/scorecard are recomputed from state on every render.

## tracker-spec.jsx (historical)
The original design blueprint. **Not imported, does not run.** It targeted a claude.ai Artifact runtime (`window.storage`, Tailwind classes) and was ported into the modules above. Kept for reference; personal names were scrubbed (real name → "mentor"). If you touch it, keep it generic — the repo is public.

## Testing note
There's no test runner in the repo. Prior work verified behavior with headless-browser drives (Playwright against `vite dev` / `vite preview`): tracker interactions + XP math, sync flows against a mocked GitHub API (both merge directions, debounce, error mapping, token-never-in-payload), and PWA/offline (SW scope, versioned precache, offline shell, cache purge). Re-verify the same way after changes to state, sync, or the SW.

## Practical notes
- Local dev: `npm install`, then `npm run dev`. Build: `npm run build` (→ `dist/`, gitignored). Preview the real build (needed to exercise the service worker) at the base path: `npm run preview`.
- The SW updates on the visit *after* a deploy (standard PWA behavior), and offline opens fall back to system fonts (Google Fonts is cross-origin, not precached).
- CI shows a harmless "Node 20 actions forced to Node 24" deprecation warning; not blocking.
