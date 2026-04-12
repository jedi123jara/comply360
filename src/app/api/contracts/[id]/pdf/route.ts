import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  createPDFDoc,
  finalizePDF,
  addHeader,
  sectionTitle,
  kv,
  checkPageBreak,
} from '@/lib/pdf/server-pdf'

// =============================================
// GET /api/contracts/[id]/pdf — Download contract as PDF
// =============================================
export const GET = withAuthParams<{ id: string }>(
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const orgId = ctx.orgId

    const contract = await prisma.contract.findFirst({
      where: { id: params.id, orgId },
      include: {
        organization: { select: { name: true, razonSocial: true, ruc: true } },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    const org = contract.organization
    const formData = (contract.formData ?? {}) as Record<string, string | number | null>

    // ── Build PDF ─────────────────────────────────────────────────────────
    const doc = await createPDFDoc()
    const headerOrg = { name: org?.name, razonSocial: org?.razonSocial, ruc: org?.ruc }

    addHeader(doc, contract.title || 'CONTRATO', headerOrg, contract.type?.replace(/_/g, ' '))

    let y = 52

    // ── Contract metadata ─────────────────────────────────────────────────
    y = sectionTitle(doc, 'DATOS DEL CONTRATO', y)
    y = kv(doc, 'Tipo', contract.type?.replace(/_/g, ' ') ?? '—', 14, y, 45)
    y = kv(doc, 'Estado', contract.status ?? '—', 14, y, 45)
    if (formData.trabajador_nombre) {
      y = kv(doc, 'Trabajador', String(formData.trabajador_nombre), 14, y, 45)
    }
    if (formData.trabajador_dni) {
      y = kv(doc, 'DNI', String(formData.trabajador_dni), 14, y, 45)
    }
    if (formData.cargo) {
      y = kv(doc, 'Cargo', String(formData.cargo), 14, y, 45)
    }
    if (formData.remuneracion) {
      y = kv(doc, 'Remuneración', `S/ ${formData.remuneracion}`, 14, y, 45)
    }
    if (formData.fecha_inicio) {
      y = kv(doc, 'Fecha inicio', String(formData.fecha_inicio), 14, y, 45)
    }
    if (formData.fecha_fin) {
      y = kv(doc, 'Fecha fin', String(formData.fecha_fin), 14, y, 45)
    }
    y += 4

    // ── Contract content ─────────────────────────────────────────────────
    const content = contract.contentHtml as string | null
    if (content) {
      y = sectionTitle(doc, 'CONTENIDO DEL CONTRATO', y)

      // Strip HTML tags for plain text rendering
      const plainText = content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim()

      const W = doc.internal.pageSize.getWidth()
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 30, 30)

      // Split into paragraphs and render with word wrapping
      const paragraphs = plainText.split(/\n\n+/)
      for (const para of paragraphs) {
        const lines = doc.text(para.trim(), 14, y, { maxWidth: W - 28 }) as unknown as string[]
        // Estimate line count for page break
        const lineCount = Array.isArray(lines) ? lines.length : Math.ceil(para.length / 80)
        y += lineCount * 4.5
        y += 3
        y = checkPageBreak(doc, y)
      }
    }

    // ── Signatures ─────────────────────────────────────────────────────────
    y += 10
    y = checkPageBreak(doc, y, 260)
    y = sectionTitle(doc, 'FIRMAS', y)
    y += 15

    const W = doc.internal.pageSize.getWidth()
    doc.setDrawColor(100, 100, 100)
    doc.line(14, y, 80, y)
    doc.line(W - 80, y, W - 14, y)

    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.text('EL EMPLEADOR', 47, y + 5, { align: 'center' })
    doc.text('EL TRABAJADOR', W - 47, y + 5, { align: 'center' })

    if (org?.razonSocial || org?.name) {
      doc.text(org.razonSocial ?? org.name ?? '', 47, y + 10, { align: 'center' })
    }
    if (formData.trabajador_nombre) {
      doc.text(String(formData.trabajador_nombre), W - 47, y + 10, { align: 'center' })
    }

    // ── Finalize ──────────────────────────────────────────────────────────
    const filename = `contrato-${contract.id.slice(-8)}.pdf`
    return finalizePDF(doc, filename)
  },
)
