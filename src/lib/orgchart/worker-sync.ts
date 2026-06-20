/**
 * Sincronización Organigrama ↔ Trabajador.
 *
 * El organigrama (OrgAssignment → OrgPosition → OrgUnit) y el módulo de
 * Trabajadores (Worker.position/department/status) son dos representaciones del
 * MISMO hecho. Históricamente vivían desconectados ("write-isolated"). Estos
 * helpers mantienen la consistencia mínima ante eventos del ciclo de vida del
 * trabajador, para que un cambio en un lado se refleje en el otro.
 *
 * Son best-effort e idempotentes: se llaman como side-effect de las mutaciones
 * de dominio y no deben romper el flujo principal si fallan.
 */
import { prisma } from '@/lib/prisma'
import { generateWorkerAlerts } from '@/lib/alerts/alert-engine'
import { syncComplianceScore } from '@/lib/compliance/sync-score'

/**
 * Cierra las asignaciones VIGENTES del trabajador en el organigrama (setea
 * `endedAt`). Se llama al CESAR a un trabajador: si no se cierra, el cargo
 * sigue contando como ocupado ("asiento fantasma") y bloquea asignar al
 * reemplazo. Idempotente: solo toca asignaciones con `endedAt` null.
 *
 * @returns cuántas asignaciones se cerraron.
 */
export async function closeWorkerOrgAssignments(
  workerId: string,
  endedAt: Date = new Date(),
): Promise<number> {
  const res = await prisma.orgAssignment.updateMany({
    where: { workerId, endedAt: null },
    data: { endedAt },
  })
  return res.count
}

/**
 * Espeja el cargo TITULAR del organigrama al perfil del trabajador: setea
 * `Worker.position` = título del cargo y `Worker.department` = nombre de su área.
 * Así el organigrama es la fuente del puesto y el resto de la plataforma (perfil
 * clásico, planilla, filtros, búsqueda) lo refleja sin doble digitación.
 * Best-effort.
 */
export async function mirrorPrimaryAssignmentToWorker(
  workerId: string,
  positionId: string,
): Promise<void> {
  const position = await prisma.orgPosition.findUnique({
    where: { id: positionId },
    select: { title: true, orgUnitId: true },
  })
  if (!position) return
  const unit = await prisma.orgUnit.findUnique({
    where: { id: position.orgUnitId },
    select: { name: true },
  })
  const before = await prisma.worker.findUnique({
    where: { id: workerId },
    select: { orgId: true, position: true, department: true },
  })
  if (!before) return

  const nextDepartment = unit?.name ?? before.department ?? null
  // No-op si el perfil ya refleja este cargo → evita churn de alertas/score.
  if (before.position === position.title && before.department === nextDepartment) return

  await prisma.worker.update({
    where: { id: workerId },
    data: {
      position: position.title,
      department: nextDepartment ?? undefined,
    },
  })

  // Propagar como lo hace PUT /api/workers/[id]: recomputar alertas + score.
  // Best-effort: un fallo aquí no debe romper la mutación del organigrama.
  try {
    await generateWorkerAlerts(workerId)
  } catch (err) {
    console.error('[worker-sync] generateWorkerAlerts falló', err)
  }
  syncComplianceScore(before.orgId).catch(() => {})
}

/**
 * Re-sincroniza el perfil del trabajador tras CERRAR una asignación titular: si
 * le queda otra titular vigente, espeja ese cargo; si no le queda ninguna, deja
 * `Worker.position/department` como están (pudieron setearse manualmente fuera
 * del organigrama — no los borramos). Best-effort.
 */
export async function resyncWorkerPrimaryFromOrgChart(workerId: string): Promise<void> {
  const primary = await prisma.orgAssignment.findFirst({
    where: { workerId, isPrimary: true, endedAt: null },
    orderBy: { startedAt: 'desc' },
    select: { positionId: true },
  })
  if (primary) {
    await mirrorPrimaryAssignmentToWorker(workerId, primary.positionId)
  }
}
