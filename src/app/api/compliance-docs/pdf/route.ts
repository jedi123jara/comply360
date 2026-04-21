/**
 * POST /api/compliance-docs/pdf
 *
 * Genera un PDF a partir de un GeneratedDocument (sections + markdown).
 * Respeta el formato COMPLY360 estándar: header branded + secciones
 * numeradas + base legal + firma.
 *
 * Body:
 *   document   GeneratedDocument (del POST /generate)
 *
 * Returns: PDF descargable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createPDFDoc,
  addHeader,
  sectionTitle,
  finalizePDF,
  checkPageBreak,
  type JsPDFDoc,
} from '@/lib/pdf/server-pdf'
import type { GeneratedDocument, GeneratedSection } from '@/lib/generators/types'

export const runtime = 'nodejs'

/* ── Markdown → plaintext básico para jsPDF (no soporta HTML) ──────── */

function stripMarkdown(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1') // italic
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/^#{1,6}\s+/gm, '') // headers
    .replace(/^>\s?/gm, '') // blockquote
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .trim()
}

/** Split texto en líneas respetando ancho máximo (jsPDF no auto-wrappa largo). */
function wrapText(doc: JsPDFDoc, text: string, maxWidth: number, fontSize: number): string[] {
  doc.setFontSize(fontSize)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = doc as any
  if (typeof d.splitTextToSize === 'function') {
    const wrapped = d.splitTextToSize(text, maxWidth) as string[]
    return Array.isArray(wrapped) ? wrapped : [String(wrapped)]
  }
  // Fallback: split crudo por chars (pésimo pero no rompe)
  const approxCharsPerLine = Math.floor(maxWidth / (fontSize * 0.45))
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    if (paragraph.length <= approxCharsPerLine) {
      lines.push(paragraph)
      continue
    }
    const words = paragraph.split(' ')
    let buf = ''
    for (const w of words) {
      if (buf.length + w.length + 1 > approxCharsPerLine && buf.length > 0) {
        lines.push(buf)
        buf = w
      } else {
        buf = buf ? `${buf} ${w}` : w
      }
    }
    if (buf) lines.push(buf)
  }
  return lines
}

/* ── Section renderer ────────────────────────────────────────────────── */

function renderSection(
  doc: JsPDFDoc,
  section: GeneratedSection,
  y: number,
  headerArgs: { title: string; org: { name?: string; razonSocial?: string | null; ruc?: string | null }; subtitle?: string },
): number {
  y = checkPageBreak(doc, y, 240, headerArgs)
  y = sectionTitle(doc, `${section.numbering}. ${section.title}`, y)

  // Content paragraphs
  const cleanContent = stripMarkdown(section.content)
  const paragraphs = cleanContent.split('\n').filter((p) => p.trim().length > 0)

  doc.setFontSize(9.5)
  doc.setTextColor(40, 40, 40)

  for (const para of paragraphs) {
    y = checkPageBreak(doc, y, 270, headerArgs)
    const lines = wrapText(doc, para, 180, 9.5)
    for (const line of lines) {
      y = checkPageBreak(doc, y, 275, headerArgs)
      doc.text(line, 14, y)
      y += 4.5
    }
    y += 2 // spacing entre párrafos
  }

  if (section.baseLegal) {
    y = checkPageBreak(doc, y, 270, headerArgs)
    doc.setFontSize(7.5)
    doc.setTextColor(120, 120, 120)
    doc.text(`Base legal: ${section.baseLegal}`, 14, y)
    doc.setTextColor(40, 40, 40)
    y += 4
  }

  y += 4
  return y
}

/* ── Handler ─────────────────────────────────────────────────────────── */

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const document = body.document as GeneratedDocument | undefined
  if (!document || !document.type || !document.title || !Array.isArray(document.sections)) {
    return NextResponse.json(
      { error: 'document es requerido y debe incluir type, title, sections' },
      { status: 400 },
    )
  }

  // Org context para el header del PDF
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { name: true, razonSocial: true, ruc: true },
  })

  try {
    const doc = await createPDFDoc()
    const orgInfo = {
      name: org?.razonSocial ?? org?.name ?? 'Empresa',
      razonSocial: org?.razonSocial ?? null,
      ruc: org?.ruc ?? null,
    }
    const headerArgs = {
      title: document.title.length > 70 ? document.title.slice(0, 67) + '...' : document.title,
      org: orgInfo,
      subtitle: 'Documento de compliance generado por COMPLY360',
    }

    addHeader(doc, headerArgs.title, orgInfo, headerArgs.subtitle)
    let y = 56

    // Secciones
    for (const section of document.sections) {
      y = renderSection(doc, section, y, headerArgs)
    }

    // Base legal consolidada
    if (document.legalBasis.length > 0) {
      y = checkPageBreak(doc, y, 240, headerArgs)
      y = sectionTitle(doc, 'Bases Legales de Referencia', y)
      doc.setFontSize(8)
      doc.setTextColor(60, 60, 60)
      for (const ref of document.legalBasis) {
        y = checkPageBreak(doc, y, 275, headerArgs)
        doc.text(`• ${ref}`, 14, y, { maxWidth: 180 })
        y += 5
      }
      y += 4
    }

    // Disclaimer
    y = checkPageBreak(doc, y, 270, headerArgs)
    doc.setFontSize(6.5)
    doc.setTextColor(150, 150, 150)
    doc.text(
      'Documento generado por COMPLY360. Revisá el contenido con tu asesor legal antes de firmar y distribuir. Este documento es un borrador estructurado en base a la normativa peruana vigente; la responsabilidad final de su adecuación al caso concreto recae en la organización.',
      14, y, { maxWidth: 180 },
    )

    // Filename
    const dateSlug = new Date().toISOString().split('T')[0]
    const typeSlug = document.type.replace(/[^a-z0-9-]/gi, '')
    const filename = `COMPLY360_${typeSlug}_${dateSlug}.pdf`
    return finalizePDF(doc, filename)
  } catch (error) {
    console.error('[compliance-docs/pdf]', error)
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 })
  }
})
