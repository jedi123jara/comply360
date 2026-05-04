import { describe, it, expect } from 'vitest'
import { pickClosestSnapshot, computeHighlights } from '../memoria-pdf/pure'
import type { OrgChartTree, OrgUnitDTO, OrgPositionDTO } from '../types'

function snap(id: string, dateISO: string) {
  return {
    id,
    label: `S-${id}`,
    hash: `hash-${id}`,
    workerCount: 0,
    unitCount: 0,
    depthMax: 0,
    createdAt: dateISO,
  }
}

function unit(partial: Partial<OrgUnitDTO> & Pick<OrgUnitDTO, 'id' | 'name'>): OrgUnitDTO {
  return {
    parentId: null,
    slug: partial.name.toLowerCase().replace(/\s+/g, '-'),
    kind: 'AREA',
    code: null,
    description: null,
    costCenter: null,
    level: 0,
    sortOrder: 0,
    color: null,
    icon: null,
    version: 1,
    isActive: true,
    ...partial,
  }
}

function pos(
  partial: Partial<OrgPositionDTO> & Pick<OrgPositionDTO, 'id' | 'orgUnitId' | 'title'>,
): OrgPositionDTO {
  return {
    code: null,
    description: null,
    isManagerial: false,
    reportsToPositionId: null,
    backupPositionId: null,
    seats: 1,
    ...partial,
  }
}

function emptyTree(units: OrgUnitDTO[] = [], positions: OrgPositionDTO[] = []): OrgChartTree {
  return {
    rootUnitIds: units.filter((u) => u.parentId === null).map((u) => u.id),
    units,
    positions,
    assignments: [],
    complianceRoles: [],
    generatedAt: new Date().toISOString(),
    asOf: null,
  }
}

describe('pickClosestSnapshot', () => {
  it('devuelve null si la lista está vacía', () => {
    const result = pickClosestSnapshot([], new Date('2026-06-01'))
    expect(result).toBeNull()
  })

  it('devuelve el snapshot más reciente que no pase la fecha objetivo', () => {
    const list = [
      snap('a', '2026-01-15T00:00:00Z'),
      snap('b', '2026-03-20T00:00:00Z'),
      snap('c', '2026-08-10T00:00:00Z'),
    ]
    const result = pickClosestSnapshot(list, new Date('2026-06-01T00:00:00Z'))
    expect(result?.id).toBe('b')
  })

  it('si todos los snapshots son posteriores a la fecha objetivo, devuelve el más antiguo', () => {
    const list = [
      snap('a', '2026-08-10T00:00:00Z'),
      snap('b', '2026-09-01T00:00:00Z'),
    ]
    const result = pickClosestSnapshot(list, new Date('2026-06-01T00:00:00Z'))
    expect(result?.id).toBe('a')
  })

  it('si solo hay uno y es anterior, lo devuelve', () => {
    const list = [snap('a', '2026-01-01T00:00:00Z')]
    const result = pickClosestSnapshot(list, new Date('2026-12-31T00:00:00Z'))
    expect(result?.id).toBe('a')
  })
})

describe('computeHighlights', () => {
  it('sin snapshot inicial, devuelve array vacío', () => {
    const end = emptyTree([unit({ id: 'u1', name: 'A' })])
    const highlights = computeHighlights(null, end)
    expect(highlights).toEqual([])
  })

  it('detecta una unidad nueva agregada', () => {
    const start = emptyTree([unit({ id: 'u1', name: 'A' })])
    const end = emptyTree([
      unit({ id: 'u1', name: 'A' }),
      unit({ id: 'u2', name: 'B Nueva' }),
    ])
    const highlights = computeHighlights(start, end)
    const added = highlights.filter((h) => h.kind === 'unit-added')
    expect(added).toHaveLength(1)
    expect(added[0].description).toContain('B Nueva')
  })

  it('detecta una unidad removida', () => {
    const start = emptyTree([
      unit({ id: 'u1', name: 'A' }),
      unit({ id: 'u2', name: 'B Antigua' }),
    ])
    const end = emptyTree([unit({ id: 'u1', name: 'A' })])
    const highlights = computeHighlights(start, end)
    const removed = highlights.filter((h) => h.kind === 'unit-removed')
    expect(removed).toHaveLength(1)
    expect(removed[0].description).toContain('B Antigua')
  })

  it('cuenta posiciones nuevas creadas', () => {
    const u1 = unit({ id: 'u1', name: 'A' })
    const start = emptyTree([u1], [pos({ id: 'p1', orgUnitId: 'u1', title: 'Jefe' })])
    const end = emptyTree(
      [u1],
      [
        pos({ id: 'p1', orgUnitId: 'u1', title: 'Jefe' }),
        pos({ id: 'p2', orgUnitId: 'u1', title: 'Analista 1' }),
        pos({ id: 'p3', orgUnitId: 'u1', title: 'Analista 2' }),
      ],
    )
    const highlights = computeHighlights(start, end)
    const positions = highlights.filter((h) => h.kind === 'position-added')
    expect(positions).toHaveLength(1)
    expect(positions[0].description).toContain('2 cargos')
  })

  it('árboles idénticos no generan highlights', () => {
    const u1 = unit({ id: 'u1', name: 'A' })
    const tree = emptyTree([u1], [pos({ id: 'p1', orgUnitId: 'u1', title: 'Jefe' })])
    const highlights = computeHighlights(tree, tree)
    expect(highlights).toEqual([])
  })
})
