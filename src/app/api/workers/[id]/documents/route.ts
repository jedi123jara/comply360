import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import { uploadFile } from '@/lib/storage/upload'
import type { AuthContext } from '@/lib/auth'
import type { DocCategory, DocStatus } from '@/generated/prisma/client'
import { generateWorkerAlerts } from '@/lib/alerts/alert-engine'
import { syncComplianceScore } from '@/lib/compliance/sync-score'
import { recalculateLegajoScore } from '@/lib/compliance/legajo-config'
import { emit } from '@/lib/events'
import { validateUpload, UPLOAD_PROFILES } from '@/lib/uploads/validation'

// =============================================
// GET /api/workers/[id]/documents - List worker documents
// =============================================
export const GET = withPlanGateParams<{ id: string }>('workers', 
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const { id } = params
    const orgId = ctx.orgId

    // Verify worker belongs to org
    const worker = await prisma.worker.findUnique({
      where: { id },
      select: { id: true, orgId: true },
    })

    if (!worker || worker.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Trabajador no encontrado' },
        { status: 404 }
      )
    }

    const documents = await prisma.workerDocument.findMany({
      where: { workerId: id },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    })

    // Cargar audit logs de verificación IA — último por documento
    const docIds = documents.map((d) => d.id)
    const aiLogs =
      docIds.length > 0
        ? await prisma.auditLog.findMany({
            where: {
              orgId,
              entityType: 'WorkerDocument',
              entityId: { in: docIds },
              action: { in: ['document.ai_verified', 'document.ai_reviewed'] },
            },
            orderBy: { createdAt: 'desc' },
            select: {
              entityId: true,
              action: true,
              metadataJson: true,
              createdAt: true,
            },
          })
        : []

    // Indexar por entityId — tomamos solo el más reciente por doc
    const latestByDoc = new Map<string, (typeof aiLogs)[number]>()
    for (const log of aiLogs) {
      if (!log.entityId) continue
      if (!latestByDoc.has(log.entityId)) {
        latestByDoc.set(log.entityId, log)
      }
    }

    return NextResponse.json({
      data: documents.map((doc) => {
        const log = latestByDoc.get(doc.id)
        const meta = (log?.metadataJson ?? null) as {
          decision?: string
          confidence?: number
          summary?: string
          issues?: string[]
          model?: string
          suspicionFlags?: string[]
          suspicionScore?: number
          expiresAtApplied?: boolean
        } | null
        const isAiVerified = doc.verifiedBy === 'ai-v1'

        return {
          ...doc,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
          expiresAt: doc.expiresAt?.toISOString() ?? null,
          verifiedAt: doc.verifiedAt?.toISOString() ?? null,
          aiVerification: log
            ? {
                decision: meta?.decision ?? null,
                confidence: meta?.confidence ?? null,
                summary: meta?.summary ?? null,
                issues: meta?.issues ?? [],
                model: meta?.model ?? null,
                verifiedByAI: isAiVerified,
                suspicionFlags: meta?.suspicionFlags ?? [],
                suspicionScore: meta?.suspicionScore ?? 0,
                expiresAtAppliedByAI: meta?.expiresAtApplied ?? false,
                at: log.createdAt.toISOString(),
              }
            : null,
        }
      }),
    })
  }
)

// =============================================
// POST /api/workers/[id]/documents - Upload document
// =============================================
const VALID_CATEGORIES: DocCategory[] = [
  'INGRESO',
  'VIGENTE',
  'SST',
  'PREVISIONAL',
  'CESE',
]

