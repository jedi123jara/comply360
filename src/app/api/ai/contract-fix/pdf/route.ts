/**
 * POST /api/ai/contract-fix/pdf
 *
 * Genera un PDF profesional del contrato corregido por IA.
 * Usa los helpers `contract-pdf.ts` (sin marca COMPLY360, tipografía Times,
 * cláusulas separadas, base legal en pie discreto, portada formal y firmas).
 *
 * Body:
 *   {
 *     title: string
 *     fixedHtml: string
 *     summary?: string         // resumen de los cambios (notas IA)
 *     warningLegal?: string    // aviso legal sobre el uso de IA
 *     changesCount?: number
 *   }
 *
 * Plan-gate: PRO (feature `review_ia`).
 *
 * Diseño: el contrato corregido se presenta como un contrato profesional
 * autónomo. Las notas de la revisión IA se imprimen al final, claramente
 * marcadas como "no forman parte del contrato".
 */

import { NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import { prisma } from '@/lib/prisma'
import { cleanContractContent } from '@/lib/pdf/contract-content-cleaner'
import {
  createContractPDFDoc,
  addCoverPage,
  addContractHeader,
  renderContractBody,
  addSignatureBlock,
  finalizeContractPDF,
  loadOrgLogoBytes,
  drawJustifiedParagraph,
  checkContractPageBreak,
  CONTRACT_LAYOUT,
  type JsPDFContractDoc,
  type ContractHeaderOpts,
} from '@/lib/pdf/contract-pdf'

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li)\s*>/gi, '\n\n')
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

  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { name: true, razonSocial: true, ruc: true, logoUrl: true },
  })

  const title = body.title ?? 'Contrato laboral'
  const orgForPdf = {
    name: org?.name,
    razonSocial: org?.razonSocial,
    ruc: org?.ruc,
  }
  const logo = await loadOrgLogoBytes(org?.logoUrl)
  const headerOpts: ContractHeaderOpts = { org: orgForPdf, logo }

  // Limpiar y procesar el HTML del contrato corregido
  const text = stripHtml(body.fixedHtml)
  const cleaned = cleanContractContent(text)

  // Construir PDF
  const doc = await createContractPDFDoc()

  addCoverPage(doc, {
    title,
    org: orgForPdf,
    logo,
    workerFullName: '',
    workerDni: '',
    ciudad: 'Lima',
  })

  doc.addPage()
  addContractHeader(doc, headerOpts)

  let y = renderContractBody(doc, cleaned, {
    startY: 36,
    headerOpts,
  })

  // Bloque de firmas placeholder (sin datos del trabajador específicos —
  // este endpoint es preview de un contrato corregido, no instancia firmable)
  y = addSignatureBlock(doc, y, {
    empleador: {
      razonSocial: org?.razonSocial ?? org?.name ?? '',
      ruc: org?.ruc ?? '',
    },
    trabajador: { fullName: '', dni: '' },
    ciudad: 'Lima',
    fecha: new Date(),
    headerOpts,
  })

  // Notas de la revisión IA al final, en página separada y claramente
  // marcadas como NO formando parte del contrato.
  if (body.summary || body.warningLegal) {
    appendIANotes(doc, headerOpts, {
      summary: body.summary,
      warningLegal: body.warningLegal,
      changesCount: body.changesCount,
    })
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
  return finalizeContractPDF(doc, filename)
})

function appendIANotes(
  doc: JsPDFContractDoc,
  headerOpts: ContractHeaderOpts,
  notes: { summary?: string; warningLegal?: string; changesCount?: number },
): void {
  doc.addPage()
  addContractHeader(doc, headerOpts)

  const x = CONTRACT_LAYOUT.marginX
  const W = doc.internal.pageSize.getWidth()
  const maxWidth = W - CONTRACT_LAYOUT.marginX * 2
  let y = 40

  // Título de la sección
  doc.setFont('times', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
  doc.text('NOTAS DE LA REVISIÓN POR IA', x, y)
  y += 6

  doc.setFont('times', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
  doc.text('Esta sección no forma parte del contrato.', x, y)
  y += 9

  if (typeof notes.changesCount === 'number') {
    doc.setFont('times', 'normal')
    doc.setFontSize(CONTRACT_LAYOUT.bodyFontSize)
    doc.setTextColor(...CONTRACT_LAYOUT.textColor)
    doc.text(
      `Cambios sugeridos por la IA: ${notes.changesCount}`,
      x,
      y,
    )
    y += 7
  }

  if (notes.summary) {
    doc.setFont('times', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...CONTRACT_LAYOUT.textColor)
    doc.text('Resumen de la corrección', x, y)
    y += 5
    doc.setFont('times', 'normal')
    doc.setFontSize(CONTRACT_LAYOUT.bodyFontSize)
    y = drawJustifiedParagraph(doc, notes.summary, x, y, maxWidth, CONTRACT_LAYOUT.lineHeight)
    y += CONTRACT_LAYOUT.paragraphGap + 4
  }

  if (notes.warningLegal) {
    y = checkContractPageBreak(doc, y + 4, undefined, headerOpts)
    doc.setFont('times', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...CONTRACT_LAYOUT.textColor)
    doc.text('Aviso legal sobre el uso de IA', x, y)
    y += 5
    doc.setFont('times', 'italic')
    doc.setFontSize(CONTRACT_LAYOUT.bodyFontSize)
    doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
    drawJustifiedParagraph(doc, notes.warningLegal, x, y, maxWidth, CONTRACT_LAYOUT.lineHeight)
  }
}
