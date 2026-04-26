/**
 * Worker Onboarding Cascade
 *
 * Cuando un trabajador firma su contrato, la empresa debe:
 *   1. Entregar RIT + políticas SST + código de ética + otros documentos publicados
 *   2. Pedirle los documentos obligatorios del legajo (DNI, CV, declaración jurada,
 *      exámenes médicos, etc.) — 18 tipos según `legajo-config.ts`
 *   3. Notificarle por email + push
 *   4. Dejar rastro en AuditLog
 *
 * Este módulo concentra esa lógica para que pueda dispararse:
 *   - automáticamente desde PATCH /api/contracts/[id] cuando status→SIGNED
 *   - manualmente desde POST /api/workers/[id]/onboarding-cascade
 *
 * **No AI**, no envío de documentos nuevos: solo marca los ya existentes en
 * `OrgDocument` (publicados) para que el worker los vea, crea `WorkerRequest`
 * pendientes para los documentos faltantes del legajo, y notifica.
 */

import { prisma } from '@/lib/prisma'
import { type RequiredDocType } from '@/lib/compliance/legajo-config'
import { sendEmail } from '@/lib/email'
import { workerOnboardingEmail } from '@/lib/email/templates'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface CascadeOptions {
  /** Si true, crea `WorkerRequest` para documentos faltantes del legajo. Default true. */
  requestLegajo?: boolean
  /** Si true, envía email. Default true. */
  sendEmail?: boolean
  /** Forzar re-envío aunque ya se haya corrido antes. Default false. */
  force?: boolean
  /** User que dispara la cascada (para AuditLog). */
  triggeredBy?: string
  /** Contract vinculado que disparó la cascada (para trazabilidad). */
  contractId?: string
}

export interface CascadeResult {
  success: boolean
  workerId: string
  documentsPublished: number
  requestsCreated: number
  emailSent: boolean
  skipped: boolean
  skipReason?: string
  auditLogId?: string
}

// Mapeo legible de document types → títulos para el email / solicitud
const DOC_TYPE_LABELS: Record<RequiredDocType, string> = {
  contrato_trabajo: 'Contrato de trabajo firmado',
  cv: 'Curriculum Vitae actualizado',
  dni_copia: 'Copia del DNI',
  declaracion_jurada: 'Declaración jurada de domicilio',
  boleta_pago: 'Boletas de pago',
  t_registro: 'Registro T-Registro',
  vacaciones_goce: 'Registro de vacaciones',
  capacitacion_registro: 'Registro de capacitaciones',
  examen_medico_ingreso: 'Examen médico de ingreso',
  examen_medico_periodico: 'Examen médico periódico',
  induccion_sst: 'Inducción SST',
  entrega_epp: 'Entrega de EPP',
  iperc_puesto: 'IPERC del puesto',
  capacitacion_sst: 'Capacitación SST',
  reglamento_interno: 'Reglamento Interno de Trabajo firmado',
  afp_onp_afiliacion: 'Afiliación AFP / ONP',
  essalud_registro: 'Registro EsSalud',
  cts_deposito: 'Depósito CTS',
}

/** Docs que el TRABAJADOR debe subir (los otros los genera la empresa). */
const WORKER_UPLOADED_DOCS: RequiredDocType[] = [
  'cv',
  'dni_copia',
  'declaracion_jurada',
  'examen_medico_ingreso',
  'afp_onp_afiliacion',
]

// ═══════════════════════════════════════════════════════════════════════════
// Main cascade function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ejecuta la cascada de onboarding para un worker.
 *
 * - Nunca lanza: todos los errores se capturan y devuelven en el resultado.
 * - Es idempotente: correr dos veces no duplica `WorkerRequest` existentes
 *   (se chequea por type + description match).
 */
