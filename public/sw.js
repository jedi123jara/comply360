/**
 * COMPLY360 — Service Worker mínimo
 *
 * Estrategia:
 *  - Network-first para HTML (siempre fresco)
 *  - Cache-first para assets estáticos (_next/static, fonts, imágenes)
 *  - Offline fallback al landing del dashboard
 */

const CACHE_NAME = 'comply360-v1'
const OFFLINE_URLS = ['/', '/dashboard', '/manifest.webmanifest']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS).catch(() => null))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Solo same-origin
  if (url.origin !== self.location.origin) return

  // Nunca interceptar APIs ni autenticación
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/sign-in') ||
    url.pathname.startsWith('/sign-up')
  ) {
    return
  }

  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:css|js|png|jpg|jpeg|svg|webp|woff2?|ttf|ico)$/.test(url.pathname)

  if (isStatic) {
    // Cache-first
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached
        return fetch(req)
          .then(res => {
            const copy = res.clone()
            caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => null)
            return res
          })
          .catch(() => caches.match('/'))
      })
    )
    return
  }

  // Network-first para HTML
  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone()
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => null)
        return res
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('/')))
  )
})
