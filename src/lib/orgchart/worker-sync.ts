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
