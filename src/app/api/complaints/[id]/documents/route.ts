import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

const DOCUMENT_STAGES = [
  'RECEPCION',
  'EVALUACION',
  'MEDIDAS_PROTECCION',
  'INVESTIGACION',
  'INFORME_COMITE',
  'DECISION_FINAL',
  'COMUNICACION_AUTORIDAD',
  'CIERRE',
  'APELACION',
] as const

const DOCUMENT_KINDS = [
  'ACTA',
  'QUEJA',
  'INFORME',
  'MEDIDA_PROTECCION',
  'COMUNICACION_AUTORIDAD',
  'DESCARGO',
  'EVIDENCIA',
  'RESOLUCION',
  'OTRO',
] as const

const documentSchema = z.object({
  title: z.string().trim().min(3).max(180),
  stage: z.enum(DOCUMENT_STAGES),
  kind: z.enum(DOCUMENT_KINDS).default('OTRO'),
  url: z.string().min(1),
  storagePath: z.string().min(1).max(500),
  mimeType: z.string().max(120).optional().nullable(),
  size: z.number().int().positive().max(30_000_000).optional().nullable(),
  hashSha256: z.string().regex(/^[a-f0-9]{64}$/).optional().nullable(),
  visibleToReporter: z.boolean().default(false),
})

export const GET = withRoleParams<{ id: string }>(
  'ADMIN',
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const complaint = await prisma.complaint.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true },
    })

    if (!complaint) {
      return NextResponse.json({ error: 'Denuncia no encontrada' }, { status: 404 })
    }

    const documents = await prisma.complaintDocument.findMany({
      where: { complaintId: id, orgId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ documents })
  },
)

export const POST = withRoleParams<{ id: string }>(
  'ADMIN',
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => null)
    const parsed = documentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Documento invalido',
          details: parsed.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      )
    }

    const complaint = await prisma.complaint.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, code: true },
    })

    if (!complaint) {
      return NextResponse.json({ error: 'Denuncia no encontrada' }, { status: 404 })
    }

    const data = parsed.data
    if (!isExpectedComplaintPath(data.storagePath, ctx.orgId, id) || isExternalUrl(data.url)) {
      return NextResponse.json(
        { error: 'El documento debe provenir del almacenamiento interno del expediente.' },
        { status: 400 },
      )
    }

    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.complaintDocument.create({
        data: {
          complaintId: id,
          orgId: ctx.orgId,
          title: data.title,
          stage: data.stage,
          kind: data.kind,
          url: data.url,
          storagePath: data.storagePath,
          mimeType: data.mimeType ?? null,
          size: data.size ?? null,
          hashSha256: data.hashSha256 ?? null,
          visibleToReporter: data.visibleToReporter,
          uploadedBy: ctx.userId,
        },
      })

      await tx.complaintTimeline.create({
        data: {
          complaintId: id,
          action: 'DOCUMENT_UPLOADED',
          description: `${data.kind} - ${data.title} (${data.stage})${data.visibleToReporter ? ' - visible al denunciante' : ' - interno'}`,
          performedBy: ctx.email ?? 'Admin',
        },
      })

      await tx.auditLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'COMPLAINT_DOCUMENT_UPLOADED',
          entityType: 'Complaint',
          entityId: id,
          metadataJson: {
            complaintCode: complaint.code,
            documentId: created.id,
            stage: created.stage,
            kind: created.kind,
            hashSha256: created.hashSha256,
            visibleToReporter: created.visibleToReporter,
          },
        },
      })

      return created
    })

    return NextResponse.json({ document }, { status: 201 })
  },
)

function isExpectedComplaintPath(storagePath: string, orgId: string, complaintId: string): boolean {
  if (storagePath.includes('..')) return false
  return storagePath.startsWith(`${orgId}/complaints/${complaintId}/`)
}

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}
