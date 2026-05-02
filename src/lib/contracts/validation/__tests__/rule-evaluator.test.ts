import { describe, it, expect } from 'vitest'
import { evaluateRule } from '../rule-evaluator'
import type { RuleSpec, ValidationContext } from '../types'

// ─── Helper para construir ValidationContext en tests ───────────────────────

function makeCtx(overrides: Partial<ValidationContext['contract']> = {}, options: {
  workers?: ValidationContext['workers']
  history?: ValidationContext['workerModalHistory']
} = {}): ValidationContext {
  return {
    contract: {
      id: 'ctr_1',
      type: 'LABORAL_PLAZO_FIJO',
      title: 'Contrato de prueba',
      status: 'DRAFT',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      causeObjective:
        'Implementación del proyecto Alpha — apertura de nueva línea de producción de envases PET',
      position: 'Operario de planta',
      monthlySalary: 1500,
      weeklyHours: 48,
      formData: {},
      contentHtml: '<p>Cláusulas del contrato</p>',
      ...overrides,
    },
    organization: { id: 'org_1', regimenPrincipal: 'GENERAL', ruc: '20111111111' },
    workers: options.workers ?? [
      {
        id: 'wkr_1',
        dni: '12345678',
        fullName: 'Juan Pérez',
        regimenLaboral: 'GENERAL',
        fechaIngreso: new Date('2026-01-01'),
        sueldoBruto: 1500,
        isPregnant: false,
        nationality: 'peruana',
      },
    ],
    workerModalHistory: options.history ?? [],
    constants: { UIT: 5500, RMV: 1130, MAX_MODAL_TOTAL_DAYS: 1825 },
  }
}

describe('evaluateRule — FIELD_REQUIRED', () => {
  it('pasa cuando el campo está presente con la longitud mínima', () => {
    const spec: RuleSpec = { kind: 'FIELD_REQUIRED', field: 'contract.causeObjective', min: 20 }
    const result = evaluateRule(spec, makeCtx())
    expect(result.passed).toBe(true)
  })

  it('falla cuando el campo está vacío', () => {
    const spec: RuleSpec = { kind: 'FIELD_REQUIRED', field: 'contract.causeObjective' }
    const result = evaluateRule(spec, makeCtx({ causeObjective: null }))
    expect(result.passed).toBe(false)
    expect(result.evidence?.length).toBe(0)
  })

  it('falla cuando el campo no alcanza la longitud mínima', () => {
    const spec: RuleSpec = { kind: 'FIELD_REQUIRED', field: 'contract.causeObjective', min: 200 }
    const result = evaluateRule(spec, makeCtx())
    expect(result.passed).toBe(false)
  })
})

describe('evaluateRule — FIELD_REGEX_DENY', () => {
  const genericPatterns = [
    '^\\s*(?:por\\s+)?(?:el\\s+)?incremento\\s+(?:de\\s+)?actividad(?:es)?\\s*\\.?\\s*$',
    '^\\s*(?:por\\s+)?(?:las?\\s+)?necesidad(?:es)?\\s+(?:de\\s+)?(?:el\\s+)?mercado\\s*\\.?\\s*$',
  ]

  it('falla cuando la causa es exactamente "incremento de actividad"', () => {
    const spec: RuleSpec = {
      kind: 'FIELD_REGEX_DENY',
      field: 'contract.causeObjective',
      patterns: genericPatterns,
      flags: 'i',
    }
    const result = evaluateRule(spec, makeCtx({ causeObjective: 'Incremento de actividad' }))
    expect(result.passed).toBe(false)
    expect(result.evidence?.matchedPattern).toBeDefined()
  })

  it('pasa cuando la causa describe el proyecto específicamente', () => {
    const spec: RuleSpec = {
      kind: 'FIELD_REGEX_DENY',
      field: 'contract.causeObjective',
      patterns: genericPatterns,
      flags: 'i',
    }
    const result = evaluateRule(
      spec,
      makeCtx({
        causeObjective:
          'Implementación de la nueva planta de envases PET en Lurín, financiada por Acta de Directorio 015-2026',
      }),
    )
    expect(result.passed).toBe(true)
  })

  it('pasa cuando el campo está vacío (delegado a FIELD_REQUIRED)', () => {
    const spec: RuleSpec = {
      kind: 'FIELD_REGEX_DENY',
      field: 'contract.causeObjective',
      patterns: genericPatterns,
    }
    const result = evaluateRule(spec, makeCtx({ causeObjective: null }))
    expect(result.passed).toBe(true)
  })
})

