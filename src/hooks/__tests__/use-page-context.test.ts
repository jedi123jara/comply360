import { describe, it, expect } from 'vitest'
import { NAV_HUBS, resolveNavLocation } from '@/lib/constants'
import {
  buildSuggestions,
  detectEntity,
  humanLabelFor,
  GENERAL_SUGGESTIONS,
  HUB_SUGGESTIONS,
  PAGE_SUGGESTIONS,
  STARTER_SUGGESTIONS,
  MAX_SUGGESTIONS,
  MIN_SUGGESTIONS,
  type AssistantSuggestion,
} from '../use-page-context'

const ALL_SUGGESTIONS: AssistantSuggestion[] = [
  ...STARTER_SUGGESTIONS,
  ...GENERAL_SUGGESTIONS,
  ...Object.values(HUB_SUGGESTIONS).flat(),
  ...Object.values(PAGE_SUGGESTIONS).flat(),
]

describe('use-page-context: mapeo con el menú', () => {
  it('cada grupo del menú (NAV_HUBS) tiene preguntas propias', () => {
    for (const hub of NAV_HUBS) {
      expect(HUB_SUGGESTIONS[hub.key], `grupo sin preguntas: ${hub.key}`).toBeDefined()
    }
  })

  it('las llaves esperadas de los grupos siguen existiendo', () => {
    const keys = NAV_HUBS.map((h) => h.key)
    for (const key of ['cockpit', 'equipo', 'planilla', 'contratos-docs', 'riesgo', 'sst', 'config']) {
      expect(keys).toContain(key)
    }
  })

  it('cada página con preguntas propias existe en el menú con ese mismo href', () => {
    for (const href of Object.keys(PAGE_SUGGESTIONS)) {
      const { entry } = resolveNavLocation(href)
      expect(entry?.href, `href huérfano: ${href}`).toBe(href)
    }
  })

  it('cada página visible del menú muestra entre 3 y 4 preguntas', () => {
    for (const hub of NAV_HUBS) {
      for (const item of hub.items) {
        if (item.hidden) continue
        const list = buildSuggestions(item.href, null)
        expect(list.length, item.href).toBeGreaterThanOrEqual(MIN_SUGGESTIONS)
        expect(list.length, item.href).toBeLessThanOrEqual(MAX_SUGGESTIONS)
      }
    }
  })

  it('las páginas ocultas heredan las preguntas de su página padre', () => {
    expect(buildSuggestions('/dashboard/alertas', null)).toEqual(
      buildSuggestions('/dashboard/plan-accion', null),
    )
    expect(buildSuggestions('/dashboard/sst/comite/elecciones', null)).toEqual(
      buildSuggestions('/dashboard/sst/comite', null),
    )
  })

  it('una ruta desconocida cae en las preguntas generales', () => {
    expect(buildSuggestions('/dashboard/ruta-que-no-existe', null)).toEqual(GENERAL_SUGGESTIONS)
  })
})

describe('use-page-context: cuentas nuevas', () => {
  it('prioriza las preguntas de arranque y no pasa de 4', () => {
    const list = buildSuggestions('/dashboard/sst', null, { isNewAccount: true })
    expect(list).toHaveLength(MAX_SUGGESTIONS)
    expect(list[0]).toEqual(STARTER_SUGGESTIONS[0])
    expect(list[1]).toEqual(STARTER_SUGGESTIONS[1])
    // Luego vienen las propias de la pantalla
    expect(list.slice(2)).toEqual(PAGE_SUGGESTIONS['/dashboard/sst'].slice(0, 2))
  })

  it('no repite preguntas', () => {
    const list = buildSuggestions('/dashboard/trabajadores', null, { isNewAccount: true })
    const labels = list.map((s) => s.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('use-page-context: fichas abiertas', () => {
  it('detecta la ficha de un trabajador y usa sus preguntas', () => {
    const entity = detectEntity('/dashboard/trabajadores/abc123', { id: 'abc123' })
    expect(entity).toEqual({ type: 'worker', id: 'abc123' })
    const labels = buildSuggestions('/dashboard/trabajadores/abc123', 'worker').map((s) => s.label)
    expect(labels).toContain('¿Qué documentos debo tener de cada trabajador?')
  })

  it('un detalle de SST usa las preguntas de su página', () => {
    expect(buildSuggestions('/dashboard/sst/accidentes/xyz', 'sst')).toEqual(
      PAGE_SUGGESTIONS['/dashboard/sst/accidentes'],
    )
  })

  it('nombra la pantalla de forma corta', () => {
    expect(humanLabelFor('/dashboard', null, null)).toBe('Inicio')
    expect(humanLabelFor('/dashboard/sst', null, null)).toBe('Seguridad y salud (SST)')
    expect(humanLabelFor('/dashboard/vacaciones', null, null)).toBe('Vacaciones')
    expect(humanLabelFor('/dashboard/trabajadores/abc', 'worker', 'abc')).toBe('Ficha de un trabajador')
  })
})

describe('use-page-context: redacción', () => {
  // Voseo argentino y jerga que no deben aparecer en lo que ve el usuario.
  const VOSEO = /\b(tenés|querés|podés|sabés|hacé|mirá|decime|contame|fijate|dale|che|andá|dejá|ponele|explicame|calculá|revisá)\b/i
  const JERGA = /\b(compliance|score|copilot|copiloto|quick actions?)\b/i

  it('no usa voseo ni jerga en inglés', () => {
    for (const s of ALL_SUGGESTIONS) {
      expect(s.label, s.label).not.toMatch(VOSEO)
      expect(s.prompt, s.prompt).not.toMatch(VOSEO)
      expect(s.label, s.label).not.toMatch(JERGA)
      expect(s.prompt, s.prompt).not.toMatch(JERGA)
    }
  })

  it('los "explícame" llevan tilde', () => {
    for (const s of ALL_SUGGESTIONS) {
      expect(`${s.label} ${s.prompt}`).not.toMatch(/\bExplicame|\bexplicame/)
    }
  })

  it('las preguntas abren y cierran signos de interrogación', () => {
    for (const s of ALL_SUGGESTIONS) {
      const opens = (s.label.match(/¿/g) ?? []).length
      const closes = (s.label.match(/\?/g) ?? []).length
      expect(opens, s.label).toBe(closes)
    }
  })
})
