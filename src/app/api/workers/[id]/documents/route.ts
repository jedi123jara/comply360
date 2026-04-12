import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import { uploadFile } from '@/lib/storage/upload'
import type { AuthContext } from '@/lib/auth'
import type { DocCategory, DocStatus } from '@/generated/prisma/client'
import { generateWorkerAlerts } from '@/lib/alerts/alert-engine'

// =============================================
// GET /api/workers/[id]/documents - List worker documents
// =============================================
export const GET = withAuthParams<{ id: string }>(
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

    return NextResponse.json({
      data: documents.map(doc => ({
        ...doc,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        expiresAt: doc.expiresAt?.toISOString() ?? null,
        verifiedAt: doc.verifiedAt?.toISOString() ?? null,
      })),
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

export const POST = withAuthParams<{ id: string }>(
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

    // Validate required fields
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: 'Se requiere un archivo' },
        { status: 400 }
      )
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
export const PATCH = withAuthParams<{ id: string }>(
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

    const updateData: Record<string, unknown> = action === 'verify'
      ? { status: 'VERIFIED' as DocStatus, verifiedAt: new Date(), verifiedBy: ctx.userId }
      : { status: 'PENDING' as DocStatus, verifiedAt: null, verifiedBy: null }

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

/**
 * Recalculate legajo score for a worker based on uploaded required documents.
 */
async function recalculateLegajoScore(workerId: string) {
  // Count total required document types (from the 28-doc legajo standard)
  const REQUIRED_DOC_TYPES = [
    'contrato_trabajo',
    'cv',
    'dni_copia',
    'declaracion_jurada',
    'boleta_pago',
    't_registro',
    'vacaciones_goce',
    'capacitacion_registro',
    'examen_medico_ingreso',
    'examen_medico_periodico',
    'induccion_sst',
    'entrega_epp',
    'iperc_puesto',
    'capacitacion_sst',
    'reglamento_interno',
    'afp_onp_afiliacion',
    'essalud_registro',
    'cts_deposito',
  ]

  const uploadedDocs = await prisma.workerDocument.findMany({
    where: {
      workerId,
      status: { in: ['UPLOADED', 'VERIFIED'] },
    },
    select: { documentType: true },
  })

  const uploadedTypes = new Set(uploadedDocs.map(d => d.documentType))
  const matchedCount = REQUIRED_DOC_TYPES.filter(t => uploadedTypes.has(t)).length
  const score = Math.round((matchedCount / REQUIRED_DOC_TYPES.length) * 100)

  await prisma.worker.update({
    where: { id: workerId },
    data: { legajoScore: score },
  })
}
