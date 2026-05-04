import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { renderContractDocxBuffer } from '@/lib/contracts/rendering'

// =============================================
// GET /api/contracts/[id]/render-docx
// Genera y devuelve un .docx REAL (OOXML) del contrato actual.
// Usa el `contentHtml` como fuente de verdad — html-to-docx convierte
// h1/h2/h3, p, ul/ol, table y formato inline a OOXML auténtico.
//
// Para flujos con plantilla .docx personalizada (Fase 2.5 zero-liability),
// la app debería usar /api/org-templates/:id/generate (existing) — este
// endpoint es el "default" cuando el contrato no tiene plantilla asociada.
// =============================================
export const GET = withAuthParams<{ id: string }>(async (req: NextRequest, ctx: AuthContext, params) => {
  const contract = await prisma.contract.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
    select: {
      id: true,
      title: true,
      type: true,
      contentHtml: true,
      organization: { select: { name: true, razonSocial: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  })

  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  if (!contract.contentHtml || contract.contentHtml.trim().length === 0) {
    return NextResponse.json(
      { error: 'El contrato no tiene contenido para renderizar.' },
      { status: 422 },
    )
  }

  try {
    const buffer = await renderContractDocxBuffer({
      title: contract.title,
      contractType: contract.type,
      sourceKind: 'html-based',
      contentHtml: contract.contentHtml,
      formData: null,
      contentJson: null,
      orgContext: {
        name: contract.organization.name,
        razonSocial: contract.organization.razonSocial,
      },
    })

    await logAudit({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'contract.docx.rendered',
      entityType: 'Contract',
      entityId: params.id,
      metadata: { byteLength: buffer.byteLength },
    })

    const fileName = sanitizeFileName(`${contract.title}.docx`)
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/contracts/:id/render-docx]', err)
    return NextResponse.json({ error: 'No se pudo generar el .docx' }, { status: 500 })
  }
})

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 ._-]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}
