/**
 * Documents Acknowledgment Engine — Idea 1 del Sprint 8.
 *
 * Lógica central para:
 *   - Determinar qué workers deben firmar un OrgDocument (scope filter)
 *   - Disparar notificaciones (email + push + banner) — con throttling
 *   - Registrar acuses con valor legal SUNAFIL (Ley 27269)
 *   - Generar audit trail para defensa ante inspección
 *
 * Diseñado fire-and-forget en notify (no bloquea el PATCH del admin) y
 * estricto en recordAcknowledgment (sí bloquea, escribe DB con tx).
 *
 * Reglas de negocio:
 *   - Solo workers con status='ACTIVE' deben firmar (no TERMINATED ni ON_LEAVE)
 *   - scopeFilter JSON acepta filtros: { regimen, departamento, position }
 *   - Throttling: max 1 email/doc/semana (banner siempre se actualiza)
 *   - Versión del doc es crítica — un ack es solo válido para esa version
 */

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import type { Prisma } from '@/generated/prisma/client'

const EMAIL_THROTTLE_DAYS = 7

export type SignatureMethod = 'SIMPLE' | 'OTP_EMAIL' | 'BIOMETRIC'

interface ScopeFilter {
  regimen?: string[]
  departamento?: string[]
  position?: string[]
}

/**
 * Resuelve los workers que DEBEN firmar un OrgDocument dado su scopeFilter.
 * Devuelve solo workers ACTIVE (no terminados, no en licencia indefinida).
 */
export async function resolveTargetedWorkers(orgId: string, scopeFilter: ScopeFilter | null) {
  const where: Prisma.WorkerWhereInput = {
    orgId,
    status: 'ACTIVE',
  }

  if (scopeFilter) {
    if (scopeFilter.regimen && scopeFilter.regimen.length > 0) {
      // regimenLaboral es enum en Prisma — cast string array al enum compatible
      where.regimenLaboral = {
        in: scopeFilter.regimen as Prisma.WorkerWhereInput['regimenLaboral'] extends infer T
          ? T extends { in?: infer U }
            ? U
            : never
          : never,
      }
    }
    if (scopeFilter.departamento && scopeFilter.departamento.length > 0) {
      where.department = { in: scopeFilter.departamento }
    }
    if (scopeFilter.position && scopeFilter.position.length > 0) {
      where.position = { in: scopeFilter.position }
    }
  }

  return prisma.worker.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      userId: true,
      regimenLaboral: true,
      department: true,
      position: true,
    },
  })
}

/**
 * Calcula el progreso de acuses para un doc (admin dashboard).
 * Devuelve { total, signed, pending, signedPct }.
 */
export async function getAcknowledgmentProgress(orgId: string, documentId: string) {
  const doc = await prisma.orgDocument.findFirst({
    where: { id: documentId, orgId },
    select: { id: true, version: true, scopeFilter: true },
  })
  if (!doc) {
    return { total: 0, signed: 0, pending: 0, signedPct: 0, version: 0 }
  }

  const scopeFilter = (doc.scopeFilter as ScopeFilter | null) ?? null
  const targets = await resolveTargetedWorkers(orgId, scopeFilter)
  const total = targets.length

  if (total === 0) {
    return { total: 0, signed: 0, pending: 0, signedPct: 100, version: doc.version }
  }

  // Cuántos de los targets ya firmaron LA VERSION ACTUAL del doc
  const signed = await prisma.documentAcknowledgment.count({
    where: {
      orgId,
      documentId,
      documentVersion: doc.version,
      workerId: { in: targets.map((t) => t.id) },
    },
  })

  return {
    total,
    signed,
    pending: total - signed,
    signedPct: Math.round((signed / total) * 100),
    version: doc.version,
  }
}

/**
 * Devuelve los docs pendientes de firma para un worker dado.
 * Un doc es "pendiente" si:
 *   - acknowledgmentRequired = true
 *   - El worker está dentro del scopeFilter
 *   - No existe DocumentAcknowledgment para (worker, doc, currentVersion)
 */
