import { describe, it, expect } from 'vitest'
import { planWorkerChange, type WorkerSnapshot } from '../apply-worker-change-plan'

const active: WorkerSnapshot = { status: 'ACTIVE', sueldoBruto: 2000 }

describe('planWorkerChange', () => {
  it('promote: cierra titular, crea cargo nuevo y aplica el sueldo', () => {
    const p = planWorkerChange({ kind: 'promote', newPositionId: 'pos1', newSalary: 3000 }, active)
    expect(p.error).toBeUndefined()
    expect(p.closeActivePrimary).toBe(true)
    expect(p.assignNewPositionId).toBe('pos1')
    expect(p.workerData.sueldoBruto).toBe(3000)
  })

  it('transfer: cambia de cargo sin tocar el sueldo', () => {
    const p = planWorkerChange({ kind: 'transfer', newPositionId: 'pos2' }, active)
    expect(p.error).toBeUndefined()
    expect(p.assignNewPositionId).toBe('pos2')
    expect(p.workerData.sueldoBruto).toBeUndefined()
  })

  it('transfer sin cargo destino → error', () => {
    const p = planWorkerChange({ kind: 'transfer', newPositionId: '' }, active)
    expect(p.error).toBeTruthy()
  })

  it('raise válido setea sueldo y recompute', () => {
    const p = planWorkerChange({ kind: 'raise', newSalary: 2500 }, active)
    expect(p.error).toBeUndefined()
    expect(p.workerData.sueldoBruto).toBe(2500)
    expect(p.recomputeAfter).toBe(true)
    expect(p.assignNewPositionId).toBeNull()
  })

  it('raise al mismo sueldo → error (sin cambio)', () => {
    expect(planWorkerChange({ kind: 'raise', newSalary: 2000 }, active).error).toBeTruthy()
  })

  it('cese: cierra TODAS las asignaciones + TERMINATED', () => {
    const p = planWorkerChange({ kind: 'cese', fechaCese: '2026-06-19', motivo: 'renuncia' }, active)
    expect(p.error).toBeUndefined()
    expect(p.closeAllAssignments).toBe(true)
    expect(p.workerData.status).toBe('TERMINATED')
    expect(p.workerData.motivoCese).toBe('renuncia')
  })

  it('suspend válido', () => {
    const p = planWorkerChange({ kind: 'suspend' }, active)
    expect(p.workerData.status).toBe('SUSPENDED')
    expect(p.recomputeAfter).toBe(true)
  })

  it('suspend de un ya suspendido → error', () => {
    const p = planWorkerChange({ kind: 'suspend' }, { status: 'SUSPENDED', sueldoBruto: 2000 })
    expect(p.error).toBeTruthy()
  })

  it('reactivate de un ya activo → error', () => {
    expect(planWorkerChange({ kind: 'reactivate' }, active).error).toBeTruthy()
  })

  it('un trabajador cesado no admite ningún cambio', () => {
    const terminated: WorkerSnapshot = { status: 'TERMINATED', sueldoBruto: 2000 }
    expect(planWorkerChange({ kind: 'raise', newSalary: 5000 }, terminated).error).toBeTruthy()
    expect(planWorkerChange({ kind: 'promote', newPositionId: 'p', newSalary: 9000 }, terminated).error).toBeTruthy()
  })
})
