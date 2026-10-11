/**
 * Slugs válidos de las secciones públicas con rutas dinámicas. Lo usa el proxy
 * para responder 404 real a un slug inexistente.
 *
 * Por qué en el proxy: el `loading.tsx` de (marketing) empieza a transmitir la
 * página con status 200 antes de que la página llegue a su `notFound()`, y Next
 * ya no puede cambiar el status (solo agrega `noindex`). Google lo marca como
 * "soft 404". Ver node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/loading.md, sección "Status Codes".
 */
import { ARTICLES } from '@/lib/blog/articles'
import { CAPACITACIONES } from './capacitaciones'
import { AREAS_SERVICIO } from './servicios'

const SLUGS_POR_SECCION: Record<string, ReadonlySet<string>> = {
  servicios: new Set(AREAS_SERVICIO.map((a) => a.slug)),
  capacitaciones: new Set(CAPACITACIONES.map((c) => c.slug)),
  recursos: new Set(ARTICLES.map((a) => a.slug)),
}

const RUTA_CON_SLUG = /^\/(servicios|capacitaciones|recursos)\/([^/]+)\/?$/

/** `true` si la ruta es /servicios, /capacitaciones o /recursos + un slug que no existe. */
export function esSlugInexistente(pathname: string): boolean {
  const match = RUTA_CON_SLUG.exec(pathname)
  if (!match) return false
  let slug: string
  try {
    slug = decodeURIComponent(match[2])
  } catch {
    return true // codificación inválida (p. ej. "%E0%A4%A"): no puede ser un slug nuestro
  }
  return !SLUGS_POR_SECCION[match[1]].has(slug)
}
