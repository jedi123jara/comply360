import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyJurisprudenceAffectations,
  bumpMinor,
  bumpPatch,
  deriveCategory,
} from '../apply'
import type { ClauseAffectation, RuleAffectation } from '../types'

// =============================================
// FAKE PRISMA CLIENT IN-MEMORY
// Cubre lo mínimo que applyJurisprudenceAffectations usa.
// =============================================

interface FakeRule {
  id: string
  code: string
  category: string
  severity: 'BLOCKER' | 'WARNING' | 'INFO'
  title: string
  description: string
  legalBasis: string
  ruleSpec: unknown
  appliesTo: unknown
  version: string
  active: boolean
}

interface FakeClause {
  id: string
  code: string
  category: string
  type: string
  title: string
  bodyTemplate: string
  legalBasis: string
  variables: unknown
  applicableTo: unknown
  version: string
  active: boolean
}

function makeFakePrisma() {
  const rules = new Map<string, FakeRule>()
  const clauses = new Map<string, FakeClause>()
  let idCounter = 1

  const tx = {
    contractValidationRule: {
      findUnique: async ({ where, select }: { where: { code: string }; select?: Record<string, true> }) => {
        const r = rules.get(where.code)
        if (!r) return null
        if (!select) return r
        const projected: Record<string, unknown> = {}
        for (const k of Object.keys(select)) projected[k] = (r as unknown as Record<string, unknown>)[k]
        return projected
      },
      create: async ({ data }: { data: Omit<FakeRule, 'id'> }) => {
        const id = `rule_${idCounter++}`
        const row: FakeRule = { id, ...data } as FakeRule
        rules.set(row.code, row)
        return row
      },
      update: async ({ where, data }: { where: { code: string }; data: Partial<FakeRule> }) => {
        const r = rules.get(where.code)
        if (!r) throw new Error('not found')
        Object.assign(r, data)
        rules.set(where.code, r)
        return r
      },
    },
    contractClause: {
      findUnique: async ({ where, select }: { where: { code: string }; select?: Record<string, true> }) => {
        const c = clauses.get(where.code)
        if (!c) return null
        if (!select) return c
        const projected: Record<string, unknown> = {}
        for (const k of Object.keys(select)) projected[k] = (c as unknown as Record<string, unknown>)[k]
        return projected
      },
      create: async ({ data }: { data: Omit<FakeClause, 'id'> }) => {
        const id = `clause_${idCounter++}`
        const row: FakeClause = { id, ...data } as FakeClause
        clauses.set(row.code, row)
        return row
      },
      update: async ({ where, data }: { where: { code: string }; data: Partial<FakeClause> }) => {
        const c = clauses.get(where.code)
        if (!c) throw new Error('not found')
        Object.assign(c, data)
        clauses.set(where.code, c)
        return c
      },
    },
  }

  const fakePrisma = {
    ...tx,
    $transaction: async <T,>(fn: (tx: typeof tx) => Promise<T>) => fn(tx),
  }

  return { fakePrisma, rules, clauses }
}

describe('helpers', () => {
  it('bumpPatch incrementa patch', () => {
    expect(bumpPatch('1.0.0')).toBe('1.0.1')
    expect(bumpPatch('2.5.9')).toBe('2.5.10')
  })

  it('bumpMinor incrementa minor y reset patch', () => {
    expect(bumpMinor('1.0.5')).toBe('1.1.0')
    expect(bumpMinor('2.3.7')).toBe('2.4.0')
  })

  it('deriveCategory extrae el prefix antes del guión', () => {
    expect(deriveCategory('MODAL-001')).toBe('MODAL')
    expect(deriveCategory('PLAZO-002')).toBe('PLAZO')
    expect(deriveCategory('SOLITARIO')).toBe('SOLITARIO')
  })
})

