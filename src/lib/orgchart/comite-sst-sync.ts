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
 *  - Resistente a carreras: enlace atómico (updateMany compare-and-set), y el
 *    create tolera P2002 (otra reconcile concurrente) re-consultando.
 *  - No auto-crea un comité si hay uno EN_ELECCION (no pisamos una elección).
 *  - NO se engancha en `apply-worker-change` (el path frágil); se dispara desde
 *    el flujo controlado del catálogo de comités.
 */
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { calcularFinMandato } from '@/lib/sst/comite-rules'
import { obligacionCubierta } from './comites-obligatorios'
import type { CargoComite, OrigenMiembro } from '@/generated/prisma/client'

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
}

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

  // 1) Resolver el comité: por enlace → VIGENTE/EN_ELECCION → crear.
  let comiteId: string | null = null
  let comiteCreated = false

  const linked = await prisma.comiteSST.findFirst({
    where: { orgId, orgUnitId },
    select: { id: true },
  })
  if (linked) {
    comiteId = linked.id
  } else {
    // La unidad SST del organigrama mapea al Comité PRINCIPAL del empleador
    // (sedeId NULL), no a un subcomité de sede.
    const occupied = await prisma.comiteSST.findFirst({
      where: { orgId, sedeId: null, estado: { in: ['VIGENTE', 'EN_ELECCION'] } },
      select: { id: true, estado: true, orgUnitId: true },
    })
    if (occupied?.estado === 'EN_ELECCION') {
      // No pisamos una elección en curso.
      return { skipped: true, reason: 'comite-en-eleccion', comiteId: occupied.id }
    }
    if (occupied) {
      if (occupied.orgUnitId != null && occupied.orgUnitId !== orgUnitId) {
        return { skipped: true, reason: 'comite-linked-to-other-unit', comiteId: occupied.id }
      }
      // Enlace ATÓMICO: solo enlaza si sigue sin enlazar (compare-and-set).
      if (occupied.orgUnitId == null) {
        await prisma.comiteSST.updateMany({
          where: { id: occupied.id, orgUnitId: null },
          data: { orgUnitId },
        })
      }
      comiteId = occupied.id
    } else {
      // Crear. Si otra reconcile concurrente ya lo creó (mismo orgUnitId único),
      // el create lanza P2002 → re-consultamos por enlace.
      try {
        const inicio = new Date()
        const created = await prisma.comiteSST.create({
          data: {
            orgId,
            mandatoInicio: inicio,
            mandatoFin: calcularFinMandato(inicio),
            estado: 'VIGENTE',
            orgUnitId,
            sedeId: null, // Comité principal del empleador.
          },
          select: { id: true },
        })
        comiteId = created.id
        comiteCreated = true
      } catch (e) {
        if (!isUniqueViolation(e)) throw e
        const again = await prisma.comiteSST.findFirst({
          where: { orgId, orgUnitId },
          select: { id: true },
        })
        if (!again) throw e
        comiteId = again.id
      }
    }
  }

  if (!comiteId) return { skipped: true, reason: 'no-comite' }

  // 2) Cargos de la unidad + asignados activos.
  const positions = await prisma.orgPosition.findMany({
    where: { orgUnitId, validTo: null },
    select: { id: true, title: true },
  })
  if (positions.length === 0) {
    return { skipped: false, comiteId, comiteCreated, membersAdded: 0 }
  }
  const titleByPos = new Map(positions.map((p) => [p.id, p.title]))
  const assignments = await prisma.orgAssignment.findMany({
    where: { positionId: { in: positions.map((p) => p.id) }, endedAt: null },
    select: { workerId: true, positionId: true },
  })

  // 3) Miembros activos actuales (para idempotencia + cargos tomados).
  const current = await prisma.miembroComite.findMany({
    where: { comiteId, fechaBaja: null },
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
      console.warn(
        `[comite-sst-sync] cargo ${cargo} ya ocupado en comité ${comiteId}; el trabajador entra como MIEMBRO`,
      )
      cargo = 'MIEMBRO'
    }
    try {
      await prisma.miembroComite.create({
        data: { comiteId, workerId: a.workerId, cargo, origen: mapped.origen },
      })
      memberWorkerIds.add(a.workerId)
      if (cargo === 'PRESIDENTE' || cargo === 'SECRETARIO') takenCargo.add(cargo)
      membersAdded++
    } catch (e) {
      // P2002 = unique (comité, trabajador) → idempotente, lo ignoramos.
      if (isUniqueViolation(e)) continue
      // Cualquier otro error (FK huérfana, etc.) NO se traga en silencio.
      console.error(
        `[comite-sst-sync] no se pudo crear MiembroComite (worker ${a.workerId}, comité ${comiteId}):`,
        e,
      )
    }
  }

  return { skipped: false, comiteId, comiteCreated, membersAdded }
}