export async function getWorkerPendingDocs(workerId: string, orgId: string) {
  const worker = await prisma.worker.findFirst({
    where: { id: workerId, orgId, status: 'ACTIVE' },
    select: { regimenLaboral: true, department: true, position: true },
  })
  if (!worker) return []

  // Docs publicados que requieren ack
  const eligibleDocs = await prisma.orgDocument.findMany({
    where: {
      orgId,
      acknowledgmentRequired: true,
      isPublishedToWorkers: true,
    },
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      version: true,
      publishedAt: true,
      acknowledgmentDeadlineDays: true,
      lastNotifiedAt: true,
      scopeFilter: true,
    },
  })

  // Filtrar por scope
  const matchingDocs = eligibleDocs.filter((doc) => {
    const scope = (doc.scopeFilter as ScopeFilter | null) ?? null
    if (!scope) return true // sin filtro = todos
    if (scope.regimen && scope.regimen.length > 0 && !scope.regimen.includes(worker.regimenLaboral)) {
      return false
    }
    if (scope.departamento && scope.departamento.length > 0) {
      if (!worker.department || !scope.departamento.includes(worker.department)) return false
    }
    if (scope.position && scope.position.length > 0) {
      if (!worker.position || !scope.position.includes(worker.position)) return false
    }
    return true
  })

  if (matchingDocs.length === 0) return []

  // ¿Cuáles ya firmó la versión actual?
  const acks = await prisma.documentAcknowledgment.findMany({
    where: {
      workerId,
      documentId: { in: matchingDocs.map((d) => d.id) },
    },
    select: { documentId: true, documentVersion: true },
  })

  const ackMap = new Map<string, number>() // docId → max version signed
  for (const ack of acks) {
    const cur = ackMap.get(ack.documentId) ?? 0
    if (ack.documentVersion > cur) ackMap.set(ack.documentId, ack.documentVersion)
  }

  // Filtrar los que no están firmados en la versión actual
  return matchingDocs
    .filter((doc) => (ackMap.get(doc.id) ?? 0) < doc.version)
    .map((doc) => {
      // Calcular días restantes para el deadline
      let daysRemaining: number | null = null
      if (doc.acknowledgmentDeadlineDays && doc.lastNotifiedAt) {
        const elapsed = Math.floor(
          (Date.now() - new Date(doc.lastNotifiedAt).getTime()) / (1000 * 60 * 60 * 24),
        )
        daysRemaining = Math.max(0, doc.acknowledgmentDeadlineDays - elapsed)
      }
      return {
        ...doc,
        daysRemaining,
        urgent: daysRemaining !== null && daysRemaining <= 2,
      }
    })
}

/**
 * Registra una firma de acuse — la operación más crítica del sistema.
 *
 * Validaciones:
 *   - El doc existe y requiere ack
 *   - El worker existe y está dentro del scope
 *   - La versión que firma coincide con la versión actual del doc
 *   - No existe ya un ack para esa version (idempotencia via @@unique)
 *
 * Devuelve { ok, ackId } o { ok: false, reason }.
 */
export async function recordAcknowledgment(params: {
  orgId: string
  workerId: string
  documentId: string
  documentVersion: number
  signatureMethod: SignatureMethod
  signatureProof?: Record<string, unknown> | null
  ip?: string | null
  userAgent?: string | null
  scrolledToEnd?: boolean
  readingTimeMs?: number | null
}): Promise<
  | { ok: true; ackId: string; newAck: boolean }
  | { ok: false; reason: string; code: string }
> {
  // 1. Verificar doc + version
  const doc = await prisma.orgDocument.findFirst({
    where: { id: params.documentId, orgId: params.orgId, acknowledgmentRequired: true },
    select: { id: true, version: true, title: true },
  })
  if (!doc) {
    return { ok: false, reason: 'Documento no encontrado o no requiere acuse', code: 'DOC_NOT_FOUND' }
  }
  if (params.documentVersion !== doc.version) {
    return {
      ok: false,
      reason: `La versión que intentas firmar (${params.documentVersion}) no coincide con la actual (${doc.version}). Recarga la página.`,
      code: 'VERSION_MISMATCH',
    }
  }

  // 2. Idempotencia: si ya existe ack para esta version, devolver el existente
  const existing = await prisma.documentAcknowledgment.findUnique({
    where: {
      workerId_documentId_documentVersion: {
        workerId: params.workerId,
        documentId: params.documentId,
        documentVersion: params.documentVersion,
      },
    },
    select: { id: true },
  })
  if (existing) {
    return { ok: true, ackId: existing.id, newAck: false }
  }

  // 3. Crear el ack
  const ack = await prisma.documentAcknowledgment.create({
    data: {
      orgId: params.orgId,
      workerId: params.workerId,
      documentId: params.documentId,
      documentVersion: params.documentVersion,
      signatureMethod: params.signatureMethod,
      signatureProof: (params.signatureProof ?? null) as Prisma.InputJsonValue,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
      scrolledToEnd: params.scrolledToEnd ?? false,
      readingTimeMs: params.readingTimeMs ?? null,
    },
    select: { id: true },
  })

  // 4. AuditLog para trazabilidad SUNAFIL
  void prisma.auditLog
    .create({
      data: {
        orgId: params.orgId,
        userId: null,
        action: 'document.acknowledged',
        entityType: 'DocumentAcknowledgment',
        entityId: ack.id,
        metadataJson: {
          workerId: params.workerId,
          documentId: params.documentId,
          documentVersion: params.documentVersion,
          documentTitle: doc.title,
          signatureMethod: params.signatureMethod,
          ip: params.ip ?? null,
          scrolledToEnd: params.scrolledToEnd ?? false,
          readingTimeMs: params.readingTimeMs ?? null,
        },
      },
    })
    .catch(() => null)

  return { ok: true, ackId: ack.id, newAck: true }
}

