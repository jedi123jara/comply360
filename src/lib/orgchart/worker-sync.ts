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
  await prisma.worker.update({
    where: { id: workerId },
    data: {
      position: position.title,
      department: unit?.name ?? undefined,
    },
  })
}
