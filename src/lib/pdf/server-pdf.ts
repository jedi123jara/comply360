/**
 * Server-side PDF generation utility using jsPDF.
 * Works in Node.js without DOM dependencies.
 *
 * Shared helpers (addHeader, sectionTitle, kv, addPageNumbers)
 * are extracted from report-generator.ts for reuse across:
 *   - Diagnostic PDF export
 *   - Simulacro acta PDF export
 *   - Report PDF generation (server-side)
 *   - Inspeccion en Vivo PDF
 *   - SST document PDFs
 *   - Certification PDF
 */

import { NextResponse } from 'next/server'

// ─── jsPDF type wrapper ─────────────────────────────────────────────────────

export type JsPDFDoc = {
  setFontSize: (n: number) => JsPDFDoc
  setFont: (family: string, style?: string) => JsPDFDoc
  setTextColor: (r: number, g?: number, b?: number) => JsPDFDoc
  setFillColor: (r: number, g?: number, b?: number) => JsPDFDoc
  setDrawColor: (r: number, g?: number, b?: number) => JsPDFDoc
  text: (text: string | string[], x: number, y: number, options?: Record<string, unknown>) => JsPDFDoc
  rect: (x: number, y: number, w: number, h: number, style?: string) => JsPDFDoc
  line: (x1: number, y1: number, x2: number, y2: number) => JsPDFDoc
  addPage: () => JsPDFDoc
  save: (filename: string) => void
  output: (type: 'arraybuffer') => ArrayBuffer
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } }
  getNumberOfPages: () => number
  setPage: (n: number) => void
  splitTextToSize: (text: string, maxLen: number, options?: Record<string, unknown>) => string[]
}

// ─── Brand colors ───────────────────────────────────────────────────────────

const BRAND = {
  blue:  [30, 58, 110]  as const,
  light: [240, 245, 255] as const,
  gold:  [250, 204, 21]  as const,
  red:   [239, 68, 68]   as const,
  green: [34, 197, 94]   as const,
  amber: [245, 158, 11]  as const,
}

// ─── Shared PDF helpers ─────────────────────────────────────────────────────

export function addHeader(
  doc: JsPDFDoc,
  title: string,
  org: { name?: string; razonSocial?: string | null; ruc?: string | null },
  subtitle?: string,
) {
  const w = doc.internal.pageSize.getWidth()

  // Blue header bar
  doc.setFillColor(...BRAND.blue)
  doc.rect(0, 0, w, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('COMPLY360', 14, 11)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Plataforma de Compliance Laboral — Peru', 14, 18)

  doc.setFontSize(8)
  const orgName = org.razonSocial ?? org.name ?? ''
  doc.text(orgName, w - 14, 11, { align: 'right' })
  if (org.ruc) doc.text(`RUC: ${org.ruc}`, w - 14, 18, { align: 'right' })
  const dateStr = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(dateStr, w - 14, 24, { align: 'right' })

  // Title row
  doc.setFillColor(...BRAND.light)
  doc.rect(0, 28, w, 16, 'F')
  doc.setTextColor(...BRAND.blue)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 39)

  if (subtitle) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, w - 14, 39, { align: 'right' })
  }

  doc.setTextColor(60, 60, 60)
}