describe('applyJurisprudenceAffectations — RULES', () => {
  let fake: ReturnType<typeof makeFakePrisma>
  beforeEach(() => { fake = makeFakePrisma() })

  it('ADD crea una regla nueva', async () => {
    const r: RuleAffectation = {
      ruleCode: 'NEW-001',
      action: 'ADD',
      severity: 'BLOCKER',
      title: 'Nueva regla',
      description: 'Descripción',
      legalBasis: 'Cas. Lab. 999-2026',
      ruleSpec: { kind: 'FIELD_REQUIRED', field: 'contract.causeObjective' },
    }
    const result = await applyJurisprudenceAffectations(fake.fakePrisma as never, { rules: [r], clauses: [] })
    expect(result.rules[0].status).toBe('OK')
    expect(fake.rules.get('NEW-001')?.active).toBe(true)
    expect(result.totalChanged).toBe(1)
  })

  it('ADD con code existente devuelve ALREADY_EXISTS sin duplicar', async () => {
    fake.rules.set('EXIST-001', {
      id: 'rule_x', code: 'EXIST-001', category: 'X', severity: 'BLOCKER',
      title: 't', description: 'd', legalBasis: 'l', ruleSpec: {}, appliesTo: null,
      version: '1.0.0', active: true,
    })
    const r: RuleAffectation = {
      ruleCode: 'EXIST-001', action: 'ADD', severity: 'WARNING',
      title: 'New', description: 'D', legalBasis: 'L',
      ruleSpec: { kind: 'FIELD_REQUIRED', field: 'x' },
    }
    const result = await applyJurisprudenceAffectations(fake.fakePrisma as never, { rules: [r], clauses: [] })
    expect(result.rules[0].status).toBe('ALREADY_EXISTS')
    // No mutó la severidad
    expect(fake.rules.get('EXIST-001')?.severity).toBe('BLOCKER')
  })

  it('MODIFY actualiza severity y bumpea patch automáticamente', async () => {
    fake.rules.set('MOD-001', {
      id: 'rule_x', code: 'MOD-001', category: 'MOD', severity: 'WARNING',
      title: 't', description: 'd', legalBasis: 'l', ruleSpec: {}, appliesTo: null,
      version: '1.0.0', active: true,
    })
    const r: RuleAffectation = { ruleCode: 'MOD-001', action: 'MODIFY', severity: 'BLOCKER' }
    const result = await applyJurisprudenceAffectations(fake.fakePrisma as never, { rules: [r], clauses: [] })
    expect(result.rules[0].status).toBe('OK')
    expect(fake.rules.get('MOD-001')?.severity).toBe('BLOCKER')
    expect(fake.rules.get('MOD-001')?.version).toBe('1.0.1')
  })

  it('MODIFY con code inexistente → NOT_FOUND', async () => {
    const r: RuleAffectation = { ruleCode: 'GHOST-001', action: 'MODIFY', severity: 'BLOCKER' }
    const result = await applyJurisprudenceAffectations(fake.fakePrisma as never, { rules: [r], clauses: [] })
    expect(result.rules[0].status).toBe('NOT_FOUND')
  })

  it('MODIFY sin cambios materiales → ALREADY_EXISTS', async () => {
    fake.rules.set('NOOP-001', {
      id: 'r', code: 'NOOP-001', category: 'X', severity: 'BLOCKER',
      title: 't', description: 'd', legalBasis: 'l', ruleSpec: {}, appliesTo: null,
      version: '1.2.3', active: true,
    })
    const r: RuleAffectation = { ruleCode: 'NOOP-001', action: 'MODIFY', version: '1.2.3', severity: 'BLOCKER' }
    const result = await applyJurisprudenceAffectations(fake.fakePrisma as never, { rules: [r], clauses: [] })
    expect(result.rules[0].status).toBe('ALREADY_EXISTS')
  })

  it('DEPRECATE marca active=false sin borrar', async () => {
    fake.rules.set('DEP-001', {
      id: 'r', code: 'DEP-001', category: 'X', severity: 'WARNING',
      title: 't', description: 'd', legalBasis: 'l', ruleSpec: {}, appliesTo: null,
      version: '1.0.0', active: true,
    })
    const r: RuleAffectation = { ruleCode: 'DEP-001', action: 'DEPRECATE' }
    const result = await applyJurisprudenceAffectations(fake.fakePrisma as never, { rules: [r], clauses: [] })
    expect(result.rules[0].status).toBe('OK')
    expect(fake.rules.get('DEP-001')?.active).toBe(false)
    // NO se borró
    expect(fake.rules.has('DEP-001')).toBe(true)
  })

  it('DEPRECATE idempotente: ya inactiva → ALREADY_EXISTS', async () => {
    fake.rules.set('DEP-002', {
      id: 'r', code: 'DEP-002', category: 'X', severity: 'WARNING',
      title: 't', description: 'd', legalBasis: 'l', ruleSpec: {}, appliesTo: null,
      version: '1.0.0', active: false,
    })
    const r: RuleAffectation = { ruleCode: 'DEP-002', action: 'DEPRECATE' }
    const result = await applyJurisprudenceAffectations(fake.fakePrisma as never, { rules: [r], clauses: [] })
    expect(result.rules[0].status).toBe('ALREADY_EXISTS')
  })

  it('ADD sin campos requeridos → ERROR sin tocar BD', async () => {
    const r: RuleAffectation = { ruleCode: 'BAD-001', action: 'ADD' } // faltan severity, title, etc.
    const result = await applyJurisprudenceAffectations(fake.fakePrisma as never, { rules: [r], clauses: [] })
    expect(result.rules[0].status).toBe('ERROR')
    expect(result.totalErrors).toBe(1)
    expect(fake.rules.has('BAD-001')).toBe(false)
  })
})

