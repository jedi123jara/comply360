/**
 * COMPLY360 — Service Worker mínimo
 *
 * Estrategia:
 *  - Network-first para HTML (siempre fresco)
 *  - Cache-first para assets estáticos (_next/static, fonts, imágenes)
 *  - Offline fallback al landing del dashboard
 */

// IMPORTANTE: bumpear la versión cuando se introducen rutas nuevas o cambia
// el handler para invalidar caches viejas en clientes ya instalados.
const CACHE_NAME = 'comply360-v2'
const OFFLINE_URLS = ['/', '/offline', '/manifest.webmanifest']

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

  // Nunca interceptar APIs, autenticación, ni rutas dinámicas auth-gated.
  // Estas SIEMPRE deben ir directo a la red — el cache las rompe porque
  // dependen de cookies de sesión.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/sign-in') ||
    url.pathname.startsWith('/sign-up') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/mi-portal') ||
    url.pathname.startsWith('/firmar')
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

  // Network-first para HTML — siempre devolver un Response válido,
  // nunca undefined (eso causa "Failed to convert value to 'Response'").
  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone()
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => null)
        return res
      })
      .catch(async () => {
        const cached = await caches.match(req)
        if (cached) return cached
        const offline = await caches.match('/offline')
        if (offline) return offline
        const home = await caches.match('/')
        if (home) return home
        // Último recurso: respuesta sintética para no romper la promise
        return new Response(
          '<!doctype html><meta charset="utf-8"><title>Sin conexión</title>' +
            '<body style="font-family:system-ui;padding:2rem;color:#0f172a">' +
            '<h1>Sin conexión</h1><p>Vuelve a intentar cuando recuperes internet.</p></body>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        )
      }),
  )
})

/* ── Push notifications ─────────────────────────────────────────────── */

self.addEventListener('push', event => {
  if (!event.data) return
  let payload = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'COMPLY360', body: event.data.text() }
  }
  const {
    title = 'COMPLY360',
    body = '',
    url = '/dashboard/alertas',
    tag,
    severity,
  } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag || 'comply360-alert',
      renotify: true,
      data: { url },
      requireInteraction: severity === 'CRITICAL',
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(target) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})
