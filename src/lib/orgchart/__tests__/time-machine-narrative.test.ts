import { describe, it, expect } from 'vitest'
import { buildDeterministicNarrative } from '../time-machine-narrative'
import type { NarrativeInput } from '../time-machine-narrative'

function input(partial: Partial<NarrativeInput> = {}): NarrativeInput {
  return {
    fromLabel: 'Inicio',
    fromDate: '01/01/2026',
    toLabel: 'Cierre',
    toDate: '31/12/2026',
    addedUnits: [],
    removedUnits: [],
    addedAssignments: [],
    removedAssignments: [],
    addedRoles: [],
    ...partial,
  }
}

describe('buildDeterministicNarrative', () => {
  it('sin cambios → texto neutro', () => {
    const r = buildDeterministicNarrative(input())
    expect(r.source).toBe('deterministic')
    expect(r.text).toContain('No hubo cambios')
    expect(r.highlights).toEqual([])
  })

  it('cuenta unidades agregadas y las menciona', () => {
    const r = buildDeterministicNarrative(
      input({
        addedUnits: [{ name: 'Logística' }, { name: 'Marketing' }],
      }),
    )
    expect(r.text).toContain('2 unidades')
    expect(r.text).toContain('Logística')
    expect(r.highlights).toContain('+2 unidades')
  })

  it('agrupa múltiples categorías de cambios', () => {
    const r = buildDeterministicNarrative(
      input({
        addedUnits: [{ name: 'X' }],
        addedAssignments: [
          { workerName: 'Ana Pérez', positionTitle: 'Jefa' },
          { workerName: 'Carlos Vega', positionTitle: 'Analista' },
        ],
        addedRoles: [
          { roleType: 'PRESIDENTE_COMITE_SST', workerName: 'Ana Pérez' },
        ],
      }),
    )
    expect(r.highlights.length).toBe(3)
    expect(r.text).toContain('1 unidad')
    expect(r.text).toContain('2 persona')
    expect(r.text).toContain('1 responsables legales')
  })

  it('trunca lista de unidades a 3 con elipsis', () => {
    const r = buildDeterministicNarrative(
      input({
        addedUnits: [
          { name: 'A' },
          { name: 'B' },
          { name: 'C' },
          { name: 'D' },
        ],
      }),
    )
    expect(r.text).toContain('A, B, C…')
  })

  it('formatea singular vs plural correctamente', () => {
    const r1 = buildDeterministicNarrative(input({ addedUnits: [{ name: 'X' }] }))
    expect(r1.text).toMatch(/1 unidad\s/)
    const r2 = buildDeterministicNarrative(
      input({ addedUnits: [{ name: 'X' }, { name: 'Y' }] }),
    )
    expect(r2.text).toMatch(/2 unidades/)
  })

  it('cuenta salidas y agregaciones por separado', () => {
    const r = buildDeterministicNarrative(
      input({
        addedAssignments: [{ workerName: 'A', positionTitle: 'J' }],
        removedAssignments: [
          { workerName: 'B', positionTitle: 'V' },
          { workerName: 'C', positionTitle: 'V' },
        ],
      }),
    )
    expect(r.highlights).toContain('+1 personas')
    expect(r.highlights).toContain('−2 salidas')
  })
})
