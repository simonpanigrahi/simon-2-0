# SIMON 2.0 — Project context

Context primer for any AI/agent session picking up this repo. Reflects the state as of the privacy-scrub commit.

## What this is
A personal goal-tracker **PWA-to-be** for one user (Simon), tracking a self-imposed 26-week "campaign" (GATE exam prep + research + life habits, Jul 2026 → Jan 2027). It is built to be hosted as a static site on **GitHub Pages** and used across Ubuntu, a Tab S9+, and an iPhone.

## Current phase: freshly scaffolded, zero features
The project is a working Vite + React skeleton that builds, deploys, and renders a single placeholder heading — nothing more. There is **no tracker functionality yet**. The build-and-deploy pipeline is proven end-to-end; the application logic is a blank slate. The next phase is implementing the actual tracker UI and state. **Do not build features unless asked.**

## Repo & hosting state
- **Repo:** `simonpanigrahi/simon-2-0`, **public** (started private; made public to unblock Pages on the free plan).
- **Live URL:** https://simonpanigrahi.github.io/simon-2-0/ — serving, returns 200, shows "SIMON 2.0".
- **CI/CD:** `.github/workflows/deploy.yml` builds and deploys `dist/` to Pages on **every push to `main`** (and manual `workflow_dispatch`). Pages source = GitHub Actions.
- **Branch:** `main`.

## Hard constraints (from the original brief — do not violate)
- **Plain JavaScript only. No TypeScript.**
- **No UI component libraries. No Tailwind / no CSS framework.** All styling is hand-written CSS in **one file** (`src/index.css`).
- **Vite `base` must stay `/simon-2-0/`** — it matches the Pages subpath. Breaking this breaks all asset URLs on the live site.
- Dependencies are intentionally minimal: only `react`, `react-dom`, `vite`, `@vitejs/plugin-react`. (Template's `oxlint` and `@types/*` were deliberately removed.)

## File-by-file (everything that exists)
| File | Role |
|---|---|
| `index.html` | Entry HTML. Title "SIMON 2.0", `theme-color`, mounts `#root`, loads `src/main.jsx`. |
| `src/main.jsx` | React 19 root. `createRoot(...).render(<StrictMode><App/></StrictMode>)`, imports `index.css`. |
| `src/App.jsx` | **The only app code. ~7 lines.** Renders `<main class="shell"><h1 class="title">SIMON 2.0</h1></main>`. This is the placeholder to replace. |
| `src/index.css` | The single stylesheet. CSS custom properties for an olive-ink palette, box-sizing reset, centers the heading. |
| `vite.config.js` | React plugin + `base: '/simon-2-0/'`. |
| `.github/workflows/deploy.yml` | Node 22, `npm ci` → `npm run build` → upload `dist/` → deploy-pages. |
| `public/favicon.svg` | Default Vite favicon (unchanged). |
| `.gitignore` | Ignores `node_modules/`, `dist/`, `.env*`, `*.token`. |
| `README.md` | 3-line blurb; notes scope is "FROZEN until Nov 1, 2026". |
| `tracker-spec.jsx` | **Design blueprint — NOT wired into the app.** See below. |

## Most important thing to understand: `tracker-spec.jsx`
This ~361-line file is the **intended feature design**, but it is **not imported anywhere** and **does not run**. Do not naively copy it into `App.jsx` — it will break, because it was written for a **different runtime** (a claude.ai Artifact), not for this Vite/Pages app. Specifically:
- It calls **`window.storage.get/set`** for persistence — a claude.ai Artifacts API that **does not exist** on GitHub Pages. Real implementation must swap this for `localStorage` (or IndexedDB).
- It uses **Tailwind utility classes** (`flex items-center justify-center font-mono`, etc.) — there is **no Tailwind** here, so those classes do nothing. Everything must be rewritten as hand-authored CSS. It also `@import`s Google Fonts over the network in a `<style>` block; a Pages build should self-host or drop those.

What it *does* usefully define (treat as the product spec to port):
- **`SEASON`** — 27 weeks of `{ boss, focus }` objectives (index 0 = pre-season tutorial week).
- **`QUESTS`** — 7 daily habits (Anchor, Deep Work I/II, Lab, Move, Bond, Shutdown), each flagged as MVD (minimum-viable-day) or not.
- **`LEVELS`** — XP thresholds → titles (Unranked → Sovereign → Elite).
- **Palette `C`** — the olive/brass/bone "campaign ledger" colors (already mirrored into `index.css` variables).
- **Game mechanics** — XP (10/quest, 20/side-task, 150/boss), weekly **HP** (5, minus losses), **streak** logic on consecutive MVD days, a 7-day scorecard, and the persisted state shape `{ days: {ISO: {q, side}}, weeks: {n: {boss, hpLost}} }`.

## Privacy note
The repo is **public**. `tracker-spec.jsx` has had a wording-only privacy scrub: real names replaced with neutral role words ("mentor"), relationship-specific text neutralized. Mechanics, numbers, dates, and structure are unchanged. Keep it that way — if you add personal data, either keep it generic or move it out of the public repo. The user's own name/username is intentionally retained.

## What is explicitly NOT done
- No tracker UI, no state, no persistence, no routing.
- **No PWA infrastructure** despite the name: no `manifest.json`, no service worker, no offline support, no install prompt, no app icons (only the default favicon).
- No tests, no linting.

## Practical notes
- Local dev: `npm install` then `npm run dev`. Build: `npm run build` (emits to `dist/`, gitignored). Preview the built output at the real base path with `npm run preview`.
- Any push to `main` auto-deploys — the live **public** site reflects `main` within ~30s. Be deliberate about pushes.
- CI shows a harmless "Node 20 actions forced to Node 24" deprecation warning; not currently blocking.