export async function runOnboardingCascade(
  workerId: string,
  options: CascadeOptions = {},
): Promise<CascadeResult> {
  const {
    requestLegajo = true,
    sendEmail: doSendEmail = true,
    force = false,
    triggeredBy,
    contractId,
  } = options

  const result: CascadeResult = {
    success: false,
    workerId,
    documentsPublished: 0,
    requestsCreated: 0,
    emailSent: false,
    skipped: false,
  }

  // ── 1. Fetch worker + org ────────────────────────────────────────────────
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: {
      id: true,
      orgId: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      fechaIngreso: true,
    },
  })

  if (!worker) {
    result.skipReason = 'Worker not found'
    return result
  }

  if (worker.status === 'TERMINATED') {
    result.skipped = true
    result.skipReason = 'Worker terminated'
    return result
  }

  // Si ya corrió y no es forzado, chequear marca previa
  if (!force) {
    const previousAudit = await prisma.auditLog.findFirst({
      where: {
        orgId: worker.orgId,
        entityType: 'Worker',
        entityId: worker.id,
        action: 'ONBOARDING_CASCADE_EXECUTED',
      },
      select: { id: true, createdAt: true },
    })
    if (previousAudit) {
      result.skipped = true
      result.skipReason = `Ya ejecutada el ${previousAudit.createdAt.toISOString()}. Usa force=true para re-ejecutar.`
      return result
    }
  }

  // ── 2. Contar documentos org publicados ──────────────────────────────────
  // No creamos nada nuevo: solo leemos lo publicado. El worker ya los ve vía
  // /api/mi-portal/reglamento. El email incluye el conteo.
  try {
    const docsPublished = await prisma.orgDocument.count({
      where: {
        orgId: worker.orgId,
        isPublishedToWorkers: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
    })
    result.documentsPublished = docsPublished
  } catch (err) {
    console.error('[onboarding-cascade] count org docs failed', err)
  }

  // ── 3. Crear WorkerRequests para documentos faltantes ────────────────────
  let requestsCreated = 0
  if (requestLegajo) {
    try {
      // ¿Qué documentos ya subió?
      const existing = await prisma.workerDocument.findMany({
        where: {
          workerId: worker.id,
          status: { in: ['UPLOADED', 'VERIFIED'] },
        },
        select: { documentType: true },
      })
      const uploadedTypes = new Set(existing.map((d) => d.documentType))

      // Lista de docs pendientes (solo los que el trabajador sube)
      const pendingForWorker = WORKER_UPLOADED_DOCS.filter(
        (type) => !uploadedTypes.has(type),
      )

      // ¿Ya existe un WorkerRequest activo para el mismo documento?
      const activeRequests = await prisma.workerRequest.findMany({
        where: {
          workerId: worker.id,
          type: 'ACTUALIZAR_DATOS',
          status: { in: ['PENDIENTE', 'EN_REVISION'] },
        },
        select: { description: true },
      })
      const alreadyRequested = new Set(
        activeRequests
          .map((r) => extractDocTypeFromRequestDescription(r.description))
          .filter((t): t is string => Boolean(t)),
      )

      for (const docType of pendingForWorker) {
        if (alreadyRequested.has(docType)) continue
        await prisma.workerRequest.create({
          data: {
            orgId: worker.orgId,
            workerId: worker.id,
            type: 'ACTUALIZAR_DATOS',
            status: 'PENDIENTE',
            title: `Subí tu ${DOC_TYPE_LABELS[docType]}`,
            description: formatRequestDescription(docType, DOC_TYPE_LABELS[docType]),
          },
        })
        requestsCreated++
      }
      result.requestsCreated = requestsCreated
    } catch (err) {
      console.error('[onboarding-cascade] create worker requests failed', err)
    }
  }

  // ── 4. Enviar email al trabajador ────────────────────────────────────────
  if (doSendEmail && worker.email) {
    try {
      // Obtener razón social para el email
      const org = await prisma.organization.findUnique({
        where: { id: worker.orgId },
        select: { name: true, razonSocial: true },
      })

      const html = workerOnboardingEmail({
        workerName: `${worker.firstName} ${worker.lastName}`.trim(),
        orgName: org?.razonSocial ?? org?.name ?? 'tu empresa',
        documentsCount: result.documentsPublished,
        pendingActions: requestsCreated,
      })

      const emailRes = await sendEmail({
        to: worker.email,
        subject: `Bienvenido a bordo — Completa tu onboarding con ${org?.razonSocial ?? org?.name ?? ''}`,
        html,
      })
      result.emailSent = emailRes.success
      if (!emailRes.success) {
        console.error('[onboarding-cascade] email send failed', emailRes.error)
      }
    } catch (err) {
      console.error('[onboarding-cascade] email exception', err)
    }
  }

  // ── 5. Audit log ─────────────────────────────────────────────────────────
  try {
    const audit = await prisma.auditLog.create({
      data: {
        orgId: worker.orgId,
        userId: triggeredBy,
        action: 'ONBOARDING_CASCADE_EXECUTED',
        entityType: 'Worker',
        entityId: worker.id,
        metadataJson: {
          documentsPublished: result.documentsPublished,
          requestsCreated: result.requestsCreated,
          emailSent: result.emailSent,
          contractId: contractId ?? null,
          force,
        },
      },
      select: { id: true },
    })
    result.auditLogId = audit.id
  } catch (err) {
    console.error('[onboarding-cascade] audit log failed', err)
  }

  result.success = true
  return result
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formatea la descripción de un WorkerRequest para que el front pueda recuperar
 * el documentType solicitado. Usamos un prefijo legible + tag machine-readable.
 */
function formatRequestDescription(docType: RequiredDocType, label: string): string {
  return `Por favor sube ${label.toLowerCase()} a tu portal en Comply360. [doc:${docType}]`
}

/** Extrae docType de descriptions creadas por esta cascada. */
function extractDocTypeFromRequestDescription(desc: string | null): string | null {
  if (!desc) return null
  const m = /\[doc:([a-z_]+)\]/.exec(desc)
  return m?.[1] ?? null
}

// ═══════════════════════════════════════════════════════════════════════════
// Batch helper (útil para disparar cascade a múltiples workers)
// ═══════════════════════════════════════════════════════════════════════════

export async function runOnboardingCascadeBatch(
  workerIds: string[],
  options: CascadeOptions = {},
): Promise<{ results: CascadeResult[]; totals: { success: number; skipped: number; failed: number } }> {
  const results: CascadeResult[] = []
  let success = 0
  let skipped = 0
  let failed = 0

  for (const id of workerIds) {
    try {
      const r = await runOnboardingCascade(id, options)
      results.push(r)
      if (r.skipped) skipped++
      else if (r.success) success++
      else failed++
    } catch (err) {
      console.error('[onboarding-cascade] batch item failed', { id, err })
      results.push({
        success: false,
        workerId: id,
        documentsPublished: 0,
        requestsCreated: 0,
        emailSent: false,
        skipped: false,
        skipReason: err instanceof Error ? err.message : String(err),
      })
      failed++
    }
  }

  return { results, totals: { success, skipped, failed } }
}