describe('evaluateRule — FIELD_COMPARE', () => {
  it('pasa cuando salario >= RMV (path resolve)', () => {
    const spec: RuleSpec = {
      kind: 'FIELD_COMPARE',
      leftPath: 'contract.monthlySalary',
      operator: '>=',
      rightValue: 'constants.RMV',
      rightIsPath: true,
    }
    const result = evaluateRule(spec, makeCtx({ monthlySalary: 1130 }))
    expect(result.passed).toBe(true)
  })

  it('falla cuando salario < RMV', () => {
    const spec: RuleSpec = {
      kind: 'FIELD_COMPARE',
      leftPath: 'contract.monthlySalary',
      operator: '>=',
      rightValue: 'constants.RMV',
      rightIsPath: true,
    }
    const result = evaluateRule(spec, makeCtx({ monthlySalary: 1000 }))
    expect(result.passed).toBe(false)
    expect(result.evidence?.left).toBe(1000)
    expect(result.evidence?.right).toBe(1130)
  })

  it('no bloquea cuando faltan datos para comparar', () => {
    const spec: RuleSpec = {
      kind: 'FIELD_COMPARE',
      leftPath: 'contract.monthlySalary',
      operator: '>=',
      rightValue: 1130,
    }
    const result = evaluateRule(spec, makeCtx({ monthlySalary: null }))
    expect(result.passed).toBe(true)
  })
})

describe('evaluateRule — DURATION_MAX_DAYS', () => {
  it('pasa cuando la duración está dentro del tope', () => {
    const spec: RuleSpec = {
      kind: 'DURATION_MAX_DAYS',
      startPath: 'contract.startDate',
      endPath: 'contract.endDate',
      maxDays: 1095,
    }
    const result = evaluateRule(
      spec,
      makeCtx({
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
      }),
    )
    expect(result.passed).toBe(true)
    expect(result.evidence?.days).toBeGreaterThan(360)
  })

  it('falla cuando la duración supera el tope (Inicio actividad > 3 años)', () => {
    const spec: RuleSpec = {
      kind: 'DURATION_MAX_DAYS',
      startPath: 'contract.startDate',
      endPath: 'contract.endDate',
      maxDays: 1095,
    }
    const result = evaluateRule(
      spec,
      makeCtx({
        startDate: new Date('2026-01-01'),
        endDate: new Date('2030-01-01'), // 4 años
      }),
    )
    expect(result.passed).toBe(false)
  })

  it('falla cuando endDate falta y requireEnd es true', () => {
    const spec: RuleSpec = {
      kind: 'DURATION_MAX_DAYS',
      startPath: 'contract.startDate',
      endPath: 'contract.endDate',
      maxDays: 1825,
      requireEnd: true,
    }
    const result = evaluateRule(spec, makeCtx({ endDate: null }))
    expect(result.passed).toBe(false)
  })

  it('pasa cuando endDate falta y requireEnd no está', () => {
    const spec: RuleSpec = {
      kind: 'DURATION_MAX_DAYS',
      startPath: 'contract.startDate',
      endPath: 'contract.endDate',
      maxDays: 1825,
    }
    const result = evaluateRule(spec, makeCtx({ endDate: null }))
    expect(result.passed).toBe(true)
  })
})

describe('evaluateRule — WORKER_MODAL_SUM_MAX_DAYS', () => {
  it('pasa con suma menor a 5 años', () => {
    const spec: RuleSpec = { kind: 'WORKER_MODAL_SUM_MAX_DAYS', maxDays: 1825 }
    const ctx = makeCtx(
      {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
      },
      {
        history: [
          {
            contractId: 'old1',
            type: 'LABORAL_PLAZO_FIJO',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2025-01-01'),
            durationDays: 365,
          },
        ],
      },
    )
    const result = evaluateRule(spec, ctx)
    expect(result.passed).toBe(true)
    expect(result.evidence?.totalDays).toBeGreaterThan(700)
  })

  it('falla cuando la suma con histórico supera 5 años', () => {
    const spec: RuleSpec = { kind: 'WORKER_MODAL_SUM_MAX_DAYS', maxDays: 1825 }
    const ctx = makeCtx(
      {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
      },
      {
        history: [
          { contractId: 'old1', type: 'LABORAL_PLAZO_FIJO', startDate: new Date('2021-01-01'), endDate: new Date('2024-01-01'), durationDays: 1095 },
          { contractId: 'old2', type: 'LABORAL_PLAZO_FIJO', startDate: new Date('2024-01-01'), endDate: new Date('2025-12-30'), durationDays: 729 },
        ],
      },
    )
    const result = evaluateRule(spec, ctx)
    expect(result.passed).toBe(false)
  })
})

