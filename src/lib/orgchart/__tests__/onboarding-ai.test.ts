import { describe, it, expect } from 'vitest'
import { validateProposal } from '../onboarding-ai/validate-proposal'
import { pickFallbackTemplate } from '../onboarding-ai/fallback-templates'
import {
  onboardingProposalSchema,
  type OnboardingProposal,
} from '../onboarding-ai/schema'

function baseProposal(overrides: Partial<OnboardingProposal> = {}): OnboardingProposal {
  return {
    rationale: 'estructura básica',
    units: [
      { key: 'gg', name: 'Gerencia', kind: 'GERENCIA', parentKey: null },
      { key: 'op', name: 'Operaciones', kind: 'AREA', parentKey: 'gg' },
    ],
    positions: [
      {
        key: 'p1',
        title: 'Gerente',
        unitKey: 'gg',
        reportsToKey: null,
        isManagerial: true,
        isCritical: true,
        seats: 1,
      },
      {
        key: 'p2',
        title: 'Jefe Op',
        unitKey: 'op',
        reportsToKey: 'p1',
        isManagerial: true,
        isCritical: false,
        seats: 1,
      },
    ],
    suggestedComplianceRoles: [],
    ...overrides,
  }
}

describe('validateProposal', () => {
  it('una propuesta válida pasa sin errores', () => {
    const result = validateProposal(baseProposal())
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('detecta keys de unidad duplicadas', () => {
    const proposal = baseProposal({
      units: [
        { key: 'gg', name: 'A', kind: 'GERENCIA', parentKey: null },
        { key: 'gg', name: 'B', kind: 'AREA', parentKey: null },
      ],
    })
    const result = validateProposal(proposal)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('duplicadas'))).toBe(true)
  })

  it('detecta parentKey inexistente', () => {
    const proposal = baseProposal({
      units: [
        { key: 'gg', name: 'A', kind: 'GERENCIA', parentKey: null },
        { key: 'op', name: 'B', kind: 'AREA', parentKey: 'fantasma' },
      ],
    })
    const result = validateProposal(proposal)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('parentKey'))).toBe(true)
  })

  it('detecta ciclo en árbol de unidades', () => {
    const proposal = baseProposal({
      units: [
        { key: 'a', name: 'A', kind: 'AREA', parentKey: 'b' },
        { key: 'b', name: 'B', kind: 'AREA', parentKey: 'a' },
      ],
    })
    const result = validateProposal(proposal)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('ciclos'))).toBe(true)
  })

  it('detecta sin raíz (todas las unidades tienen parent)', () => {
    const proposal = baseProposal({
      units: [
        { key: 'a', name: 'A', kind: 'AREA', parentKey: 'b' },
        { key: 'b', name: 'B', kind: 'AREA', parentKey: 'a' },
      ],
    })
    const result = validateProposal(proposal)
    expect(result.valid).toBe(false)
  })

  it('detecta unitKey inexistente en cargo', () => {
    const proposal = baseProposal({
      positions: [
        {
          key: 'p1',
          title: 'X',
          unitKey: 'fantasma',
          reportsToKey: null,
          isManagerial: false,
          isCritical: false,
          seats: 1,
        },
      ],
    })
    const result = validateProposal(proposal)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('unitKey'))).toBe(true)
  })

  it('warning si hay unidades sin cargos', () => {
    const proposal = baseProposal({
      units: [
        { key: 'gg', name: 'GG', kind: 'GERENCIA', parentKey: null },
        { key: 'vacia', name: 'Sin cargos', kind: 'AREA', parentKey: 'gg' },
      ],
      positions: [
        {
          key: 'p_gg',
          title: 'Gerente',
          unitKey: 'gg',
          reportsToKey: null,
          isManagerial: true,
          isCritical: true,
          seats: 1,
        },
      ],
    })
    const result = validateProposal(proposal)
    expect(result.valid).toBe(true)
    expect(result.warnings.some((w) => w.includes('sin cargos'))).toBe(true)
  })
})

describe('pickFallbackTemplate', () => {
  it('retail PYME → template retail', () => {
    const proposal = pickFallbackTemplate({
      industry: 'Retail de moda',
      sizeRange: 'PEQUEÑA',
      workerCount: 30,
    })
    expect(proposal.units.some((u) => u.name.toLowerCase().includes('comercial'))).toBe(true)
  })

  it('servicios PYME → template servicios', () => {
    const proposal = pickFallbackTemplate({
      industry: 'Consultoría legal',
      sizeRange: 'PEQUEÑA',
      workerCount: 15,
    })
    expect(proposal.units.some((u) => u.name.toLowerCase().includes('servicios'))).toBe(true)
  })

  it('microempresa sin industry específica → template micro', () => {
    const proposal = pickFallbackTemplate({
      industry: 'rara',
      sizeRange: 'MICRO',
      workerCount: 5,
    })
    expect(proposal.units.length).toBeLessThanOrEqual(5)
    expect(
      proposal.suggestedComplianceRoles.some((r) => r.roleType === 'SUPERVISOR_SST'),
    ).toBe(true)
  })

  it('todos los fallbacks son propuestas Zod-válidas', () => {
    const inputs: Array<Parameters<typeof pickFallbackTemplate>[0]> = [
      { industry: 'retail', sizeRange: 'PEQUEÑA', workerCount: 25 },
      { industry: 'servicios', sizeRange: 'MICRO', workerCount: 8 },
      { industry: 'fantasma', sizeRange: 'MICRO', workerCount: 3 },
    ]
    for (const input of inputs) {
      const proposal = pickFallbackTemplate(input)
      const parsed = onboardingProposalSchema.safeParse(proposal)
      expect(parsed.success).toBe(true)
      const validation = validateProposal(proposal)
      expect(validation.valid).toBe(true)
    }
  })
})
