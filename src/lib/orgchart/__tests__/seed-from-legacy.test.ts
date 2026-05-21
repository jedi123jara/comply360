import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildLegacySeedPreview, applyLegacySeed } from '../seed-from-legacy'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    worker: { findMany: vi.fn() },
    orgUnit: { findUnique: vi.fn(), create: vi.fn() },
    orgPosition: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    orgAssignment: { findFirst: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'

describe('seed legacy del organigrama', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('aplica auto-inferencia de jerarquia (subordinacion) a puestos no gerenciales en la misma unidad', async () => {
    // 1. Mock de trabajadores
    const mockWorkers = [
      { id: 'w1', department: 'Operaciones', position: 'Analista' },
      { id: 'w2', department: 'Operaciones', position: 'Jefe de Operaciones' },
    ]
    ;(prisma.worker.findMany as any).mockResolvedValue(mockWorkers)

    // 2. Mock de unidades
    const mockUnit = { id: 'u1', name: 'Operaciones', slug: 'operaciones', kind: 'AREA', level: 0 }
    ;(prisma.orgUnit.findUnique as any).mockResolvedValue(mockUnit)

    // 3. Mock de puestos
    const mockPositionAnalista = { id: 'p-analista', orgUnitId: 'u1', title: 'Analista', isManagerial: false, reportsToPositionId: null }
    const mockPositionJefe = { id: 'p-jefe', orgUnitId: 'u1', title: 'Jefe de Operaciones', isManagerial: true, reportsToPositionId: null }

    // En el loop findFirst de orgPosition
    ;(prisma.orgPosition.findFirst as any)
      .mockResolvedValueOnce(mockPositionAnalista) // Analista
      .mockResolvedValueOnce(mockPositionJefe) // Jefe de Operaciones

    // Mock de asignaciones
    ;(prisma.orgAssignment.findFirst as any).mockResolvedValue({ id: 'a1' }) // ya asignado

    // Mock de allPositions para la parte final de la heurística
    ;(prisma.orgPosition.findMany as any).mockResolvedValue([
      mockPositionAnalista,
      mockPositionJefe,
    ])

    // Mock de update y auditLog
    ;(prisma.orgPosition.update as any).mockResolvedValue({})
    ;(prisma.auditLog.create as any).mockResolvedValue({})

    // Ejecutamos
    const result = await applyLegacySeed('org-1', 'admin-user-1')

    // Verificaciones
    expect(result.totalWorkers).toBe(2)
    
    // Verificamos que se actualizó el puesto del analista para reportar al jefe
    expect(prisma.orgPosition.update).toHaveBeenCalledWith({
      where: { id: 'p-analista' },
      data: { reportsToPositionId: 'p-jefe' },
    })

    // Verificamos que se creó el AuditLog correspondiente
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        orgId: 'org-1',
        userId: 'admin-user-1',
        action: 'orgchart.subordination_inferred',
        entityType: 'OrgPosition',
        entityId: 'p-analista',
        metadataJson: {
          inferredManagerPositionId: 'p-jefe',
          orgUnitId: 'u1',
          reason: 'Auto-inferencia de jerarquía inicial por unidad y cargo directivo',
        },
      },
    })
  })
})