describe('evaluateRule — TUTELA_GESTANTE_NO_RENEWAL', () => {
  it('falla cuando hay trabajadora gestante y contrato modal con endDate', () => {
    const spec: RuleSpec = { kind: 'TUTELA_GESTANTE_NO_RENEWAL' }
    const ctx = makeCtx(
      { endDate: new Date('2026-12-31') },
      {
        workers: [
          {
            id: 'wkr_1',
            dni: '12345678',
            fullName: 'María Rodríguez',
            regimenLaboral: 'GENERAL',
            fechaIngreso: new Date('2026-01-01'),
            sueldoBruto: 1500,
            isPregnant: true,
            nationality: 'peruana',
          },
        ],
      },
    )
    const result = evaluateRule(spec, ctx)
    expect(result.passed).toBe(false)
    expect(result.message).toContain('María Rodríguez')
  })

  it('pasa cuando no hay trabajadoras gestantes', () => {
    const spec: RuleSpec = { kind: 'TUTELA_GESTANTE_NO_RENEWAL' }
    const result = evaluateRule(spec, makeCtx())
    expect(result.passed).toBe(true)
  })

  it('pasa con gestante si el contrato no tiene fecha de fin (indeterminado)', () => {
    const spec: RuleSpec = { kind: 'TUTELA_GESTANTE_NO_RENEWAL' }
    const ctx = makeCtx(
      { endDate: null },
      {
        workers: [
          {
            id: 'wkr_1',
            dni: '12345678',
            fullName: 'María Rodríguez',
            regimenLaboral: 'GENERAL',
            fechaIngreso: new Date('2026-01-01'),
            sueldoBruto: 1500,
            isPregnant: true,
            nationality: 'peruana',
          },
        ],
      },
    )
    const result = evaluateRule(spec, ctx)
    expect(result.passed).toBe(true)
  })
})

describe('evaluateRule — WEEKLY_HOURS_RANGE (tiempo parcial)', () => {
  it('falla cuando jornada >= 24h/semana en tiempo parcial', () => {
    const spec: RuleSpec = { kind: 'WEEKLY_HOURS_RANGE', max: 23 }
    const result = evaluateRule(spec, makeCtx({ weeklyHours: 30 }))
    expect(result.passed).toBe(false)
  })

  it('pasa con 20h/semana', () => {
    const spec: RuleSpec = { kind: 'WEEKLY_HOURS_RANGE', max: 23 }
    const result = evaluateRule(spec, makeCtx({ weeklyHours: 20 }))
    expect(result.passed).toBe(true)
  })

  it('no aplica si weeklyHours es null', () => {
    const spec: RuleSpec = { kind: 'WEEKLY_HOURS_RANGE', max: 23 }
    const result = evaluateRule(spec, makeCtx({ weeklyHours: null }))
    expect(result.passed).toBe(true)
  })
})

describe('evaluateRule — CONDITIONAL_FIELD_REQUIRED (suplencia)', () => {
  it('falla cuando el contrato es plazo fijo y falta titular_suplido', () => {
    const spec: RuleSpec = {
      kind: 'CONDITIONAL_FIELD_REQUIRED',
      whenContractTypeIn: ['LABORAL_PLAZO_FIJO'],
      requiredField: 'contract.formData.titular_suplido',
    }
    const result = evaluateRule(spec, makeCtx({ formData: {} }))
    expect(result.passed).toBe(false)
  })

  it('pasa cuando el campo está presente', () => {
    const spec: RuleSpec = {
      kind: 'CONDITIONAL_FIELD_REQUIRED',
      whenContractTypeIn: ['LABORAL_PLAZO_FIJO'],
      requiredField: 'contract.formData.titular_suplido',
    }
    const result = evaluateRule(
      spec,
      makeCtx({ formData: { titular_suplido: 'María Pérez DNI 12345678' } }),
    )
    expect(result.passed).toBe(true)
  })

  it('no aplica si el contrato es de otro tipo', () => {
    const spec: RuleSpec = {
      kind: 'CONDITIONAL_FIELD_REQUIRED',
      whenContractTypeIn: ['LABORAL_PLAZO_FIJO'],
      requiredField: 'contract.formData.titular_suplido',
    }
    const result = evaluateRule(spec, makeCtx({ type: 'LABORAL_INDEFINIDO', formData: {} }))
    expect(result.passed).toBe(true)
  })
})

describe('evaluateRule — FIELD_REGEX_REQUIRE (cláusula PDP)', () => {
  it('pasa cuando el contenido menciona Ley 29733', () => {
    const spec: RuleSpec = {
      kind: 'FIELD_REGEX_REQUIRE',
      field: 'contract.contentHtml',
      patterns: ['ley\\s+29733', 'datos\\s+personales'],
      flags: 'i',
    }
    const result = evaluateRule(
      spec,
      makeCtx({ contentHtml: '<p>Cláusula sobre tratamiento de datos personales conforme a Ley 29733.</p>' }),
    )
    expect(result.passed).toBe(true)
  })

  it('falla cuando no menciona PDP', () => {
    const spec: RuleSpec = {
      kind: 'FIELD_REGEX_REQUIRE',
      field: 'contract.contentHtml',
      patterns: ['ley\\s+29733', 'datos\\s+personales'],
      flags: 'i',
    }
    const result = evaluateRule(
      spec,
      makeCtx({ contentHtml: '<p>Sin mención al tema.</p>' }),
    )
    expect(result.passed).toBe(false)
  })
})
