import { describe, expect, it } from 'vitest'
import { buildLegacySeedPreview } from '../seed-from-legacy'

describe('seed legacy del organigrama', () => {
  it('calcula creaciones netas y ajustes de cupos sin duplicar estructura existente', () => {
    const preview = buildLegacySeedPreview(
      [
        { id: 'w1', department: 'Operaciones', position: 'Analista' },
        { id: 'w2', department: 'Operaciones', position: 'Analista' },
        { id: 'w3', department: 'Legal', position: 'Jefe Legal' },
      ],
      [{ id: 'u1', name: 'Operaciones', slug: 'operaciones' }],
      [{ id: 'p1', orgUnitId: 'u1', title: 'Analista', seats: 1 }],
      [{ workerId: 'w1' }],
    )

    expect(preview.unitsToCreate).toEqual([{ slug: 'legal', name: 'Legal' }])
    expect(preview.positionsToCreate).toEqual([{ unitSlug: 'legal', title: 'Jefe Legal' }])
    expect(preview.positionsToResize).toEqual([
      { unitSlug: 'operaciones', title: 'Analista', currentSeats: 1, requiredSeats: 2 },
    ])
    expect(preview.assignmentsToCreate).toBe(2)
  })

  it('usa Sin área para trabajadores con cargo pero sin departamento', () => {
    const preview = buildLegacySeedPreview([
      { id: 'w1', department: null, position: 'Asistente' },
      { id: 'w2', department: '', position: '' },
    ])

    expect(preview.unitsToCreate).toEqual([{ slug: 'sin-area', name: 'Sin área' }])
    expect(preview.positionsToCreate).toEqual([{ unitSlug: 'sin-area', title: 'Asistente' }])
    expect(preview.workersWithoutDepartment).toBe(2)
    expect(preview.workersWithoutPosition).toBe(1)
    expect(preview.assignmentsToCreate).toBe(1)
  })
})
