import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage/upload'
import { recalculateLegajoScore } from '@/lib/compliance/legajo-config'

export const GET = withWorkerAuth(async (_req, ctx) => {
  // Defense in depth: verifica que el worker pertenece al org correcto via relation filter
  const docs = await prisma.workerDocument.findMany({
    where: { workerId: ctx.workerId, worker: { orgId: ctx.orgId } },
    orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({
    documents: docs.map((d) => ({
      id: d.id,
      category: d.category,
      documentType: d.documentType,
      title: d.title,
      status: d.status,
      fileUrl: d.fileUrl,
      isRequired: d.isRequired,
      expiresAt: d.expiresAt?.toISOString() || null,
      createdAt: d.createdAt.toISOString(),
    })),
  })
})

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

export const POST = withWorkerAuth(async (req, ctx) => {
  const formData = await req.formData()
  const documentType = formData.get('documentType')?.toString().trim()
  const title = formData.get('title')?.toString().trim()
  const file = formData.get('file')

  if (!documentType || !title) {
    return NextResponse.json({ error: 'Tipo y titulo son obligatorios' }, { status: 400 })
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Archivo muy grande (máximo 5 MB)' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido. Use PDF, JPG o PNG.' }, { status: 400 })
  }

  // Subir el archivo real (Supabase Storage en prod, filesystem en dev)
  let uploadResult
  try {
    uploadResult = await uploadFile(file, `workers/${ctx.workerId}`)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al subir archivo' },
      { status: 400 },
    )
  }

  const doc = await prisma.workerDocument.create({
    data: {
      workerId: ctx.workerId,
      category: inferCategoryFromType(documentType),
      documentType,
      title: title.slice(0, 120),
      fileUrl: uploadResult.url,
      fileSize: uploadResult.size,
      mimeType: uploadResult.mimeType,
      status: 'UPLOADED',
      isRequired: false,
    },
  })

  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'worker.document.uploaded',
      entityType: 'WorkerDocument',
      entityId: doc.id,
      metadataJson: { type: documentType, title, storage: uploadResult.storage },
    },
  }).catch(() => null)

  // Recalcular legajo score (puede subir con este nuevo doc)
  recalculateLegajoScore(ctx.workerId).catch(() => null)

  // Auto-verificación IA (fire-and-forget). Solo corre si el org tiene plan con
  // feature 'review_ia'. Se dispara en background para no bloquear la respuesta
  // al trabajador.
  void triggerAutoVerify(doc.id, ctx.workerId, ctx.orgId, ctx.userId)

  return NextResponse.json({
    id: doc.id,
    category: doc.category,
    documentType: doc.documentType,
    title: doc.title,
    status: doc.status,
    fileUrl: doc.fileUrl,
    isRequired: doc.isRequired,
    expiresAt: null,
    createdAt: doc.createdAt.toISOString(),
  }, { status: 201 })
})

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mapea documentType (ej: 'dni_copia', 'examen_medico_ingreso') a la
 * DocCategory del schema Prisma. Default INGRESO para docs del onboarding.
 */
function inferCategoryFromType(documentType: string): 'INGRESO' | 'VIGENTE' | 'SST' | 'PREVISIONAL' | 'CESE' {
  const t = documentType.toLowerCase()
  if (t.startsWith('examen_medico') || t.startsWith('iperc') || t.includes('sst') || t.includes('epp') || t.includes('induccion')) {
    return 'SST'
  }
  if (t.includes('afp') || t.includes('onp') || t.includes('essalud') || t.includes('cts')) {
    return 'PREVISIONAL'
  }
  if (t.includes('boleta') || t.includes('vacaciones') || t.includes('capacitacion')) {
    return 'VIGENTE'
  }
  if (t.includes('liquidacion') || t.includes('cese')) {
    return 'CESE'
  }
  return 'INGRESO'
}

/**
 * Dispara verificación IA en background. Siempre seguro — si falla algo,
 * solo logea.
 */
async function triggerAutoVerify(
  documentId: string,
  workerId: string,
  orgId: string,
  userId: string,
): Promise<void> {
  try {
    // Plan gate (inline para no bloquear con un import)
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, planExpiresAt: true },
    })
    if (!org) return
    let effectivePlan = org.plan
    if (org.planExpiresAt && new Date(org.planExpiresAt) < new Date()) {
      effectivePlan = 'STARTER'
    }
    // Solo PRO puede auto-verificar
    const { planHasFeature } = await import('@/lib/plan-gate')
    if (!planHasFeature(effectivePlan, 'review_ia')) return
    if (!process.env.OPENAI_API_KEY) return

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

    // Si auto-verified, recalcular score
    if (result.decision === 'auto-verified') {
      await recalculateLegajoScore(workerId).catch(() => null)
    }

    console.log('[mi-portal.documents] auto-verify', {
      documentId,
      decision: result.decision,
      confidence: result.confidence,
    })
  } catch (err) {
    console.error('[mi-portal.documents] auto-verify failed', err)
  }
}
