#!/usr/bin/env node
/**
 * indexnow — avisa a Bing, Yandex, Seznam, Naver y Yep que hay URLs nuevas o
 * actualizadas en comply360.pe (protocolo IndexNow). Google no usa IndexNow:
 * para Google está el sitemap en Search Console.
 *
 * Uso (después de cada deploy a producción con cambios en el sitio público):
 *   pnpm indexnow                      → envía todas las URLs del sitemap
 *   pnpm indexnow /servicios/rrhh ...  → envía solo esas rutas
 *
 * La clave vive en public/<clave>.txt y su ruta es pública en src/proxy.ts.
 * Si cambias la clave, cambia los tres lugares.
 */

const SITE_URL = 'https://comply360.pe'
const KEY = '1c1d094153c5781b8b47e6a7884805ab'
const ENDPOINT = 'https://api.indexnow.org/indexnow'

async function urlsDelSitemap() {
  const res = await fetch(`${SITE_URL}/sitemap.xml`)
  if (!res.ok) throw new Error(`No se pudo leer el sitemap: HTTP ${res.status}`)
  const xml = await res.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
}

async function main() {
  const rutas = process.argv.slice(2)
  const urls = rutas.length
    ? rutas.map((r) => (r.startsWith('http') ? r : `${SITE_URL}${r.startsWith('/') ? r : `/${r}`}`))
    : await urlsDelSitemap()

  if (!urls.length) throw new Error('No hay URLs para enviar')

  // El buscador descarga la clave para comprobar que el aviso viene del dueño.
  const clave = await fetch(`${SITE_URL}/${KEY}.txt`)
  const contenido = clave.ok ? (await clave.text()).trim() : ''
  if (contenido !== KEY) {
    throw new Error(`La clave no está publicada en ${SITE_URL}/${KEY}.txt (HTTP ${clave.status})`)
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: KEY,
      keyLocation: `${SITE_URL}/${KEY}.txt`,
      urlList: urls,
    }),
  })

  // 200 = recibido; 202 = recibido, la clave se validará después.
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`IndexNow respondió HTTP ${res.status}: ${await res.text()}`)
  }
  console.log(`[indexnow] ${urls.length} URLs enviadas (HTTP ${res.status})`)
}

main().catch((err) => {
  console.error(`[indexnow] ${err.message}`)
  process.exit(1)
})
