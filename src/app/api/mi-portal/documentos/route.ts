import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

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

  // En produccion, aquí se subiría a Supabase Storage / S3.
  // Por ahora se guarda solo el metadato y un placeholder URL.
  const doc = await prisma.workerDocument.create({
    data: {
      workerId: ctx.workerId,
      category: 'INGRESO',
      documentType,
      title: title.slice(0, 120),
      fileUrl: `pending://uploaded-by-worker/${file.name}`,
      fileSize: file.size,
      mimeType: file.type,
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
      metadataJson: { type: documentType, title },
    },
  }).catch(() => null)

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
