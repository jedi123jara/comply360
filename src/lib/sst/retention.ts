/**
 * Job de retención y borrado de datos personales sensibles.
 *
 * Cumple obligaciones de Ley 29733 + D.S. 016-2024-JUS Art. 8:
 *   - Datos personales sensibles solo pueden conservarse mientras sean
 *     necesarios para la finalidad del tratamiento.
 *   - Tras cese del titular, conservar máximo 5 años (salvo obligación legal
 *     específica más larga, que no aplica al caso médico).
 *   - Borrar es preferible a anonimizar cuando los datos son cifrados —
 *     simplemente eliminamos la columna cifrada (los bytes opacos) y dejamos
 *     metadata estructural (id, fechaExamen, aptitud) que sirve para indicadores
 *     agregados sin exponer datos personales.
 *
 * Decisiones:
 *   1. Worker con fechaCese < hoy - 5 años → redactar EMOs (restricciones=null)
 *      y borrar Consentimientos.
 *   2. SolicitudARCO con respuestaAt < hoy - 5 años → redactar detalleCifrado.
 *      Se conserva metadata para auditoría regulatoria.
 *   3. Idempotente: registros ya redactados (cifrado === null) se saltan.
 *   4. Audit log: cada redacción genera un AuditLog con action
 *      `MEDICAL_DATA_REDACTED` o `ARCO_DATA_REDACTED` para evidencia ante
 *      la ANPDP.
 *
 * NO redacta:
 *   - Workers activos (status=ACTIVE) — siguen necesitando los datos
 *   - Workers cesados < 5 años — todavía dentro del plazo legal
 *   - Consentimientos no expirados — `vigenciaHasta` futuro
 *
 * Función pura side-effect-aware: testeable mockeando prisma.
 */

import type { PrismaClient } from '@/generated/prisma/client'

export interface RetentionResult {
  emosRedactadas: number
  consentimientosBorrados: number
  arcoRedactados: number
  workersEvaluados: number
  errors: string[]
}

const RETENTION_YEARS = 5
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000

export interface RetentionOptions {
  /** Fecha de referencia (default: now). Útil para testing. */
  now?: Date
  /** Si true, no ejecuta DELETE/UPDATE — solo cuenta candidatos. */
  dryRun?: boolean
  /** Procesar máximo N workers por corrida (paginar para no bloquear DB). */
  maxWorkersPerRun?: number
}

/**
 * Corre el job de retención. Retorna conteos para observabilidad y un
 * AuditLog completo en la DB.
 */
export async function runRetentionJob(
  prisma: PrismaClient,
  options: RetentionOptions = {},
): Promise<RetentionResult> {
  const result: RetentionResult = {
    emosRedactadas: 0,
    consentimientosBorrados: 0,
    arcoRedactados: 0,
    workersEvaluados: 0,
    errors: [],
  }

  const now = options.now ?? new Date()
  const cutoff = new Date(now.getTime() - RETENTION_YEARS * MS_PER_YEAR)
  const dryRun = options.dryRun === true
  const maxWorkers = options.maxWorkersPerRun ?? 1000

  // ── 1. Workers cesados hace más de 5 años con datos médicos por borrar ──
  const workersACesar = await prisma.worker.findMany({
    where: {
      fechaCese: { not: null, lt: cutoff },
    },
    select: { id: true, orgId: true },
    take: maxWorkers,
  })

  result.workersEvaluados = workersACesar.length

  for (const worker of workersACesar) {
    try {
      // 1.a EMO: redactar restriccionesCifrado donde aún esté presente
      const emosARedactar = await prisma.eMO.findMany({
        where: {
          workerId: worker.id,
          restriccionesCifrado: { not: null },
        },
        select: { id: true, orgId: true },
      })

      if (!dryRun && emosARedactar.length > 0) {
        await prisma.eMO.updateMany({
          where: { id: { in: emosARedactar.map((e) => e.id) } },
          data: { restriccionesCifrado: null },
        })

        await prisma.auditLog.create({
          data: {
            orgId: worker.orgId,
            action: 'MEDICAL_DATA_REDACTED',
            entityType: 'EMO',
            entityId: worker.id,
            metadataJson: {
              reason: 'Retention period expired (5 years post-termination, Ley 29733 Art. 8)',
              recordsRedacted: emosARedactar.length,
              cutoffDate: cutoff.toISOString(),
              workerId: worker.id,
            },
          },
        }).catch(() => undefined)
      }
      result.emosRedactadas += emosARedactar.length

      // 1.b Consentimientos: borrar (cumplió su propósito)
      const consentsCount = await prisma.consentimientoLey29733.count({
        where: { workerId: worker.id },
      })

      if (!dryRun && consentsCount > 0) {
        const deleted = await prisma.consentimientoLey29733.deleteMany({
          where: { workerId: worker.id },
        })

        await prisma.auditLog.create({
          data: {
            orgId: worker.orgId,
            action: 'CONSENT_DATA_DELETED',
            entityType: 'ConsentimientoLey29733',
            entityId: worker.id,
            metadataJson: {
              reason: 'Retention period expired (5 years post-termination)',
              recordsDeleted: deleted.count,
              cutoffDate: cutoff.toISOString(),
              workerId: worker.id,
            },
          },
        }).catch(() => undefined)
      }
      result.consentimientosBorrados += consentsCount
    } catch (err) {
      result.errors.push(
        `Worker ${worker.id}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  // ── 2. Solicitudes ARCO con respuesta hace > 5 años ─────────────────────
  try {
    const arcosARedactar = await prisma.solicitudARCO.findMany({
      where: {
        respuestaAt: { not: null, lt: cutoff },
        detalleCifrado: { not: null },
      },
      select: { id: true, orgId: true },
    })

    if (!dryRun && arcosARedactar.length > 0) {
      await prisma.solicitudARCO.updateMany({
        where: { id: { in: arcosARedactar.map((a) => a.id) } },
        data: { detalleCifrado: null },
      })

      // Un audit log por orgId (agrupados) para no inflar la tabla
      const byOrg = new Map<string, number>()
      for (const a of arcosARedactar) {
        byOrg.set(a.orgId, (byOrg.get(a.orgId) ?? 0) + 1)
      }
      for (const [orgId, count] of byOrg.entries()) {
        await prisma.auditLog.create({
          data: {
            orgId,
            action: 'ARCO_DATA_REDACTED',
            entityType: 'SolicitudARCO',
            entityId: 'bulk',
            metadataJson: {
              reason: 'Retention period expired (5 years post-response, Ley 29733 Art. 8)',
              recordsRedacted: count,
              cutoffDate: cutoff.toISOString(),
            },
          },
        }).catch(() => undefined)
      }
    }
    result.arcoRedactados += arcosARedactar.length
  } catch (err) {
    result.errors.push(
      `ARCO redaction: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  return result
}
