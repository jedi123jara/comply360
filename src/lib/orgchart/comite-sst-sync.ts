/**
 * Espejo organigrama → Comité SST (módulo SST Premium).
 *
 * Cuando el comité SST se arma/asigna en el organigrama, reflejamos sus
 * integrantes en el modelo legal `ComiteSST` / `MiembroComite` (que es la fuente
 * de verdad: mandato, elecciones, actas). Diseño de bajo riesgo:
 *  - SOLO toca el Comité SST (no brigadas/hostigamiento).
 *  - ADD-only: agrega integrantes; NUNCA da de baja a un miembro designado
 *    (eso se hace deliberadamente en el módulo SST).
 *  - Idempotente: respeta el unique (comité, trabajador) y la unicidad de
 *    PRESIDENTE/SECRETARIO (degrada a MIEMBRO si el cargo ya está tomado).
 *  - NO se engancha en `apply-worker-change` (el path frágil); se dispara desde
 *    el flujo controlado del catálogo de comités.
 */
import { prisma } from '@/lib/prisma'
import { calcularFinMandato } from '@/lib/sst/comite-rules'
import { obligacionCubierta } from './comites-obligatorios'
import type { CargoComite, OrigenMiembro } from '@/generated/prisma/client'

/** Mapea el título del cargo del organigrama al cargo/origen del Comité SST. */
export function mapPositionToComiteRole(title: string): {
  cargo: CargoComite
  origen: OrigenMiembro
} {
  const t = title.toLowerCase()
  const cargo: CargoComite = t.includes('presidente')
    ? 'PRESIDENTE'
    : t.includes('secretario')
      ? 'SECRETARIO'
      : 'MIEMBRO'
  const origen: OrigenMiembro = t.includes('empleador')
    ? 'REPRESENTANTE_EMPLEADOR'
    : t.includes('trabajador')
      ? 'REPRESENTANTE_TRABAJADORES'
      : // Sin pista en el nombre (presidente/secretario): default razonable que el
        // usuario puede corregir en el módulo SST.
        cargo === 'PRESIDENTE'
        ? 'REPRESENTANTE_EMPLEADOR'
        : 'REPRESENTANTE_TRABAJADORES'
  return { cargo, origen }
}

export interface ComiteSstReconcileResult {
  skipped: boolean
  reason?: string
  comiteId?: string
  comiteCreated?: boolean
  membersAdded?: number
}

/**
 * Reconcilia el ComiteSST de la org a partir de la unidad del organigrama que
 * representa el comité SST: ubica o crea+enlaza el ComiteSST, y agrega como
 * MiembroComite a los trabajadores asignados a los cargos de esa unidad.
 */
export async function reconcileComiteSstFromOrgUnit(
  orgId: string,
  orgUnitId: string,
): Promise<ComiteSstReconcileResult> {
  const unit = await prisma.orgUnit.findFirst({
    where: { id: orgUnitId, orgId },
    select: { id: true, name: true },
  })
  if (!unit) return { skipped: true, reason: 'unit-not-found' }
  // Solo el Comité SST se espeja al módulo SST Premium.
  if (!obligacionCubierta('sst', [unit.name])) {
    return { skipped: true, reason: 'not-sst-committee' }
  }

  // 1) Ubicar (por enlace) o, si no, el VIGENTE; crear si no hay ninguno.
  let comite = await prisma.comiteSST.findFirst({
    where: { orgId, orgUnitId },
    select: { id: true, orgUnitId: true },
  })
  let comiteCreated = false
  if (!comite) {
    const vigente = await prisma.comiteSST.findFirst({
      where: { orgId, estado: 'VIGENTE' },
      select: { id: true, orgUnitId: true },
    })
    if (vigente) {
      // Enlazar el vigente a esta unidad solo si no estaba enlazado a otra.
      if (vigente.orgUnitId != null && vigente.orgUnitId !== orgUnitId) {
        return { skipped: true, reason: 'comite-linked-to-other-unit', comiteId: vigente.id }
      }
      if (vigente.orgUnitId == null) {
        await prisma.comiteSST.update({ where: { id: vigente.id }, data: { orgUnitId } })
      }
      comite = vigente
    } else {
      const inicio = new Date()
      comite = await prisma.comiteSST.create({
        data: {
          orgId,
          mandatoInicio: inicio,
          mandatoFin: calcularFinMandato(inicio),
          estado: 'VIGENTE',
          orgUnitId,
        },
        select: { id: true, orgUnitId: true },
      })
      comiteCreated = true
    }
  }

  // 2) Cargos de la unidad + asignados activos.
  const positions = await prisma.orgPosition.findMany({
    where: { orgUnitId, validTo: null },
    select: { id: true, title: true },
  })
  if (positions.length === 0) {
    return { skipped: false, comiteId: comite.id, comiteCreated, membersAdded: 0 }
  }
  const titleByPos = new Map(positions.map((p) => [p.id, p.title]))
  const assignments = await prisma.orgAssignment.findMany({
    where: { positionId: { in: positions.map((p) => p.id) }, endedAt: null },
    select: { workerId: true, positionId: true },
  })

  // 3) Miembros activos actuales (para idempotencia + cargos tomados).
  const current = await prisma.miembroComite.findMany({
    where: { comiteId: comite.id, fechaBaja: null },
    select: { workerId: true, cargo: true },
  })
  const memberWorkerIds = new Set(current.map((m) => m.workerId))
  const takenCargo = new Set<CargoComite>(current.map((m) => m.cargo))

  // 4) ADD-only: agregar a los asignados que aún no son miembros.
  let membersAdded = 0
  for (const a of assignments) {
    if (memberWorkerIds.has(a.workerId)) continue
    const mapped = mapPositionToComiteRole(titleByPos.get(a.positionId) ?? '')
    let cargo = mapped.cargo
    if ((cargo === 'PRESIDENTE' || cargo === 'SECRETARIO') && takenCargo.has(cargo)) {
      cargo = 'MIEMBRO'
    }
    try {
      await prisma.miembroComite.create({
        data: { comiteId: comite.id, workerId: a.workerId, cargo, origen: mapped.origen },
      })
      memberWorkerIds.add(a.workerId)
      if (cargo === 'PRESIDENTE' || cargo === 'SECRETARIO') takenCargo.add(cargo)
      membersAdded++
    } catch {
      // Idempotente: choque con unique (comité, trabajador) por carrera → ignorar.
    }
  }

  return { skipped: false, comiteId: comite.id, comiteCreated, membersAdded }
}
