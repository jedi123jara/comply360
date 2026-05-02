import { describe, it, expect } from 'vitest'
import { detectRegime } from '../detect'
import type { RegimeInputs } from '../types'

const UIT_2026 = 5500

function makeInputs(overrides: Partial<RegimeInputs> = {}): RegimeInputs {
  return {
    ciiu: null,
    ubigeo: null,
    annualSalesPEN: null,
    groupAnnualSalesPEN: null,
    isPartOfBigGroup: false,
    remypeRegistered: false,
    exportRatioPct: null,
    currentProjectCostUIT: null,
    employerType: 'LEGAL_PERSON',
    domesticPurpose: false,
    usesAgroInputs: false,
    isPublicEntity: false,
    uitValue: UIT_2026,
    ...overrides,
  }
}

describe('detectRegime — Trabajo del Hogar (Ley 31047)', () => {
  it('persona natural con propósito doméstico → DOMESTICO con confianza alta', () => {
    const r = detectRegime(makeInputs({ employerType: 'NATURAL_PERSON', domesticPurpose: true }))
    expect(r.primaryRegime).toBe('DOMESTICO')
    expect(r.confidence).toBeGreaterThanOrEqual(0.95)
    expect(r.reasoning[0]).toContain('Trabajo del Hogar')
  })

  it('persona natural sin propósito doméstico → no califica DOMESTICO', () => {
    const r = detectRegime(makeInputs({ employerType: 'NATURAL_PERSON', domesticPurpose: false }))
    expect(r.primaryRegime).not.toBe('DOMESTICO')
  })
})

describe('detectRegime — Construcción Civil', () => {
  it('CIIU 4100 + obra > 50 UIT → suma CONSTRUCCION_CIVIL como special, primary GENERAL', () => {
    const r = detectRegime(makeInputs({
      ciiu: '4100',
      currentProjectCostUIT: 80,
    }))
    expect(r.applicableSpecialRegimes).toContain('CONSTRUCCION_CIVIL')
    expect(r.primaryRegime).toBe('GENERAL')
    expect(r.flags.hasSpecialModalAvailable).toBe(true)
  })

  it('CIIU 4100 con obra ≤ 50 UIT → warning, sin construcción civil', () => {
    const r = detectRegime(makeInputs({
      ciiu: '4100',
      currentProjectCostUIT: 30,
    }))
    expect(r.applicableSpecialRegimes).not.toContain('CONSTRUCCION_CIVIL')
    expect(r.warnings.some((w) => w.includes('≤ 50 UIT'))).toBe(true)
  })

  it('CIIU 4100 sin costo declarado → warning pidiendo declarar', () => {
    const r = detectRegime(makeInputs({ ciiu: '4100', currentProjectCostUIT: null }))
    expect(r.warnings.some((w) => w.includes('costo de obra'))).toBe(true)
  })
})

describe('detectRegime — Agrario (Ley 31110)', () => {
  it('CIIU agrícola 0111 fuera de Lima → primary AGRARIO', () => {
    const r = detectRegime(makeInputs({
      ciiu: '0111',
      ubigeo: '110101', // Huánuco
    }))
    expect(r.primaryRegime).toBe('AGRARIO')
    expect(r.flags.hasSpecialModalAvailable).toBe(true)
  })

  it('Agroindustria con insumos agro fuera de Lima/Callao → AGRARIO', () => {
    const r = detectRegime(makeInputs({
      ciiu: '1030', // Elaboración y conservación de frutas y hortalizas
      ubigeo: '130101', // La Libertad
      usesAgroInputs: true,
    }))
    expect(r.primaryRegime).toBe('AGRARIO')
  })

  it('Agroindustria en Lima/Callao → warning + no AGRARIO', () => {
    const r = detectRegime(makeInputs({
      ciiu: '1030',
      ubigeo: '150111', // Lima provincia
      usesAgroInputs: true,
    }))
    expect(r.primaryRegime).not.toBe('AGRARIO')
    expect(r.warnings.some((w) => w.includes('Lima Metropolitana'))).toBe(true)
  })

  it('CIIU agroindustria excluida (1101 bebida alcohólica) → no aplica agrario', () => {
    const r = detectRegime(makeInputs({
      ciiu: '1101',
      ubigeo: '130101',
      usesAgroInputs: true,
    }))
    expect(r.primaryRegime).not.toBe('AGRARIO')
    expect(r.warnings.some((w) => w.includes('exclusiones'))).toBe(true)
  })

  it('CIIU 1103 (cerveza) → excluido del régimen agrario', () => {
    const r = detectRegime(makeInputs({
      ciiu: '1103',
      ubigeo: '130101',
      usesAgroInputs: true,
    }))
    expect(r.primaryRegime).not.toBe('AGRARIO')
    expect(r.warnings.some((w) => w.includes('exclusiones'))).toBe(true)
  })
})

