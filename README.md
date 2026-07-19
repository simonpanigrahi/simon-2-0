> **SCOPE FROZEN until Nov 1, 2026.**

# Simon 2.0 — The 26-Week Campaign

A personal, single-user goal-tracker built as a gamified "26-week campaign": each week has a **boss fight** (the week's headline objective) drawn from a fixed season plan, and each day has seven **quests** (habits like Deep Work, Lab Block, Bond) you tick off. Ticking quests, logging side quests, and shipping bosses earn XP that drives a level/rank ribbon, a daily-streak counter on the minimum-viable-day habits, and a weekly HP meter. It's a static, installable PWA hosted on GitHub Pages, meant to be used interchangeably across Ubuntu, a Tab S9+, and an iPhone — with the same data on every device.

Live: **https://simonpanigrahi.github.io/simon-2-0/**

## Stack
- **Vite + React 19**, plain JavaScript (no TypeScript).
- **Hand-written CSS** in a single file (`src/index.css`) — no UI library, no Tailwind. Cormorant Garamond + IBM Plex Mono via Google Fonts.
- **Persistence:** `localStorage` (offline-first), with optional cross-device sync layered on top.
- **PWA:** web manifest, generated icons, iOS standalone meta, and a build-versioned service worker that precaches the app shell for offline opens.
- **Hosting/CI:** GitHub Pages; every push to `main` builds and deploys `dist/` via GitHub Actions. Vite `base` is `/simon-2-0/` to match the Pages subpath.
- Dependencies are intentionally minimal: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`.

## How sync works
The app is **offline-first**. It always reads and writes `localStorage` instantly, so it's fully functional with no account and no network — in that state the header sync indicator reads **"local only"**.

Optionally, you can turn on **cross-device sync using a private GitHub Gist as the database**:
- A single gist file, `simon2-data.json`, holds your campaign state as JSON.
- Every local write stamps an `updatedAt` timestamp. On load, the app renders from `localStorage` immediately, then fetches the gist in the background and applies **last-writer-wins**: whichever copy has the higher `updatedAt` wins. If the remote is newer it's adopted and re-rendered; if local is newer it's pushed up.
- After each action, the app saves locally right away and **debounces a gist push by 2 seconds**.
- The header indicator shows **synced / syncing… / offline / sync error — check settings** (network failure vs auth/not-found are distinguished).
- Your **Gist ID and access token live only in that device's `localStorage`** (`simon2_gist_id`, `simon2_token`). The token is never committed, logged, exported, or included in the synced data. Cross-device data lives only in your private gist.

## New-device setup (enabling sync)
You need this once per gist, then just the two values on each device.

**One-time (create the database):**
1. Create a **private gist** at https://gist.github.com with a single file named exactly `simon2-data.json` and any placeholder content (e.g. `{}`).
2. Copy its **Gist ID** — the hash at the end of the gist URL.
3. Create a **fine-grained Personal Access Token** with **gist read/write** permission (GitHub → Settings → Developer settings → Personal access tokens). If a fine-grained token is rejected on gists, a classic token with the `gist` scope works too.

**On each device:**
4. Open the app, tap the **⚙ gear** in the header.
5. Paste the **Gist ID** and **token**, then **Save**. (The token field shows only that a token is saved — leave it blank to keep the existing one.)
6. The indicator moves to **syncing… → synced**. The first device populates the gist; every other device pulls it and merges by timestamp.

**Installing as an app:** open the live URL, then — iOS Safari: Share → *Add to Home Screen*; Android Chrome: ⋮ → *Install app*; desktop Chrome/Edge: the install icon in the address bar. First open needs a network connection to cache the shell; after that it opens offline.

---
*Public repo. The deployed app shows only the tracker; `tracker-spec.jsx` is the original design blueprint and has had personal names scrubbed. Sync data stays in your private gist.*