export const POST = withPlanGateParams<{ id: string }>('workers', 
  async (req: NextRequest, ctx: AuthContext, params) => {
    const { id } = params
    const orgId = ctx.orgId

    // Verify worker belongs to org
    const worker = await prisma.worker.findUnique({
      where: { id },
      select: { id: true, orgId: true },
    })

    if (!worker || worker.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Trabajador no encontrado' },
        { status: 404 }
      )
    }

    // Parse multipart form data
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json(
        { error: 'Se requiere multipart/form-data con un archivo' },
        { status: 400 }
      )
    }

    const file = formData.get('file') as File | null
    const category = formData.get('category') as string | null
    const documentType = formData.get('documentType') as string | null
    const title = formData.get('title') as string | null
    const isRequired = formData.get('isRequired') === 'true'
    const expiresAt = formData.get('expiresAt') as string | null

    // Validación centralizada (Ola 1 — seguridad).
    // Profile workerDocument: imágenes + PDF + DOCX hasta 20 MB. Bloquea SVG/JS/EXE.
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Se requiere un archivo' }, { status: 400 })
    }
    const validation = validateUpload(file, UPLOAD_PROFILES.workerDocument)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 })
    }

    if (!category || !VALID_CATEGORIES.includes(category as DocCategory)) {
      return NextResponse.json(
        { error: `Categoria invalida. Opciones: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    if (!documentType || documentType.trim().length === 0) {
      return NextResponse.json(
        { error: 'Se requiere el tipo de documento (documentType)' },
        { status: 400 }
      )
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Se requiere el titulo del documento' },
        { status: 400 }
      )
    }

    // Upload file
    let uploadResult
    try {
      uploadResult = await uploadFile(file, `workers/${id}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al subir archivo'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // Create document record in database
    const document = await prisma.workerDocument.create({
      data: {
        workerId: id,
        category: category as DocCategory,
        documentType: documentType.trim(),
        title: title.trim(),
        fileUrl: uploadResult.url,
        fileSize: uploadResult.size,
        mimeType: uploadResult.mimeType,
        isRequired,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'UPLOADED' as DocStatus,
      },
    })

    // Recalculate legajo score
    await recalculateLegajoScore(id)

    // Recompute alerts — uploading a document may resolve DOCUMENTO_FALTANTE
    // or REGISTRO_INCOMPLETO alerts, and introduces DOCUMENTO_VENCIDO if expiresAt is in the past.
    try {
      await generateWorkerAlerts(id)
    } catch (alertErr) {
      console.error('[workers/documents POST] generateWorkerAlerts failed', { workerId: id, alertErr })
    }

    // Fire-and-forget compliance score recalculation
    syncComplianceScore(orgId).catch(() => {})

    // Fire-and-forget AI auto-verification (feature PRO+, solo si hay OpenAI key)
    void triggerAutoVerifyAI(document.id, id, orgId, ctx.userId)

    // Event bus
    emit('document.uploaded', {
      orgId,
      userId: ctx.userId,
      documentId: document.id,
      workerId: id,
      documentType: document.documentType,
      category: document.category,
    })

    return NextResponse.json(
      {
        data: {
          ...document,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString(),
          expiresAt: document.expiresAt?.toISOString() ?? null,
          verifiedAt: document.verifiedAt?.toISOString() ?? null,
        },
      },
      { status: 201 }
    )
  }
)

// =============================================
// PATCH /api/workers/[id]/documents - Verify/reject document
// =============================================
export const PATCH = withPlanGateParams<{ id: string }>('workers', 
  async (req: NextRequest, ctx: AuthContext, params) => {
    const { id } = params
    const orgId = ctx.orgId

    const worker = await prisma.worker.findUnique({
      where: { id },
      select: { id: true, orgId: true },
    })

    if (!worker || worker.orgId !== orgId) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const { documentId, action } = body as { documentId: string; action: string }

    if (!documentId || !['verify', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Se requiere documentId y action (verify | reject)' },
        { status: 400 }
      )
    }

    const doc = await prisma.workerDocument.findUnique({ where: { id: documentId } })
    if (!doc || doc.workerId !== id) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    // FIX #6.F: reject pone status='MISSING' (no 'PENDING'). Antes el doc
    // rechazado quedaba en PENDING:
    //  - Alert engine filtraba `status !== 'MISSING'`, entonces NO disparaba
    //    DOCUMENTO_FALTANTE → estado fantasma sin alerta.
    //  - Legajo score solo cuenta UPLOADED/VERIFIED, así que el score bajaba
    //    pero el problema era invisible al admin.
    // Usar MISSING alinea ambos: admin ve alerta de doc faltante y legajo
    // refleja la realidad (cuando exista enum REJECTED en Ola 7, migrar).
    const updateData: Record<string, unknown> = action === 'verify'
      ? { status: 'VERIFIED' as DocStatus, verifiedAt: new Date(), verifiedBy: ctx.userId }
      : { status: 'MISSING' as DocStatus, verifiedAt: null, verifiedBy: null }

    const updated = await prisma.workerDocument.update({
      where: { id: documentId },
      data: updateData,
    })

    // Recalculate legajo score and alerts after verification change
    await recalculateLegajoScore(id)
    try {
      await generateWorkerAlerts(id)
    } catch (alertErr) {
      console.error('[workers/documents PATCH] generateWorkerAlerts failed', { workerId: id, alertErr })
    }

    return NextResponse.json({
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        expiresAt: updated.expiresAt?.toISOString() ?? null,
        verifiedAt: updated.verifiedAt?.toISOString() ?? null,
      },
    })
  }
)

// recalculateLegajoScore is imported from @/lib/compliance/legajo-config

/**
 * Dispara verificación IA en background tras un upload. Fire-and-forget.
 * - Solo corre si el org tiene plan con feature 'review_ia'
 * - Solo si hay OPENAI_API_KEY
 * - Nunca bloquea ni lanza
 */
async function triggerAutoVerifyAI(
  documentId: string,
  workerId: string,
  orgId: string,
  userId: string,
): Promise<void> {
  try {
    if (!process.env.OPENAI_API_KEY) return
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, planExpiresAt: true },
    })
    if (!org) return
    let effectivePlan = org.plan
    if (org.planExpiresAt && new Date(org.planExpiresAt) < new Date()) {
      effectivePlan = 'STARTER'
    }
    const { planHasFeature } = await import('@/lib/plan-gate')
    if (!planHasFeature(effectivePlan, 'review_ia')) return

    const [doc, worker] = await Promise.all([
      prisma.workerDocument.findUnique({ where: { id: documentId } }),
      prisma.worker.findUnique({
        where: { id: workerId },
        select: {
          firstName: true,
          lastName: true,
          dni: true,
          birthDate: true,
          position: true,
        },
      }),
    ])
    if (!doc || !doc.fileUrl || !worker) return

    const { verifyDocument } = await import('@/lib/ai/document-verifier')
    const { persistVerification } = await import('@/lib/ai/document-verifier-persist')

    const result = await verifyDocument(
      { fileUrl: doc.fileUrl, mimeType: doc.mimeType, documentType: doc.documentType },
      worker,
    )

    await persistVerification(documentId, workerId, userId, orgId, result)

    if (result.decision === 'auto-verified') {
      await recalculateLegajoScore(workerId).catch(() => null)
      syncComplianceScore(orgId).catch(() => {})
    }

    console.log('[workers.documents] auto-verify', {
      documentId,
      decision: result.decision,
      confidence: result.confidence,
    })
  } catch (err) {
    console.error('[workers.documents] auto-verify failed', err)
  }
}

