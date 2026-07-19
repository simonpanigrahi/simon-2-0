import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register the service worker (built output only) under the /simon-2-0/ base.
// BASE_URL is "/simon-2-0/", so the SW lives at /simon-2-0/sw.js and its scope
// covers the whole app.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL
    navigator.serviceWorker.register(base + 'sw.js', { scope: base }).catch(() => {})
  })
}

// Ask the browser to keep our data (campaign state + sync credentials) durable
// so it isn't evicted under storage pressure. Best-effort and feature-detected;
// a no-op where unsupported (e.g. iOS Safari).
if (navigator.storage && navigator.storage.persist) {
  navigator.storage
    .persisted()
    .then((already) => {
      if (!already) return navigator.storage.persist()
    })
    .catch(() => {})
}