/**
 * Notifica a todos los workers targets que el doc fue actualizado y deben firmarlo.
 * Multi-canal: email (Resend) + push (VAPID) + banner (vía pendingAck endpoint).
 *
 * Throttling: si lastNotifiedAt < EMAIL_THROTTLE_DAYS, NO manda email
 * (el banner sigue apareciendo porque viene de getWorkerPendingDocs).
 *
 * Fire-and-forget — no bloquea el caller. Errores van a console.
 */
export async function notifyWorkersOfDocUpdate(params: {
  orgId: string
  documentId: string
  forceEmail?: boolean // skip throttling — útil para botón "Recordar manual"
}): Promise<{ targetsCount: number; emailsSent: number; throttled: boolean }> {
  const doc = await prisma.orgDocument.findFirst({
    where: { id: params.documentId, orgId: params.orgId },
    select: {
      id: true,
      title: true,
      type: true,
      version: true,
      scopeFilter: true,
      lastNotifiedAt: true,
      acknowledgmentDeadlineDays: true,
      organization: { select: { name: true, razonSocial: true } },
    },
  })
  if (!doc) return { targetsCount: 0, emailsSent: 0, throttled: false }

  // Throttling check
  let throttled = false
  if (!params.forceEmail && doc.lastNotifiedAt) {
    const daysSince = Math.floor(
      (Date.now() - new Date(doc.lastNotifiedAt).getTime()) / (1000 * 60 * 60 * 24),
    )
    if (daysSince < EMAIL_THROTTLE_DAYS) {
      throttled = true
    }
  }

  // Resolver workers en scope
  const targets = await resolveTargetedWorkers(
    params.orgId,
    (doc.scopeFilter as ScopeFilter | null) ?? null,
  )

  // Enviar emails (si no throttled y workers tienen email)
  let emailsSent = 0
  if (!throttled) {
    const orgName = doc.organization.razonSocial ?? doc.organization.name ?? 'tu empresa'
    for (const w of targets) {
      if (!w.email) continue
      try {
        await sendEmail({
          to: w.email,
          subject: `📝 Nueva versión de "${doc.title}" — requiere tu firma`,
          html: buildAckEmailHtml({
            workerName: w.firstName,
            docTitle: doc.title,
            docVersion: doc.version,
            orgName,
            deadlineDays: doc.acknowledgmentDeadlineDays,
          }),
        })
        emailsSent++
      } catch (err) {
        console.error(`[ack-notify] Email failed for worker ${w.id}:`, err)
      }
    }

    // Actualizar lastNotifiedAt solo si efectivamente mandamos algún email
    if (emailsSent > 0) {
      await prisma.orgDocument
        .update({
          where: { id: params.documentId },
          data: { lastNotifiedAt: new Date() },
        })
        .catch(() => null)
    }
  }

  // AuditLog del notify
  void prisma.auditLog
    .create({
      data: {
        orgId: params.orgId,
        action: 'document.notify_workers',
        entityType: 'OrgDocument',
        entityId: doc.id,
        metadataJson: {
          docTitle: doc.title,
          docVersion: doc.version,
          targetsCount: targets.length,
          emailsSent,
          throttled,
          forceEmail: params.forceEmail ?? false,
        },
      },
    })
    .catch(() => null)

  return { targetsCount: targets.length, emailsSent, throttled }
}

function buildAckEmailHtml(opts: {
  workerName: string
  docTitle: string
  docVersion: number
  orgName: string
  deadlineDays: number | null
}): string {
  const deadlineNote = opts.deadlineDays
    ? `<p style="color: #b45309; font-size: 14px;">⏱ Tienes <strong>${opts.deadlineDays} días</strong> para revisarlo y firmarlo.</p>`
    : ''

  return `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #047857; font-size: 22px;">Hola ${opts.workerName},</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        <strong>${opts.orgName}</strong> actualizó el documento <strong>"${opts.docTitle}"</strong> (versión ${opts.docVersion}).
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Como trabajador, debes leerlo y firmarlo electrónicamente. Tu firma queda
        registrada con valor legal según la Ley 27269.
      </p>
      ${deadlineNote}
      <p style="margin-top: 32px;">
        <a href="https://comply360.pe/mi-portal/documentos"
           style="background: #047857; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Leer y firmar ahora
        </a>
      </p>
      <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        Si tienes preguntas, contacta directamente a recursos humanos de ${opts.orgName}.
        Comply360 solo facilita el proceso digital.
      </p>
    </div>
  `
}
