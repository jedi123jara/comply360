/**
 * POST /api/ai/contract-fix/pdf
 *
 * Genera un PDF profesional del contrato corregido usando jsPDF + helpers
 * compartidos (`server-pdf.ts`). Respuesta: `application/pdf` descargable.
 *
 * Body: {
 *   title: string
 *   fixedHtml: string
 *   summary?: string
 *   warningLegal?: string
 *   changesCount?: number
 * }
 *
 * Plan-gate: PRO (feature `review_ia`).
 *
 * Estilo: header COMPLY360 + título "Contrato (versión corregida por IA)" +
 * cuerpo con texto del contrato (HTML stripped a párrafos) + footer con
 * advertencia legal + número de página.
 */

import { NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import { prisma } from '@/lib/prisma'
import {
  createPDFDoc,
  addHeader,
  finalizePDF,
  checkPageBreak,
  type JsPDFDoc,
} from '@/lib/pdf/server-pdf'

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|br)\s*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface PdfBody {
  title?: string
  fixedHtml?: string
  summary?: string
  warningLegal?: string
  changesCount?: number
}

export const POST = withPlanGate('review_ia', async (req, ctx) => {
  let body: PdfBody
  try {
    body = (await req.json()) as PdfBody
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.fixedHtml) {
    return NextResponse.json({ error: 'fixedHtml requerido' }, { status: 400 })
  }

  // Datos de org para el header
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { name: true, razonSocial: true, ruc: true },
  })

  const title = body.title ?? 'Contrato laboral'
  const subtitle = `Versión corregida por IA · ${body.changesCount ?? 0} cambios`
  const orgInfo = {
    name: org?.name ?? 'Empresa',
    razonSocial: org?.razonSocial ?? null,
    ruc: org?.ruc ?? null,
  }

  // Crear PDF
  const doc = await createPDFDoc()
  addHeader(doc, title, orgInfo, subtitle)

  let y = 56
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 14
  const contentWidth = pageWidth - marginX * 2
  const lineHeight = 5

  // Summary banner si existe
  if (body.summary) {
    doc.setFillColor(236, 253, 245) // emerald-50
    doc.rect(marginX, y, contentWidth, 14, 'F')
    doc.setTextColor(4, 120, 87) // emerald-700
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN DE LA CORRECCIÓN', marginX + 3, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(6, 95, 70) // emerald-800
    const summaryLines = wrapText(body.summary, 90)
    summaryLines.slice(0, 1).forEach((line, i) => {
      doc.text(line, marginX + 3, y + 11 + i * lineHeight)
    })
    y += 18
  }

  // Body — texto del contrato corregido
  const text = stripHtml(body.fixedHtml)
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim())

  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'normal')

  for (const para of paragraphs) {
    const lines = wrapText(para, 95)
    for (const line of lines) {
      y = checkPageBreak(doc, y, 270, {
        title,
        org: orgInfo,
        subtitle,
      })
      doc.text(line, marginX, y)
      y += lineHeight
    }
    y += 3 // gap entre párrafos
  }

  // Warning legal al final
  y = checkPageBreak(doc, y + 10, 270, { title, org: orgInfo, subtitle })
  if (body.warningLegal) {
    doc.setFillColor(255, 251, 235) // amber-50
    doc.rect(marginX, y, contentWidth, 16, 'F')
    doc.setTextColor(146, 64, 14) // amber-800
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('AVISO LEGAL', marginX + 3, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const warningLines = wrapText(body.warningLegal, 110)
    warningLines.slice(0, 2).forEach((line, i) => {
      doc.text(line, marginX + 3, y + 10 + i * 4)
    })
    y += 22
  }

  // Audit log fire-and-forget
  void prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'ai.contract_fix_pdf',
        entityType: 'Contract',
        entityId: 'transient',
        metadataJson: {
          changesCount: body.changesCount ?? 0,
          textLength: text.length,
        },
      },
    })
    .catch(() => null)

  const filename = `contrato-corregido-${Date.now()}.pdf`
  return finalizePDF(doc as JsPDFDoc, filename)
})

/** Wrap texto a N caracteres por línea (aproximación monoespacio simple). */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (current.length + word.length + 1 > maxChars) {
      if (current) lines.push(current)
      current = word
    } else {
      current = current ? `${current} ${word}` : word
    }
  }
  if (current) lines.push(current)
  return lines
}
