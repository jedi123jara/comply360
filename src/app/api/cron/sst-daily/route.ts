import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { evaluarReglasSst, type AlertaProyectada } from '@/lib/sst/calendar-engine'
import { notifySstAlert } from '@/lib/sst/push-notifications'
import { withCronIdempotency } from '@/lib/cron/wrap'

// ============================================================
// GET /api/cron/sst-daily
//
// Vercel Cron diario — evalúa reglas SST por organización y crea/actualiza
// alertas en la tabla `WorkerAlert`. Se ejecuta a las 02:00 PET (07:00 UTC).
//
// Reglas evaluadas:
//   - EMO_VENCIDO / EMO_PROXIMO (R.M. 312-2011-MINSA)
//   - IPERC_VENCIDO (revisión anual obligatoria — Ley 29783)
//   - SAT_PLAZO_PROXIMO / SAT_PLAZO_VENCIDO (D.S. 006-2022-TR)
//   - COMITE_MANDATO_VENCE (R.M. 245-2021-TR)
//
// Idempotencia: por cada `fingerprint` (derivado del recurso), si ya existe
// una alerta no resuelta con el mismo type+resourceId, se actualiza en lugar
// de duplicar. Se aprovecha el campo `description` que es libre para guardar
// el fingerprint como prefijo `[fp:XYZ]` (no requiere migración).
//
// Auth: header `Authorization: Bearer ${CRON_SECRET}`.
// ============================================================

const FP_PREFIX = '[sst-fp:'
const FP_SUFFIX = ']'

function wrapDescription(description: string, fingerprint: string): string {
  return `${FP_PREFIX}${fingerprint}${FP_SUFFIX} ${description}`
}

function extractFingerprint(description: string | null): string | null {
  if (!description) return null
  if (!description.startsWith(FP_PREFIX)) return null
  const end = description.indexOf(FP_SUFFIX, FP_PREFIX.length)
  if (end === -1) return null
  return description.slice(FP_PREFIX.length, end)
}