export function addPageNumbers(doc: JsPDFDoc) {
  const total = doc.getNumberOfPages()
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const dateStr = new Date().toLocaleDateString('es-PE')
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Pagina ${i} de ${total}  |  Generado por COMPLY360  |  ${dateStr}`,
      w / 2, h - 8, { align: 'center' },
    )
  }
}

export function sectionTitle(doc: JsPDFDoc, text: string, y: number): number {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(245, 247, 250)
  doc.rect(14, y - 4, w - 28, 10, 'F')
  doc.setTextColor(...BRAND.blue)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(text, 16, y + 2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  return y + 12
}

export function kv(doc: JsPDFDoc, label: string, value: string, x: number, y: number, labelWidth = 55): number {
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text(label + ':', x, y)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.text(value, x + labelWidth, y)
  doc.setFont('helvetica', 'normal')
  return y + 6
}

/**
 * Check if we need a page break and add one if needed.
 * Returns the new Y position (either same or reset to top of new page).
 */
export function checkPageBreak(
  doc: JsPDFDoc,
  y: number,
  margin = 270,
  headerArgs?: { title: string; org: { name?: string; razonSocial?: string | null; ruc?: string | null }; subtitle?: string },
): number {
  if (y > margin) {
    doc.addPage()
    if (headerArgs) {
      addHeader(doc, headerArgs.title, headerArgs.org, headerArgs.subtitle)
    }
    return 56
  }
  return y
}

/**
 * Draw a score badge (colored circle with number)
 */
export function drawScoreBadge(doc: JsPDFDoc, score: number, x: number, y: number, size = 'large' as 'large' | 'small') {
  const r = size === 'large' ? 14 : 8
  const [cr, cg, cb] = score >= 80 ? BRAND.green : score >= 60 ? BRAND.amber : BRAND.red

  // Outer ring
  doc.setDrawColor(cr, cg, cb)
  doc.setFillColor(255, 255, 255)

  // Filled background
  doc.setFillColor(cr, cg, cb)
  doc.rect(x - r, y - r, r * 2, r * 2, 'F')

  // Score text
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(size === 'large' ? 20 : 12)
  doc.setFont('helvetica', 'bold')
  doc.text(`${score}`, x, y + (size === 'large' ? 3 : 2), { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
}

/**
 * Draw a horizontal bar chart for area scores
 */
export function drawBarChart(doc: JsPDFDoc, items: { label: string; score: number; weight: number }[], x: number, y: number): number {
  const barH = 5
  const barW = 80
  const gap = 8

  for (const item of items) {
    // Label
    doc.setFontSize(7)
    doc.setTextColor(80, 80, 80)
    doc.text(item.label, x, y + 3)

    // Background bar
    const bx = x + 60
    doc.setFillColor(230, 230, 230)
    doc.rect(bx, y - 1, barW, barH, 'F')

    // Filled bar
    const [cr, cg, cb] = item.score >= 80 ? BRAND.green : item.score >= 60 ? BRAND.amber : BRAND.red
    doc.setFillColor(cr, cg, cb)
    doc.rect(bx, y - 1, barW * (item.score / 100), barH, 'F')

    // Score value
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(`${item.score}%`, bx + barW + 3, y + 3)
    doc.setFont('helvetica', 'normal')

    // Weight
    doc.setTextColor(150, 150, 150)
    doc.text(`(${item.weight}%)`, bx + barW + 16, y + 3)

    y += gap
  }

  return y
}

// ─── Table drawing utility ──────────────────────────────────────────────────

export interface TableColumn {
  header: string
  x: number
  width?: number
  align?: 'left' | 'right' | 'center'
}

export function drawTable(
  doc: JsPDFDoc,
  columns: TableColumn[],
  rows: string[][],
  startY: number,
  opts?: {
    headerArgs?: { title: string; org: { name?: string; razonSocial?: string | null; ruc?: string | null }; subtitle?: string }
    rowHeight?: number
    fontSize?: number
    zebraFill?: boolean
  },
): number {
  const rowH = opts?.rowHeight ?? 5.5
  const fontSize = opts?.fontSize ?? 8
  let y = startY

  // Header row
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(60, 60, 60)
  for (const col of columns) {
    doc.text(col.header, col.x, y, col.align ? { align: col.align } : undefined)
  }
  y += 2.5
  doc.setDrawColor(200, 200, 200)
  doc.line(columns[0].x, y, 196, y)
  y += 3
  doc.setFont('helvetica', 'normal')

  // Data rows
  for (let i = 0; i < rows.length; i++) {
    if (opts?.zebraFill && i % 2 === 1) {
      doc.setFillColor(248, 249, 250)
      doc.rect(columns[0].x - 2, y - 3.5, 196 - columns[0].x + 4, rowH, 'F')
    }

    doc.setFontSize(fontSize)
    doc.setTextColor(30, 30, 30)
    for (let j = 0; j < columns.length; j++) {
      const text = rows[i]?.[j] ?? ''
      doc.text(text, columns[j].x, y, columns[j].align ? { align: columns[j].align } : undefined)
    }

    y += rowH
    y = opts?.headerArgs ? checkPageBreak(doc, y, 270, opts.headerArgs) : checkPageBreak(doc, y)
  }

  return y
}

// ─── Create jsPDF instance ──────────────────────────────────────────────────

export async function createPDFDoc(): Promise<JsPDFDoc> {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({ unit: 'mm', format: 'a4' }) as unknown as JsPDFDoc
}

// ─── Response helpers ───────────────────────────────────────────────────────

/**
 * Return a PDF as a downloadable NextResponse.
 */
export function pdfResponse(buffer: ArrayBuffer, filename: string): NextResponse {
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

/**
 * Finalize a jsPDF document and return a downloadable NextResponse.
 */
export function finalizePDF(doc: JsPDFDoc, filename: string): NextResponse {
  addPageNumbers(doc)
  const buffer = doc.output('arraybuffer')
  return pdfResponse(buffer, filename)
}