describe('detectRegime — MYPE (Ley 32353)', () => {
  it('Ventas 100 UIT + REMYPE → MYPE_MICRO', () => {
    const r = detectRegime(makeInputs({
      ciiu: '4711', // comercio al por menor
      annualSalesPEN: 100 * UIT_2026,
      remypeRegistered: true,
    }))
    expect(r.primaryRegime).toBe('MYPE_MICRO')
    expect(r.flags.isMype).toBe(true)
  })

  it('Ventas 800 UIT + REMYPE → MYPE_PEQUENA', () => {
    const r = detectRegime(makeInputs({
      ciiu: '4711',
      annualSalesPEN: 800 * UIT_2026,
      remypeRegistered: true,
    }))
    expect(r.primaryRegime).toBe('MYPE_PEQUENA')
  })

  it('Ventas 100 UIT sin REMYPE → primary GENERAL + flag needsRemype', () => {
    const r = detectRegime(makeInputs({
      annualSalesPEN: 100 * UIT_2026,
      remypeRegistered: false,
    }))
    expect(r.primaryRegime).toBe('GENERAL')
    expect(r.flags.needsRemype).toBe(true)
    expect(r.warnings.some((w) => w.includes('REMYPE'))).toBe(true)
  })

  it('Grupo económico > 1700 UIT → no MYPE', () => {
    const r = detectRegime(makeInputs({
      annualSalesPEN: 100 * UIT_2026,
      groupAnnualSalesPEN: 2000 * UIT_2026,
      remypeRegistered: true,
    }))
    expect(r.primaryRegime).toBe('GENERAL')
    expect(r.flags.isMype).toBe(false)
  })

  it('CIIU bar (5630) excluido → no MYPE aunque tenga REMYPE', () => {
    const r = detectRegime(makeInputs({
      ciiu: '5630',
      annualSalesPEN: 100 * UIT_2026,
      remypeRegistered: true,
    }))
    expect(r.primaryRegime).toBe('GENERAL')
    expect(r.warnings.some((w) => w.includes('excluido del régimen MYPE'))).toBe(true)
  })

  it('Ventas null → cae a GENERAL sin warnings de MYPE', () => {
    const r = detectRegime(makeInputs({ annualSalesPEN: null }))
    expect(r.primaryRegime).toBe('GENERAL')
    expect(r.flags.isMype).toBe(false)
  })
})

describe('detectRegime — Exportación No Tradicional (D.L. 22342)', () => {
  it('Exportación 60% en CIIU textil → suma TEXTIL_EXPORTACION', () => {
    const r = detectRegime(makeInputs({
      ciiu: '1392', // confección de prendas
      exportRatioPct: 60,
    }))
    expect(r.applicableSpecialRegimes).toContain('TEXTIL_EXPORTACION')
  })

  it('Exportación 60% en CIIU minero (07xx) → tradicional, NO califica D.L. 22342', () => {
    const r = detectRegime(makeInputs({
      ciiu: '0729', // extracción minerales metalíferos
      exportRatioPct: 60,
    }))
    expect(r.applicableSpecialRegimes).not.toContain('TEXTIL_EXPORTACION')
  })

  it('Exportación 30% (debajo del 40%) → no aplica', () => {
    const r = detectRegime(makeInputs({
      ciiu: '1392',
      exportRatioPct: 30,
    }))
    expect(r.applicableSpecialRegimes).not.toContain('TEXTIL_EXPORTACION')
  })
})

describe('detectRegime — Pesquero (Ley 30003)', () => {
  it('CIIU 0311 → suma PESQUERO + warning REP', () => {
    const r = detectRegime(makeInputs({ ciiu: '0311' }))
    expect(r.applicableSpecialRegimes).toContain('PESQUERO')
    expect(r.warnings.some((w) => w.includes('Régimen Especial de Pensiones Pesqueras'))).toBe(true)
    expect(r.primaryRegime).toBe('GENERAL') // laboral 728
  })
})

describe('detectRegime — Entidad pública (Huatuco)', () => {
  it('isPublicEntity=true → warning Huatuco', () => {
    const r = detectRegime(makeInputs({ isPublicEntity: true }))
    expect(r.flags.isPublic).toBe(true)
    expect(r.warnings.some((w) => w.includes('Huatuco'))).toBe(true)
  })
})

describe('detectRegime — Confianza', () => {
  it('Sin datos → confianza ≤ 0.5', () => {
    const r = detectRegime(makeInputs())
    expect(r.confidence).toBeLessThanOrEqual(0.5)
  })

  it('CIIU + ubigeo + ventas → confianza ≥ 0.9', () => {
    const r = detectRegime(makeInputs({
      ciiu: '4711',
      ubigeo: '150111',
      annualSalesPEN: 100 * UIT_2026,
    }))
    expect(r.confidence).toBeGreaterThanOrEqual(0.9)
  })
})
