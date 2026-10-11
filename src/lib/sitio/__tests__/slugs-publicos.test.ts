import { describe, expect, it } from 'vitest'
import { ARTICLES } from '@/lib/blog/articles'
import { CAPACITACIONES } from '../capacitaciones'
import { AREAS_SERVICIO } from '../servicios'
import { esSlugInexistente } from '../slugs-publicos'

describe('esSlugInexistente', () => {
  it('deja pasar todos los slugs que existen (los mismos que van al sitemap)', () => {
    const rutas = [
      ...AREAS_SERVICIO.map((a) => `/servicios/${a.slug}`),
      ...CAPACITACIONES.map((c) => `/capacitaciones/${c.slug}`),
      ...ARTICLES.map((a) => `/recursos/${a.slug}`),
    ]
    expect(rutas.length).toBeGreaterThan(10)
    for (const ruta of rutas) expect(esSlugInexistente(ruta), ruta).toBe(false)
  })

  it('marca los slugs que no existen en las tres secciones', () => {
    expect(esSlugInexistente('/servicios/x')).toBe(true)
    expect(esSlugInexistente('/capacitaciones/curso-que-no-existe')).toBe(true)
    expect(esSlugInexistente('/recursos/articulo-borrado')).toBe(true)
    expect(esSlugInexistente('/servicios/x/')).toBe(true)
  })

  it('no toca los índices, otras secciones ni rutas más profundas', () => {
    expect(esSlugInexistente('/servicios')).toBe(false)
    expect(esSlugInexistente('/servicios/')).toBe(false)
    expect(esSlugInexistente('/recursos')).toBe(false)
    expect(esSlugInexistente('/calculadoras/cts')).toBe(false)
    expect(esSlugInexistente('/planes')).toBe(false)
    // Las rutas con más segmentos (p. ej. una imagen OG) las resuelve Next por su cuenta.
    expect(esSlugInexistente('/servicios/sst/opengraph-image')).toBe(false)
  })

  it('trata una codificación inválida como inexistente sin lanzar error', () => {
    expect(esSlugInexistente('/recursos/%E0%A4%A')).toBe(true)
  })
})
