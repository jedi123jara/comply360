/**
 * Planificador PURO de cambios del trabajador (sin acceso a base de datos).
 *
 * Vive separado de `apply-worker-change.ts` para poder testearse sin arrastrar
 * prisma. `applyWorkerChange` ejecuta el plan que esta función decide.
 */

export type WorkerStatusValue = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED'

export type WorkerChangeInput =
  | { kind: 'transfer'; newPositionId: string; capacityPct?: number }
  | { kind: 'promote'; newPositionId: string; newSalary?: number; capacityPct?: number }
  | { kind: 'raise'; newSalary: number }
  | { kind: 'suspend' }
  | { kind: 'reactivate' }
  | { kind: 'cese'; fechaCese: string; motivo?: string }

export interface WorkerSnapshot {
  status: WorkerStatusValue
  sueldoBruto: number
}

export interface WorkerChangePlan {
  /** Campos a actualizar en Worker (NO incluye position/department — los espeja mirror). */
  workerData: Record<string, unknown>
  /** Cerrar la asignación titular vigente (cambio de cargo). */
  closeActivePrimary: boolean
  /** Cerrar TODAS las asignaciones vigentes (cese). */
  closeAllAssignments: boolean
  /** Crear una nueva asignación titular en este cargo. */
  assignNewPositionId: string | null
  /** % de dedicación de la nueva asignación. */
  capacityPct: number
  /** Recomputar alertas + score tras la transacción (cuando no hay cambio de cargo). */
  recomputeAfter: boolean
  /** Motivo para el historial. */
  historyReason: string
  /** Si está seteado, el cambio es inválido y no debe ejecutarse. */
  error?: string
}

/**
 * Decide, de forma pura, qué implica un cambio dado el estado actual del worker.
 * No toca la base de datos.
 */
export function planWorkerChange(
  change: WorkerChangeInput,
  current: WorkerSnapshot,
): WorkerChangePlan {
  const base: WorkerChangePlan = {
    workerData: {},
    closeActivePrimary: false,
    closeAllAssignments: false,
    assignNewPositionId: null,
    capacityPct: 100,
    recomputeAfter: false,
    historyReason: '',
  }

  // Un trabajador cesado no admite más cambios (debe reincorporarse por otro flujo).
  if (current.status === 'TERMINATED') {
    return { ...base, error: 'El trabajador está cesado; no admite cambios.' }
  }

  switch (change.kind) {
    case 'transfer':
    case 'promote': {
      if (!change.newPositionId) {
        return { ...base, error: 'Falta el cargo destino.' }
      }
      const workerData: Record<string, unknown> = {}
      if (change.kind === 'promote' && typeof change.newSalary === 'number') {
        if (change.newSalary <= 0) return { ...base, error: 'El sueldo debe ser mayor a 0.' }
        workerData.sueldoBruto = change.newSalary
      }
      return {
        ...base,
        workerData,
        closeActivePrimary: true,
        assignNewPositionId: change.newPositionId,
        capacityPct: change.capacityPct ?? 100,
        historyReason:
          change.kind === 'promote' ? 'Promoción (organigrama)' : 'Cambio de cargo (organigrama)',
      }
    }

    case 'raise': {
      if (typeof change.newSalary !== 'number' || change.newSalary <= 0) {
        return { ...base, error: 'El sueldo debe ser mayor a 0.' }
      }
      if (change.newSalary === current.sueldoBruto) {
        return { ...base, error: 'El sueldo es el mismo; no hay cambio.' }
      }
      return {
        ...base,
        workerData: { sueldoBruto: change.newSalary },
        recomputeAfter: true,
        historyReason: 'Cambio de remuneración (organigrama)',
      }
    }

    case 'suspend': {
      if (current.status === 'SUSPENDED') return { ...base, error: 'El trabajador ya está suspendido.' }
      return {
        ...base,
        workerData: { status: 'SUSPENDED' },
        recomputeAfter: true,
        historyReason: 'Suspensión (organigrama)',
      }
    }

    case 'reactivate': {
      if (current.status === 'ACTIVE') return { ...base, error: 'El trabajador ya está activo.' }
      return {
        ...base,
        workerData: { status: 'ACTIVE' },
        recomputeAfter: true,
        historyReason: 'Reactivación (organigrama)',
      }
    }

    case 'cese': {
      if (!change.fechaCese) return { ...base, error: 'Falta la fecha de cese.' }
      return {
        ...base,
        workerData: {
          status: 'TERMINATED',
          fechaCese: new Date(change.fechaCese),
          motivoCese: change.motivo ?? null,
        },
        closeAllAssignments: true,
        recomputeAfter: true,
        historyReason: 'Cese (organigrama)',
      }
    }

    default:
      return { ...base, error: 'Tipo de cambio no soportado.' }
  }
}
