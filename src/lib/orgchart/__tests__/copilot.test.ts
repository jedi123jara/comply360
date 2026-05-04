import { describe, it, expect } from 'vitest'
import { validateCopilotPlan } from '../copilot/validate-plan'
import { copilotPlanSchema, type CopilotPlan } from '../copilot/operations'

const REAL = {
  unitIds: new Set(['u_real_1']),
  positionIds: new Set(['p_real_1']),
  workerIds: new Set(['w_real_1']),
}

function plan(operations: CopilotPlan['operations']): CopilotPlan {
  return {
    rationale: 'test plan',
    operations,
    legalNotes: [],
  }
}

describe('Copilot plan schema', () => {
  it('valida operaciones bien formadas', () => {
    const p = copilotPlanSchema.safeParse({
      rationale: 'crea subgerencia comercial',
      operations: [
        {
          op: 'createUnit',
          tempKey: 'u_x',
          name: 'Comercial',
          kind: 'AREA',
          parentRef: null,
        },
        {
          op: 'createPosition',
          tempKey: 'p_x',
          title: 'Jefe Comercial',
          unitRef: 'u_x',
          reportsToRef: null,
          isManagerial: true,
          isCritical: false,
          seats: 1,
        },
      ],
      legalNotes: [],
    })
    expect(p.success).toBe(true)
  })

  it('rechaza operación con op desconocido', () => {
    const p = copilotPlanSchema.safeParse({
      rationale: 'x',
      operations: [{ op: 'inventado', tempKey: 'x', name: 'X', kind: 'AREA' }],
    })
    expect(p.success).toBe(false)
  })
})

describe('validateCopilotPlan', () => {
  it('plan válido sin errores', () => {
    const r = validateCopilotPlan(
      plan([
        {
          op: 'createUnit',
          tempKey: 'u_x',
          name: 'Comercial',
          kind: 'AREA',
          parentRef: null,
        },
      ]),
      REAL,
    )
    expect(r.valid).toBe(true)
    expect(r.errors).toEqual([])
  })

  it('detecta tempKey duplicado', () => {
    const r = validateCopilotPlan(
      plan([
        {
          op: 'createUnit',
          tempKey: 'u_x',
          name: 'A',
          kind: 'AREA',
          parentRef: null,
        },
        {
          op: 'createUnit',
          tempKey: 'u_x',
          name: 'B',
          kind: 'AREA',
          parentRef: null,
        },
      ]),
      REAL,
    )
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('duplicado'))).toBe(true)
  })

  it('parentRef puede ser tempKey de op anterior', () => {
    const r = validateCopilotPlan(
      plan([
        {
          op: 'createUnit',
          tempKey: 'u_padre',
          name: 'Padre',
          kind: 'GERENCIA',
          parentRef: null,
        },
        {
          op: 'createUnit',
          tempKey: 'u_hijo',
          name: 'Hijo',
          kind: 'AREA',
          parentRef: 'u_padre',
        },
      ]),
      REAL,
    )
    expect(r.valid).toBe(true)
  })

  it('parentRef puede ser ID real existente', () => {
    const r = validateCopilotPlan(
      plan([
        {
          op: 'createUnit',
          tempKey: 'u_hijo',
          name: 'Hijo',
          kind: 'AREA',
          parentRef: 'u_real_1',
        },
      ]),
      REAL,
    )
    expect(r.valid).toBe(true)
  })

  it('parentRef inexistente → error', () => {
    const r = validateCopilotPlan(
      plan([
        {
          op: 'createUnit',
          tempKey: 'u_x',
          name: 'X',
          kind: 'AREA',
          parentRef: 'fantasma',
        },
      ]),
      REAL,
    )
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('fantasma'))).toBe(true)
  })

  it('createPosition con unitRef tempKey de op anterior', () => {
    const r = validateCopilotPlan(
      plan([
        {
          op: 'createUnit',
          tempKey: 'u_x',
          name: 'X',
          kind: 'AREA',
          parentRef: null,
        },
        {
          op: 'createPosition',
          tempKey: 'p_x',
          title: 'Jefe',
          unitRef: 'u_x',
          reportsToRef: null,
          isManagerial: true,
          isCritical: false,
          seats: 1,
        },
      ]),
      REAL,
    )
    expect(r.valid).toBe(true)
  })

  it('assignWorker workerId no real → error', () => {
    const r = validateCopilotPlan(
      plan([
        {
          op: 'assignWorker',
          positionRef: 'p_real_1',
          workerId: 'w_fantasma',
          isPrimary: true,
          isInterim: false,
        },
      ]),
      REAL,
    )
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('w_fantasma'))).toBe(true)
  })

  it('movePosition de positionId real → válido', () => {
    const r = validateCopilotPlan(
      plan([
        {
          op: 'movePosition',
          positionId: 'p_real_1',
          newParentRef: null,
        },
      ]),
      REAL,
    )
    expect(r.valid).toBe(true)
  })

  it('warning si plan tiene >20 ops', () => {
    const ops: CopilotPlan['operations'] = []
    for (let i = 0; i < 25; i++) {
      ops.push({
        op: 'createUnit',
        tempKey: `u_${i}`,
        name: `U${i}`,
        kind: 'AREA',
        parentRef: null,
      })
    }
    const r = validateCopilotPlan(plan(ops), REAL)
    expect(r.valid).toBe(true)
    expect(r.warnings.some((w) => w.includes('muchas'))).toBe(true)
  })
})
