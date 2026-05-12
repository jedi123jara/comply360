import { describe, it, expect } from 'vitest'
import {
  ALL_QUESTIONS,
  EXPRESS_QUESTIONS,
  FULL_QUESTIONS,
  AREAS,
  getFilteredQuestions,
  getAreaWeight,
} from '../questions'
import type { AreaKey } from '../questions/types'

// ---------------------------------------------------------------------------
// Question collection counts
// ---------------------------------------------------------------------------

describe('ALL_QUESTIONS', () => {
  it('should have exactly 135 questions', () => {
    // 120 original + 8 (Área 9: Tercerización e Intermediación) + 7 (Área 10: Hostigamiento Sexual detallado)
    expect(ALL_QUESTIONS).toHaveLength(135)
  })

  it('should be the same reference as FULL_QUESTIONS', () => {
    expect(FULL_QUESTIONS).toBe(ALL_QUESTIONS)
  })

  it('every question should have a unique id', () => {
    const ids = ALL_QUESTIONS.map(q => q.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('every question should have required fields', () => {
    for (const q of ALL_QUESTIONS) {
      expect(q.id).toBeTruthy()
      expect(q.area).toBeTruthy()
      expect(q.text).toBeTruthy()
      expect(q.baseLegal).toBeTruthy()
      expect(['LEVE', 'GRAVE', 'MUY_GRAVE']).toContain(q.infraccionGravedad)
      expect(q.multaUIT).toBeGreaterThan(0)
      expect(q.peso).toBeGreaterThanOrEqual(1)
      expect(q.peso).toBeLessThanOrEqual(5)
      expect(typeof q.express).toBe('boolean')
    }
  })
})

describe('EXPRESS_QUESTIONS', () => {
  it('should have exactly 38 express questions', () => {
    // 32 original + 3 (TI-01, TI-04, TI-07) + 3 (HS-01, HS-02, HS-04)
    expect(EXPRESS_QUESTIONS).toHaveLength(38)
  })

  it('every express question should have express: true', () => {
    for (const q of EXPRESS_QUESTIONS) {
      expect(q.express).toBe(true)
    }
  })

  it('should be a subset of ALL_QUESTIONS', () => {
    const allIds = new Set(ALL_QUESTIONS.map(q => q.id))
    for (const q of EXPRESS_QUESTIONS) {
      expect(allIds.has(q.id)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Per-area question counts
// ---------------------------------------------------------------------------

describe('questions per area', () => {
  const expectedCounts: Record<AreaKey, number> = {
    contratos_registro: 15,
    remuneraciones_beneficios: 20,
    jornada_descansos: 15,
    sst: 25,
    documentos_obligatorios: 15,
    relaciones_laborales: 10,
    igualdad_nodiscriminacion: 10,
    trabajadores_especiales: 10,
    tercerizacion_intermediacion: 8,
    hostigamiento_sexual_detallado: 7,
  }

  for (const [area, count] of Object.entries(expectedCounts)) {
    it(`${area} should have ${count} questions`, () => {
      const areaQuestions = ALL_QUESTIONS.filter(q => q.area === area)
      expect(areaQuestions).toHaveLength(count)
    })
  }

  it('sum of per-area counts should equal total', () => {
    const sum = Object.values(expectedCounts).reduce((a, b) => a + b, 0)
    expect(sum).toBe(135)
  })

  it('every question area should correspond to a defined AREAS entry', () => {
    const validKeys = new Set(AREAS.map(a => a.key))
    for (const q of ALL_QUESTIONS) {
      expect(validKeys.has(q.area)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// AREAS definitions
// ---------------------------------------------------------------------------

describe('AREAS definitions', () => {
  it('should have 10 area definitions', () => {
    // 8 original + Área 9 (tercerizacion_intermediacion) + Área 10 (hostigamiento_sexual_detallado)
    expect(AREAS).toHaveLength(10)
  })

  it('area weights should sum to 100', () => {
    const total = AREAS.reduce((sum, a) => sum + a.weight, 0)
    expect(total).toBe(100)
  })

  it('getAreaWeight should return the correct weight for each area', () => {
    for (const area of AREAS) {
      expect(getAreaWeight(area.key)).toBe(area.weight)
    }
  })

  it('getAreaWeight should return 10 for an unknown area key', () => {
    expect(getAreaWeight('nonexistent' as AreaKey)).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// getFilteredQuestions
// ---------------------------------------------------------------------------

describe('getFilteredQuestions', () => {
  it('should return all questions when no context is provided', () => {
    const result = getFilteredQuestions(ALL_QUESTIONS, {})
    expect(result).toHaveLength(ALL_QUESTIONS.length)
  })

  it('should return all questions when context fields are undefined', () => {
    const result = getFilteredQuestions(ALL_QUESTIONS, {
      sizeRange: undefined,
      regimenPrincipal: undefined,
      totalWorkers: undefined,
    })
    expect(result).toHaveLength(ALL_QUESTIONS.length)
  })

  // --- Filtering by regimenPrincipal ---

  it('should exclude MYPE-only questions when regimen is GENERAL', () => {
    const result = getFilteredQuestions(ALL_QUESTIONS, { regimenPrincipal: 'GENERAL' })
    // CR-15 has condition: regimenPrincipal eq MYPE_MICRO
    const cr15 = result.find(q => q.id === 'CR-15')
    expect(cr15).toBeUndefined()
  })

  it('should include MYPE-only questions when regimen is MYPE_MICRO', () => {
    const result = getFilteredQuestions(ALL_QUESTIONS, { regimenPrincipal: 'MYPE_MICRO' })
    const cr15 = result.find(q => q.id === 'CR-15')
    expect(cr15).toBeDefined()
  })

  it('should exclude CONSTRUCCION_CIVIL questions for non-construction regimen', () => {
    const result = getFilteredQuestions(ALL_QUESTIONS, { regimenPrincipal: 'GENERAL' })
    // RB-20 condition: regimenPrincipal eq CONSTRUCCION_CIVIL
    const rb20 = result.find(q => q.id === 'RB-20')
    expect(rb20).toBeUndefined()
    // TE-09 same condition
    const te09 = result.find(q => q.id === 'TE-09')
    expect(te09).toBeUndefined()
  })

  it('should include CONSTRUCCION_CIVIL questions for construction regimen', () => {
    const result = getFilteredQuestions(ALL_QUESTIONS, { regimenPrincipal: 'CONSTRUCCION_CIVIL' })
    const rb20 = result.find(q => q.id === 'RB-20')
    expect(rb20).toBeDefined()
    const te09 = result.find(q => q.id === 'TE-09')
    expect(te09).toBeDefined()
  })

  // --- Filtering by totalWorkers (gte operator) ---

  it('should exclude 20+ worker questions when totalWorkers < 20', () => {
    const result = getFilteredQuestions(ALL_QUESTIONS, { totalWorkers: 10 })
    // SST-02 condition: totalWorkers gte 20
    const sst02 = result.find(q => q.id === 'SST-02')
    expect(sst02).toBeUndefined()
    // TE-02 condition: totalWorkers gte 20
    const te02 = result.find(q => q.id === 'TE-02')
    expect(te02).toBeUndefined()
  })

  it('should include 20+ worker questions when totalWorkers >= 20', () => {
    const result = getFilteredQuestions(ALL_QUESTIONS, { totalWorkers: 25 })
    const sst02 = result.find(q => q.id === 'SST-02')
    expect(sst02).toBeDefined()
    const te02 = result.find(q => q.id === 'TE-02')
    expect(te02).toBeDefined()
  })

  it('should exclude 50+ worker questions when totalWorkers < 50', () => {
    const result = getFilteredQuestions(ALL_QUESTIONS, { totalWorkers: 30 })
    // IN-05 condition: totalWorkers gte 50
    const in05 = result.find(q => q.id === 'IN-05')
    expect(in05).toBeUndefined()
  })

  it('should include 50+ worker questions when totalWorkers >= 50', () => {
    const result = getFilteredQuestions(ALL_QUESTIONS, { totalWorkers: 60 })
    const in05 = result.find(q => q.id === 'IN-05')
    expect(in05).toBeDefined()
  })

  it('should exclude 100+ worker questions when totalWorkers < 100', () => {
    const result = getFilteredQuestions(ALL_QUESTIONS, { totalWorkers: 50 })
    // DO-04 condition: totalWorkers gte 100
    const do04 = result.find(q => q.id === 'DO-04')
    expect(do04).toBeUndefined()
  })

  it('should include 100+ worker questions when totalWorkers >= 100', () => {
    const result = getFilteredQuestions(ALL_QUESTIONS, { totalWorkers: 150 })
    const do04 = result.find(q => q.id === 'DO-04')
    expect(do04).toBeDefined()
  })

  // --- Filtering by combined context ---

  it('should apply multiple filters simultaneously', () => {
    const result = getFilteredQuestions(ALL_QUESTIONS, {
      regimenPrincipal: 'GENERAL',
      totalWorkers: 10,
    })
    // Should exclude MYPE-only (CR-15, RB-16), construction-only (RB-20, TE-09),
    // teletrabajo-only (JD-15), domestico-only (TE-06), modalidad formativa-only (TE-10),
    // and 20+ worker questions (SST-02, RB-13, TE-02, DO-04, IN-05)
    const cr15 = result.find(q => q.id === 'CR-15')
    const sst02 = result.find(q => q.id === 'SST-02')
    expect(cr15).toBeUndefined()
    expect(sst02).toBeUndefined()
  })

  // --- Questions without conditions are always included ---

  it('should always include questions without conditions', () => {
    const noConditionQs = ALL_QUESTIONS.filter(q => !q.condition)
    // With any arbitrary context, all unconditioned questions remain
    const result = getFilteredQuestions(ALL_QUESTIONS, {
      regimenPrincipal: 'GENERAL',
      totalWorkers: 5,
    })
    for (const q of noConditionQs) {
      expect(result.find(r => r.id === q.id)).toBeDefined()
    }
  })
})
