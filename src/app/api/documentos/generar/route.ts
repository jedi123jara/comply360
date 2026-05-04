/**
 * POST /api/documentos/generar
 *
 * Generates a legal document from a template and user-provided variables.
 * Returns rendered HTML and plain text — the frontend opens the HTML in a
 * new window and triggers window.print() for PDF download.
 *
 * Body: { templateId: string; variables: Record<string, unknown> }
 *
 * Response: { html: string; text: string; templateName: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  getDocumentTemplateById,
  renderDocumentToHtml,
  renderDocumentToText,
} from '@/lib/legal-engine/documents'
import { prisma } from '@/lib/prisma'
import type { OrgDocType } from '@/generated/prisma/client'

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: { templateId?: string; variables?: Record<string, unknown>; persist?: boolean }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { templateId, variables = {} } = body

  if (!templateId || typeof templateId !== 'string') {
    return NextResponse.json(
      { error: 'templateId es requerido' },
      { status: 400 }
    )
  }

  const template = getDocumentTemplateById(templateId)

  if (!template) {
    return NextResponse.json(
      { error: `Template "${templateId}" no encontrado. Templates disponibles: politica-hostigamiento-sexual, plan-sst-anual, reglamento-interno-trabajo, cuadro-categorias-funciones` },
      { status: 404 }
    )
  }

  // Validate required fields
  const missingFields: string[] = []
  for (const section of template.sections) {
    for (const field of section.fields) {
      if (field.required && (variables[field.id] === undefined || variables[field.id] === '')) {
        missingFields.push(field.label)
      }
    }
  }

  if (missingFields.length > 0) {
    return NextResponse.json(
      {
        error: 'Campos requeridos faltantes',
        missingFields,
      },
      { status: 422 }
    )
  }

  // Auto-inject today's date if not provided
  if (!variables.fecha_elaboracion) {
    variables.fecha_elaboracion = new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  // Render document
  const html = renderDocumentToHtml(template, variables)
  const text = renderDocumentToText(template, variables)
  const persist = body.persist !== false
  let documentId: string | null = null
  let documentVersion: number | null = null

  if (persist) {
    const orgDocType = mapDocumentTypeToOrgDocType(template.type)
    const latest = await prisma.orgDocument.findFirst({
      where: {
        orgId: ctx.orgId,
        type: orgDocType,
        title: template.name,
      },
      select: { version: true },
      orderBy: { version: 'desc' },
    })
    documentVersion = (latest?.version ?? 0) + 1
    const created = await prisma.orgDocument.create({
      data: {
        orgId: ctx.orgId,
        type: orgDocType,
        title: template.name,
        description: JSON.stringify({
          _schema: 'generated_document_v1',
          templateId,
          templateType: template.type,
          legalBasis: template.legalBasis,
          variables,
          html,
          text,
          generatedAt: new Date().toISOString(),
        }),
        version: documentVersion,
        uploadedById: ctx.userId,
        isPublishedToWorkers: false,
        publishedAt: null,
        acknowledgmentRequired: ['RIT', 'POLITICA_HOSTIGAMIENTO', 'POLITICA_SST'].includes(template.type),
      },
      select: { id: true },
    })
    documentId = created.id
  }

  // Log document generation in audit trail
  try {
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'DOCUMENT_GENERATED',
        entityType: 'DocumentTemplate',
        entityId: templateId,
        metadataJson: {
          templateName: template.name,
          templateType: template.type,
          documentId,
          persisted: persist,
        },
      },
    })
  } catch {
    // Non-fatal — audit log failure should not block the response
  }

  return NextResponse.json({
    html,
    text,
    templateName: template.name,
    templateId,
    legalBasis: template.legalBasis,
    documentId,
    documentVersion,
    persisted: persist,
    generatedAt: new Date().toISOString(),
  })
})

function mapDocumentTypeToOrgDocType(type: string): OrgDocType {
  switch (type) {
    case 'PLAN_SST':
      return 'PLAN_SST'
    case 'RIT':
      return 'RIT'
    case 'POLITICA_HOSTIGAMIENTO':
      return 'POLITICA_HOSTIGAMIENTO'
    case 'POLITICA_SST':
      return 'REGLAMENTO_SST'
    case 'CCF':
      return 'POLITICA_IGUALDAD'
    default:
      return 'OTRO'
  }
}

/**
 * GET /api/documentos/generar — List available templates (metadata only, no blocks)
 */
export const GET = withAuth(async () => {
  const { DOCUMENT_TEMPLATES } = await import('@/lib/legal-engine/documents')

  const templates = DOCUMENT_TEMPLATES.map(t => ({
    id: t.id,
    type: t.type,
    name: t.name,
    description: t.description,
    legalBasis: t.legalBasis,
    mandatoryFrom: t.mandatoryFrom,
    workerThreshold: t.workerThreshold,
    approvalAuthority: t.approvalAuthority,
    sectionCount: t.sections.length,
    fieldCount: t.sections.reduce((acc, s) => acc + s.fields.length, 0),
    sections: t.sections.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      fields: s.fields,
    })),
  }))

  return NextResponse.json({ templates })
})
