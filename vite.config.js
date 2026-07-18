import { createHash } from 'node:crypto'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BASE = '/simon-2-0/'

// The service worker text. CACHE is versioned per build (hash of the exact
// shell, which includes content-hashed asset names), so every deploy produces a
// byte-different sw.js → the browser updates it, old caches are purged on
// activate, and stale JS is never served. Navigations are network-first (fresh
// index.html after a deploy); hashed assets are cache-first (immutable).
// Cross-origin requests (GitHub API, Google Fonts) are left to the network, so
// sync just reports "offline" until connectivity returns.
const swSource = (version, shell) => `// Auto-generated at build time. Do not edit.
const CACHE = 'simon2-${version}';
const BASE = '${BASE}';
const SHELL = ${JSON.stringify(shell)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('simon2-') && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // GitHub API + fonts: straight to network

  // Navigations: network-first so a new deploy's index.html wins; cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
        return res;
      } catch (e) {
        return (await caches.match(req)) || (await caches.match(BASE));
      }
    })());
    return;
  }

  // Same-origin assets (content-hashed): cache-first, then network.
  event.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') {
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
      return res;
    } catch (e) {
      return Response.error();
    }
  })());
});
`

function serviceWorkerPlugin() {
  return {
    name: 'simon2-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const hashed = Object.keys(bundle)
        .filter((f) => /\.(js|css)$/.test(f))
        .map((f) => BASE + f)
      // public/ files aren't in the rollup bundle but are copied to dist — list them explicitly.
      const shell = [
        BASE,
        BASE + 'index.html',
        BASE + 'manifest.json',
        BASE + 'favicon.svg',
        BASE + 'icons/icon-192.png',
        BASE + 'icons/icon-512.png',
        BASE + 'icons/maskable-512.png',
        BASE + 'icons/apple-touch-icon-180.png',
        ...hashed,
      ]
      const version = createHash('sha256').update(shell.join('|')).digest('hex').slice(0, 8)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: swSource(version, shell) })
    },
  }
}

// base must match the GitHub Pages subpath: simonpanigrahi.github.io/simon-2-0/
export default defineConfig({
  base: BASE,
  plugins: [react(), serviceWorkerPlugin()],
})
