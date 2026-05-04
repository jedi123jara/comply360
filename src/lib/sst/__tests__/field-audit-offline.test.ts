/**
 * Tests del lib field-audit-offline.
 *
 * Cubrimos las funciones puras (genId, summaryStats) sin tocar IndexedDB —
 * para tests del CRUD IDB completo se necesitaría jsdom + fake-indexeddb,
 * lo cual es trabajo de Sprint 2 cuando montemos el flow E2E con Playwright.
 *
 * Lo que sí validamos aquí: que la API pública del módulo no haga drift y
 * que los helpers utilitarios funcionen sin browser.
 */

import { describe, it, expect } from 'vitest'
import {
  genId,
  summaryStats,
  type VisitaDraft,
  type HallazgoOffline,
} from '../field-audit-offline'

function makeDraft(overrides: Partial<VisitaDraft> = {}): VisitaDraft {
  return {
    visitaId: 'visita-1',
    notasInspector: '',
    fotoFachadaPhotoId: null,
    hallazgos: [],
    lastModified: new Date('2026-05-01T10:00:00Z').toISOString(),
    ...overrides,
  }
}

function makeHallazgo(overrides: Partial<HallazgoOffline> = {}): HallazgoOffline {
  return {
    id: 'h-' + Math.random().toString(36).slice(2, 8),
    tipo: 'EPP_AUSENTE',
    severidad: 'IMPORTANTE',
    descripcion: 'Trabajador sin casco',
    photoId: null,
    accionPropuesta: 'Entregar EPP completo',
    responsable: null,
    plazoCierre: null,
    lat: null,
    lng: null,
    capturedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('genId', () => {
  it('genera IDs únicos', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) ids.add(genId())
    expect(ids.size).toBe(100)
  })

  it('genera string válido', () => {
    const id = genId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(8)
  })

  it('genera UUIDs en formato v4 si crypto.randomUUID está disponible', () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      const id = genId()
      // Pattern v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i)
    }
  })
})

describe('summaryStats', () => {
  it('cuenta 0 hallazgos en draft vacío', () => {
    const stats = summaryStats(makeDraft())
    expect(stats.hallazgosCount).toBe(0)
    expect(stats.hallazgosConFoto).toBe(0)
    expect(stats.fotosTotal).toBe(0)
  })

  it('cuenta hallazgos correctamente', () => {
    const draft = makeDraft({
      hallazgos: [makeHallazgo(), makeHallazgo(), makeHallazgo()],
    })
    expect(summaryStats(draft).hallazgosCount).toBe(3)
  })

  it('cuenta hallazgos con foto separadamente', () => {
    const draft = makeDraft({
      hallazgos: [
        makeHallazgo({ photoId: 'p1' }),
        makeHallazgo({ photoId: null }),
        makeHallazgo({ photoId: 'p2' }),
      ],
    })
    const stats = summaryStats(draft)
    expect(stats.hallazgosCount).toBe(3)
    expect(stats.hallazgosConFoto).toBe(2)
    expect(stats.fotosTotal).toBe(2)
  })

  it('incluye foto fachada en fotosTotal', () => {
    const draft = makeDraft({
      fotoFachadaPhotoId: 'fachada-1',
      hallazgos: [makeHallazgo({ photoId: 'p1' })],
    })
    expect(summaryStats(draft).fotosTotal).toBe(2) // fachada + 1 hallazgo
  })

  it('expone lastModified ISO', () => {
    const draft = makeDraft({ lastModified: '2026-05-04T15:30:00Z' })
    expect(summaryStats(draft).ultimaModificacion).toBe('2026-05-04T15:30:00Z')
  })
})

describe('VisitaDraft type integrity', () => {
  it('un draft típico tiene los campos requeridos', () => {
    const draft = makeDraft({
      notasInspector: 'Visita normal sin incidencias',
      hallazgos: [
        makeHallazgo({
          tipo: 'EXTINTOR_VENCIDO',
          severidad: 'MODERADO',
          descripcion: 'Extintor PQS vencido en sala de ventas',
          lat: -12.0464,
          lng: -77.0428,
        }),
      ],
    })
    expect(draft.visitaId).toBe('visita-1')
    expect(draft.hallazgos[0].tipo).toBe('EXTINTOR_VENCIDO')
    expect(draft.hallazgos[0].lat).toBeCloseTo(-12.0464)
  })
})
