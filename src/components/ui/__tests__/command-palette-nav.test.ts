import { describe, it, expect } from 'vitest'
import {
  ICON_MAP,
  buildPaletteNavItems,
  filterPaletteNav,
} from '@/components/ui/command-palette'
import { NAV_HUBS, NAV_URL_ONLY_ROUTES } from '@/lib/constants'

const items = buildPaletteNavItems()
const hrefs = (list: ReadonlyArray<{ href: string }>) => list.map((i) => i.href)

describe('buscador (Cmd+K) — páginas del menú', () => {
  it('sin texto solo sugiere páginas visibles del menú', () => {
    const sugeridas = filterPaletteNav(items, '')
    expect(sugeridas.length).toBeGreaterThan(0)
    expect(sugeridas.length).toBeLessThanOrEqual(8)
    expect(sugeridas.every((i) => !i.hidden)).toBe(true)
    // Espacios en blanco cuentan como "sin texto".
    expect(hrefs(filterPaletteNav(items, '   '))).toEqual(hrefs(sugeridas))
  })

  it('al escribir encuentra también las páginas ocultas del menú', () => {
    expect(hrefs(filterPaletteNav(items, 'memoria anual'))).toContain('/dashboard/sst/memoria-anual')
    expect(hrefs(filterPaletteNav(items, 'elecciones'))).toContain('/dashboard/sst/comite/elecciones')
  })

  it('busca por la ayuda de cada página, sin importar tildes', () => {
    // "retenerles impuesto" solo aparece en la ayuda de Recibos por honorarios.
    expect(hrefs(filterPaletteNav(items, 'retenerles impuesto'))).toContain('/dashboard/honorarios')
    // "casco guantes" solo aparece en la ayuda de EPP.
    expect(hrefs(filterPaletteNav(items, 'casco guantes'))).toContain('/dashboard/sst/epp')
    // PETAR solo está en la ayuda de los procedimientos de trabajo seguro.
    expect(hrefs(filterPaletteNav(items, 'petar'))).toContain('/dashboard/sst/pets-petar-ats')
    expect(hrefs(filterPaletteNav(items, 'tercerizacion'))).toContain('/dashboard/terceros')
  })

  it('pone primero las páginas que coinciden por nombre', () => {
    const resultados = filterPaletteNav(items, 'iperc')
    expect(resultados[0]?.href).toBe('/dashboard/sst/iperc')
  })

  it('nunca muestra rutas que solo existen por URL', () => {
    const urlOnly = new Set(NAV_URL_ONLY_ROUTES.map((r) => r.href))
    expect(items.some((i) => urlOnly.has(i.href))).toBe(false)
    for (const route of NAV_URL_ONLY_ROUTES) {
      expect(hrefs(filterPaletteNav(items, route.label))).not.toContain(route.href)
    }
  })

  it('cada ícono del menú tiene su dibujo (no cae al genérico)', () => {
    const faltantes = new Set<string>()
    for (const hub of NAV_HUBS) {
      if (!ICON_MAP[hub.icon]) faltantes.add(hub.icon)
      for (const item of hub.items) {
        if (!ICON_MAP[item.icon]) faltantes.add(item.icon)
      }
    }
    expect([...faltantes]).toEqual([])
  })
})
