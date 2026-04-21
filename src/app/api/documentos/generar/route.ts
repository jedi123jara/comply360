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

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: { templateId?: string; variables?: Record<string, unknown> }

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
    generatedAt: new Date().toISOString(),
  })
})

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
