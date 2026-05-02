import { describe, it, expect } from 'vitest'
import { diffSnapshots, hashSnapshotPayload } from '../snapshot-service'

describe('snapshot diff', () => {
  it('detecta unidades agregadas y removidas', () => {
    const before = {
      units: [{ id: 'u1', name: 'A' }, { id: 'u2', name: 'B' }],
      assignments: [],
    }
    const after = {
      units: [{ id: 'u1', name: 'A' }, { id: 'u3', name: 'C' }],
      assignments: [],
    }
    const diff = diffSnapshots(before, after)
    expect(diff.addedUnits).toHaveLength(1)
    expect(diff.addedUnits[0].id).toBe('u3')
    expect(diff.removedUnits).toHaveLength(1)
    expect(diff.removedUnits[0].id).toBe('u2')
  })

  it('detecta asignaciones agregadas y removidas', () => {
    const before = {
      units: [],
      assignments: [
        { workerId: 'w1', positionId: 'p1' },
        { workerId: 'w2', positionId: 'p2' },
      ],
    }
    const after = {
      units: [],
      assignments: [
        { workerId: 'w1', positionId: 'p1' },
        { workerId: 'w3', positionId: 'p3' },
      ],
    }
    const diff = diffSnapshots(before, after)
    expect(diff.addedAssignments).toHaveLength(1)
    expect(diff.addedAssignments[0].workerId).toBe('w3')
    expect(diff.removedAssignments).toHaveLength(1)
    expect(diff.removedAssignments[0].workerId).toBe('w2')
  })

  it('mismo snapshot → sin diferencias', () => {
    const tree = {
      units: [{ id: 'u1', name: 'A' }],
      assignments: [{ workerId: 'w1', positionId: 'p1' }],
    }
    const diff = diffSnapshots(tree, tree)
    expect(diff.addedUnits).toHaveLength(0)
    expect(diff.removedUnits).toHaveLength(0)
    expect(diff.addedAssignments).toHaveLength(0)
    expect(diff.removedAssignments).toHaveLength(0)
  })

  it('detecta cargos agregados, removidos y cambios MOF/SST', () => {
    const before = {
      units: [],
      positions: [
        {
          id: 'p1',
          orgUnitId: 'u1',
          title: 'Jefe Legal',
          purpose: 'Dirigir',
          requirements: { education: 'Universitario' },
          riskCategory: 'BAJO',
        },
        { id: 'p2', orgUnitId: 'u1', title: 'Analista Legal' },
      ],
      assignments: [],
    }
    const after = {
      units: [],
      positions: [
        {
          id: 'p1',
          orgUnitId: 'u1',
          title: 'Jefe Legal',
          purpose: 'Dirigir y controlar',
          requirements: { education: 'Universitario', experience: '5 años' },
          riskCategory: 'ALTO',
        },
        { id: 'p3', orgUnitId: 'u2', title: 'Coordinador SST' },
      ],
      assignments: [],
    }

    const diff = diffSnapshots(before, after)

    expect(diff.addedPositions).toHaveLength(1)
    expect(diff.addedPositions[0].id).toBe('p3')
    expect(diff.removedPositions).toHaveLength(1)
    expect(diff.removedPositions[0].id).toBe('p2')
    expect(diff.changedPositions).toHaveLength(1)
    expect(diff.changedPositions[0].changedFields).toEqual(
      expect.arrayContaining(['purpose', 'requirements', 'riskCategory']),
    )
  })

  it('detecta movimientos jerárquicos y reasignaciones de trabajadores', () => {
    const before = {
      units: [],
      positions: [
        { id: 'p1', orgUnitId: 'u1', title: 'Gerente' },
        { id: 'p2', orgUnitId: 'u1', title: 'Analista', reportsToPositionId: 'p1' },
      ],
      assignments: [{ workerId: 'w1', positionId: 'p2', isPrimary: true }],
    }
    const after = {
      units: [],
      positions: [
        { id: 'p1', orgUnitId: 'u1', title: 'Gerente' },
        { id: 'p2', orgUnitId: 'u2', title: 'Analista', reportsToPositionId: null },
      ],
      assignments: [{ workerId: 'w1', positionId: 'p1', isPrimary: true }],
    }

    const diff = diffSnapshots(before, after)

    expect(diff.movedPositions).toHaveLength(1)
    expect(diff.movedPositions[0].id).toBe('p2')
    expect(diff.reassignedWorkers).toHaveLength(1)
    expect(diff.reassignedWorkers[0]).toMatchObject({
      workerId: 'w1',
      beforePositionId: 'p2',
      afterPositionId: 'p1',
    })
    expect(diff.totals.movedPositions).toBe(1)
    expect(diff.totals.reassignedWorkers).toBe(1)
  })
})

describe('snapshot hash canonico', () => {
  it('cambia cuando cambia una propiedad anidada del puesto', () => {
    const base = {
      units: [{ id: 'u1', parentId: null, name: 'Operaciones', level: 0 }],
      positions: [
        {
          id: 'p1',
          orgUnitId: 'u1',
          title: 'Jefe de Operaciones',
          requirements: { education: 'Universitario' },
        },
      ],
      assignments: [],
      complianceRoles: [],
    }
    const changed = {
      ...base,
      positions: [
        {
          ...base.positions[0],
          requirements: { education: 'Tecnico' },
        },
      ],
    }

    expect(hashSnapshotPayload(base)).not.toBe(hashSnapshotPayload(changed))
  })

  it('no depende del orden de las llaves ni de los arreglos principales', () => {
    const first = {
      units: [
        { id: 'u2', parentId: 'u1', name: 'Ventas', level: 1 },
        { id: 'u1', parentId: null, name: 'Gerencia', level: 0 },
      ],
      positions: [
        { id: 'p2', orgUnitId: 'u2', title: 'Ejecutivo' },
        { id: 'p1', title: 'Gerente', orgUnitId: 'u1' },
      ],
      assignments: [{ id: 'a1', workerId: 'w1', positionId: 'p1' }],
      complianceRoles: [],
    }
    const second = {
      complianceRoles: [],
      assignments: [{ positionId: 'p1', workerId: 'w1', id: 'a1' }],
      positions: [
        { orgUnitId: 'u1', title: 'Gerente', id: 'p1' },
        { title: 'Ejecutivo', id: 'p2', orgUnitId: 'u2' },
      ],
      units: [
        { level: 0, name: 'Gerencia', parentId: null, id: 'u1' },
        { name: 'Ventas', parentId: 'u1', id: 'u2', level: 1 },
      ],
    }

    expect(hashSnapshotPayload(first)).toBe(hashSnapshotPayload(second))
  })
})