describe('applyJurisprudenceAffectations — CLAUSES', () => {
  let fake: ReturnType<typeof makeFakePrisma>
  beforeEach(() => { fake = makeFakePrisma() })

  it('ADD crea cláusula', async () => {
    const c: ClauseAffectation = {
      code: 'CLA-NEW-001', action: 'ADD',
      category: 'POTESTATIVA', type: 'PERMANENCIA',
      title: 'Nueva', bodyTemplate: 'Texto {{x}}', legalBasis: 'Art X',
      variables: [{ key: 'x', label: 'X', type: 'text' }],
    }
    const result = await applyJurisprudenceAffectations(fake.fakePrisma as never, { rules: [], clauses: [c] })
    expect(result.clauses[0].status).toBe('OK')
    expect(fake.clauses.get('CLA-NEW-001')?.bodyTemplate).toContain('{{x}}')
  })

  it('MODIFY de bodyTemplate bumpea minor', async () => {
    fake.clauses.set('CLA-MOD-001', {
      id: 'c', code: 'CLA-MOD-001', category: 'POTESTATIVA', type: 'CONFIDENCIALIDAD',
      title: 't', bodyTemplate: 'old', legalBasis: 'l', variables: [], applicableTo: null,
      version: '1.0.5', active: true,
    })
    const c: ClauseAffectation = {
      code: 'CLA-MOD-001', action: 'MODIFY', bodyTemplate: 'new content',
    }
    const result = await applyJurisprudenceAffectations(fake.fakePrisma as never, { rules: [], clauses: [c] })
    expect(result.clauses[0].status).toBe('OK')
    expect(fake.clauses.get('CLA-MOD-001')?.bodyTemplate).toBe('new content')
    expect(fake.clauses.get('CLA-MOD-001')?.version).toBe('1.1.0')
  })

  it('DEPRECATE marca active=false', async () => {
    fake.clauses.set('CLA-DEP-001', {
      id: 'c', code: 'CLA-DEP-001', category: 'POTESTATIVA', type: 'X',
      title: 't', bodyTemplate: 'b', legalBasis: 'l', variables: [], applicableTo: null,
      version: '1.0.0', active: true,
    })
    const c: ClauseAffectation = { code: 'CLA-DEP-001', action: 'DEPRECATE' }
    const result = await applyJurisprudenceAffectations(fake.fakePrisma as never, { rules: [], clauses: [c] })
    expect(result.clauses[0].status).toBe('OK')
    expect(fake.clauses.get('CLA-DEP-001')?.active).toBe(false)
  })
})

describe('applyJurisprudenceAffectations — IDEMPOTENCY', () => {
  it('ejecutar el mismo update dos veces no duplica nada', async () => {
    const fake = makeFakePrisma()
    const input = {
      rules: [
        {
          ruleCode: 'IDEM-001', action: 'ADD' as const,
          severity: 'BLOCKER' as const,
          title: 't', description: 'd', legalBasis: 'l',
          ruleSpec: { kind: 'FIELD_REQUIRED' as const, field: 'x' },
        },
      ],
      clauses: [],
    }
    const r1 = await applyJurisprudenceAffectations(fake.fakePrisma as never, input)
    const r2 = await applyJurisprudenceAffectations(fake.fakePrisma as never, input)
    expect(r1.rules[0].status).toBe('OK')
    expect(r2.rules[0].status).toBe('ALREADY_EXISTS')
    expect(fake.rules.size).toBe(1)
  })
})