// FIX #5.A: idempotencia diaria. Reemplaza el fingerprint-en-description
// con el helper estándar; el fingerprint sigue siendo el mecanismo
// secundario para cada alerta individual.
export const GET = withCronIdempotency('sst-daily', 1440, async () => {

  const now = new Date()
  const startedAt = Date.now()

  // ── Cargar snapshot global por org ─────────────────────────────────────
  // Hacemos 4 queries planas (no joins por org) y luego agrupamos en memoria.
  // Esto es eficiente si las orgs son pocas y los recursos por org son
  // moderados. Para clientes enterprise grandes se puede paginar por org.

  const [emos, ipercs, accidentes, comites] = await Promise.all([
    prisma.eMO.findMany({
      where: { proximoExamenAntes: { not: null } },
      select: {
        id: true,
        orgId: true,
        workerId: true,
        proximoExamenAntes: true,
      },
    }),
    prisma.iPERCBase.findMany({
      where: { estado: 'VIGENTE', fechaAprobacion: { not: null } },
      select: {
        id: true,
        orgId: true,
        sedeId: true,
        estado: true,
        fechaAprobacion: true,
      },
    }),
    prisma.accidente.findMany({
      where: { satEstado: { in: ['PENDIENTE', 'EN_PROCESO', 'RECHAZADO'] } },
      select: {
        id: true,
        orgId: true,
        workerId: true,
        fechaHora: true,
        plazoLegalHoras: true,
        satEstado: true,
      },
    }),
    prisma.comiteSST.findMany({
      where: { estado: 'VIGENTE' },
      select: {
        id: true,
        orgId: true,
        estado: true,
        mandatoFin: true,
      },
    }),
  ])

  // Agrupar por orgId
  const orgIds = new Set<string>()
  for (const x of emos) orgIds.add(x.orgId)
  for (const x of ipercs) orgIds.add(x.orgId)
  for (const x of accidentes) orgIds.add(x.orgId)
  for (const x of comites) orgIds.add(x.orgId)

  let totalCreated = 0
  let totalUpdated = 0
  let totalReusados = 0
  const orgErrors: { orgId: string; error: string }[] = []

  for (const orgId of orgIds) {
    try {
      const snapshot = {
        emos: emos
          .filter((e) => e.orgId === orgId)
          .map((e) => ({
            id: e.id,
            workerId: e.workerId,
            proximoExamenAntes: e.proximoExamenAntes,
          })),
        ipercBases: ipercs
          .filter((i) => i.orgId === orgId)
          .map((i) => ({
            id: i.id,
            sedeId: i.sedeId,
            estado: i.estado,
            fechaAprobacion: i.fechaAprobacion,
          })),
        accidentes: accidentes
          .filter((a) => a.orgId === orgId)
          .map((a) => ({
            id: a.id,
            workerId: a.workerId,
            fechaHora: a.fechaHora,
            plazoLegalHoras: a.plazoLegalHoras,
            satEstado: a.satEstado,
          })),
        comites: comites
          .filter((c) => c.orgId === orgId)
          .map((c) => ({
            id: c.id,
            estado: c.estado,
            mandatoFin: c.mandatoFin,
          })),
      }

      const proyectadas = evaluarReglasSst(snapshot, now)
      const result = await persistirAlertas(orgId, proyectadas)
      totalCreated += result.creadas
      totalUpdated += result.actualizadas
      totalReusados += result.reusadas
    } catch (e) {
      console.error(`[sst-daily] org ${orgId} failed:`, e)
      orgErrors.push({
        orgId,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  const elapsedMs = Date.now() - startedAt
  console.log(
    `[sst-daily] orgs=${orgIds.size} creadas=${totalCreated} actualizadas=${totalUpdated} reusadas=${totalReusados} errores=${orgErrors.length} ms=${elapsedMs}`,
  )

  return NextResponse.json({
    ok: true,
    runAt: now.toISOString(),
    elapsedMs,
    orgs: orgIds.size,
    creadas: totalCreated,
    actualizadas: totalUpdated,
    reusadas: totalReusados,
    errores: orgErrors,
  })
})

// ── Persistencia idempotente ────────────────────────────────────────────────

interface PersistResult {
  creadas: number
  actualizadas: number
  reusadas: number
}

async function persistirAlertas(
  orgId: string,
  proyectadas: AlertaProyectada[],
): Promise<PersistResult> {
  const result: PersistResult = { creadas: 0, actualizadas: 0, reusadas: 0 }

  // Cargar alertas SST existentes no resueltas para esta org
  const existentes = await prisma.workerAlert.findMany({
    where: {
      orgId,
      resolvedAt: null,
      type: {
        in: [
          'IPERC_VENCIDO',
          'EMO_PROXIMO',
          'EMO_VENCIDO',
          'SAT_PLAZO_PROXIMO',
          'SAT_PLAZO_VENCIDO',
          'COMITE_REUNION_PENDIENTE',
          'COMITE_MANDATO_VENCE',
          'SIMULACRO_PENDIENTE',
        ],
      },
    },
    select: {
      id: true,
      description: true,
      type: true,
      severity: true,
      title: true,
      dueDate: true,
    },
  })

  // Index por fingerprint
  const byFp = new Map<string, (typeof existentes)[number]>()
  for (const e of existentes) {
    const fp = extractFingerprint(e.description)
    if (fp) byFp.set(fp, e)
  }

  // Set de fingerprints proyectados — para detectar alertas a marcar como resueltas
  const proyectadasFps = new Set(proyectadas.map((p) => p.fingerprint))

  for (const p of proyectadas) {
    const existente = byFp.get(p.fingerprint)
    const wrappedDesc = wrapDescription(p.description, p.fingerprint)

    if (!existente) {
      // No existe → crear (requiere workerId; si la alerta no es por worker
      // se asocia al primer worker activo de la org, fallback honesto si
      // no se puede; el modelo WorkerAlert exige workerId).
      let workerId = p.workerId
      if (!workerId) {
        const fallback = await prisma.worker.findFirst({
          where: { orgId, status: 'ACTIVE' },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        })
        if (!fallback) {
          // Si no hay workers, omitimos esta alerta (no hay a quién asociar)
          continue
        }
        workerId = fallback.id
      }

      const created = await prisma.workerAlert.create({
        data: {
          orgId,
          workerId,
          type: p.type as 'EMO_VENCIDO',
          severity: p.severity as 'HIGH',
          title: p.title,
          description: wrappedDesc,
          dueDate: p.dueDate,
        },
      })
      result.creadas++
      // Push push para alertas HIGH/CRITICAL recién creadas
      notifySstAlert({
        alertId: created.id,
        orgId,
        workerId,
        type: created.type,
        severity: created.severity,
        title: created.title,
        description: created.description,
      }).catch(() => undefined)
    } else {
      // Existe — actualizar si cambió título/severidad/dueDate
      const sevChanged = existente.severity !== p.severity
      const titleChanged = existente.title !== p.title
      const dueChanged =
        (existente.dueDate?.getTime() ?? null) !== (p.dueDate?.getTime() ?? null)
      if (sevChanged || titleChanged || dueChanged) {
        await prisma.workerAlert.update({
          where: { id: existente.id },
          data: {
            severity: p.severity as 'HIGH',
            title: p.title,
            description: wrappedDesc,
            dueDate: p.dueDate,
          },
        })
        result.actualizadas++
        // Si la severidad escaló (LOW/MEDIUM → HIGH/CRITICAL), notificar
        const escalated =
          (p.severity === 'CRITICAL' || p.severity === 'HIGH') &&
          existente.severity !== p.severity
        if (escalated) {
          notifySstAlert({
            alertId: existente.id,
            orgId,
            workerId: p.workerId,
            type: p.type as 'EMO_VENCIDO',
            severity: p.severity as 'HIGH',
            title: p.title,
            description: wrappedDesc,
          }).catch(() => undefined)
        }
      } else {
        result.reusadas++
      }
    }
  }

  // Auto-resolver alertas SST cuyo fingerprint ya no está en el snapshot
  // (se cumplió la condición — ej: EMO renovado, accidente notificado, etc.)
  const desaparecidas: string[] = []
  for (const [fp, ex] of byFp.entries()) {
    if (!proyectadasFps.has(fp)) {
      desaparecidas.push(ex.id)
    }
  }
  if (desaparecidas.length > 0) {
    await prisma.workerAlert.updateMany({
      where: { id: { in: desaparecidas } },
      data: { resolvedAt: new Date(), resolvedBy: 'sst-daily-cron' },
    })
  }

  return result
}
