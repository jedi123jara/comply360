/**
 * Helpers de generación de PDF para CONTRATOS LABORALES.
 *
 * Diseño deliberadamente paralelo a `server-pdf.ts`: no comparte helpers de
 * branding (encabezado azul COMPLY360, footer "Generado por…") porque un
 * contrato debe verse como documento legal propio de la empresa cliente, no
 * como export automático de una plataforma SaaS.
 *
 * Estilo:
 *   - Tipografía Times Roman 11pt (estándar legal peruano)
 *   - Justificación completa, márgenes 25 mm
 *   - Cláusulas con título Bold + cuerpo justificado + base legal en pie
 *     Times-Italic 8pt gris debajo de cada una
 *   - Portada formal con título centrado y bloque ENTRE … Y …
 *   - Bloque de firmas amplio con espacio para sello y huella
 *   - Footer mínimo "Página i de N" sin marca de plataforma
 */

import { NextResponse } from 'next/server'
import {
  createPDFDoc as createBasePDFDoc,
  pdfResponse,
  type JsPDFDoc as BaseJsPDFDoc,
} from './server-pdf'
import type { CleanedContract } from './contract-content-cleaner'

// ─── Tipo extendido (incluye APIs que server-pdf.ts no expone) ─────────────

export interface JsPDFContractDoc extends BaseJsPDFDoc {
  splitTextToSize: (text: string, maxWidth: number) => string[]
  addImage: (
    data: Uint8Array | ArrayBuffer | string,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => JsPDFContractDoc
  getStringUnitWidth: (text: string) => number
}

// ─── Layout / constantes visuales ──────────────────────────────────────────

export const CONTRACT_LAYOUT = {
  marginX: 25, // mm
  marginTop: 28,
  marginBottom: 22,
  paragraphGap: 4.5, // mm entre párrafos del mismo bloque
  clauseGap: 8.5, // mm antes de cada cláusula numerada
  lineHeight: 5.4, // mm — para 11pt body con leading ~135%
  bodyFontSize: 11,
  clauseTitleFontSize: 11,
  pageTitleFontSize: 22,
  pageSubtitleFontSize: 12,
  baseLegalFontSize: 8,
  footerFontSize: 8,
  textColor: [30, 30, 30] as const,
  mutedColor: [120, 120, 120] as const,
  hairlineColor: [200, 200, 200] as const,
} as const

const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function fechaEnLetras(d: Date): string {
  return `${d.getDate()} de ${MESES_ES[d.getMonth()]} de ${d.getFullYear()}`
}

// ─── Carga de logo de empresa ──────────────────────────────────────────────

export interface OrgLogo {
  data: Uint8Array
  format: 'PNG' | 'JPEG'
}

/**
 * Descarga el logo de la organización a bytes para inyectarlo en el PDF.
 * Devuelve null si la URL falla, no es PNG/JPEG, o pesa más de 2 MB.
 * Nunca tira excepción — el helper que lo usa simplemente omite el logo.
 */
export async function loadOrgLogoBytes(url: string | null | undefined): Promise<OrgLogo | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase()
    let format: 'PNG' | 'JPEG' | null = null
    if (contentType.includes('png')) format = 'PNG'
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) format = 'JPEG'
    else if (url.toLowerCase().endsWith('.png')) format = 'PNG'
    else if (/\.(jpe?g)$/i.test(url)) format = 'JPEG'
    if (!format) return null
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > 2 * 1024 * 1024) return null
    return { data: new Uint8Array(buffer), format }
  } catch {
    return null
  }
}

// ─── Crear documento ───────────────────────────────────────────────────────

export async function createContractPDFDoc(): Promise<JsPDFContractDoc> {
  const doc = (await createBasePDFDoc()) as JsPDFContractDoc
  doc.setFont('times', 'normal')
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
  return doc
}

// ─── Portada ───────────────────────────────────────────────────────────────

export interface CoverPageOpts {
  title: string
  org: { razonSocial?: string | null; name?: string | null; ruc?: string | null }
  logo?: OrgLogo | null
  workerFullName: string
  workerDni: string
  ciudad: string
  fechaIngreso?: string | Date | null
  contractType?: string | null
  legalFamily?: string | null
  documentVersion?: string | null
}

export function addCoverPage(doc: JsPDFContractDoc, opts: CoverPageOpts): void {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const cx = W / 2
  const x = CONTRACT_LAYOUT.marginX
  const maxWidth = W - CONTRACT_LAYOUT.marginX * 2

  // Logo centrado en el tercio superior si existe
  if (opts.logo) {
    const logoW = 40
    const logoH = 18
    doc.addImage(opts.logo.data, opts.logo.format, cx - logoW / 2, 32, logoW, logoH)
  }

  // Título centrado en negrita mayúsculas
  doc.setFont('times', 'bold')
  doc.setFontSize(19)
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
  const titleUpper = opts.title.toUpperCase()
  const titleLines = doc.splitTextToSize(titleUpper, maxWidth - 18)
  const titleY = opts.logo ? 72 : 82
  doc.text(titleLines, cx, titleY, { align: 'center' })

  // Línea decorativa bajo el título
  const titleLineY = titleY + titleLines.length * 7 + 2
  doc.setDrawColor(...CONTRACT_LAYOUT.hairlineColor)
  doc.line(cx - 58, titleLineY, cx + 58, titleLineY)

  doc.setFont('times', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
  doc.text('DOCUMENTO LEGAL LABORAL | PERÚ', cx, titleLineY + 7, { align: 'center' })

  // Bloque "ENTRE … Y …" en el medio de la página
  const empleador = opts.org.razonSocial ?? opts.org.name ?? ''
  const blockY = H / 2 - 10

  doc.setFont('times', 'normal')
  doc.setFontSize(CONTRACT_LAYOUT.pageSubtitleFontSize)
  doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
  doc.text('Celebrado entre', cx, blockY, { align: 'center' })

  doc.setFont('times', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
  doc.text(empleador.toUpperCase(), cx, blockY + 9, { align: 'center' })

  if (opts.org.ruc) {
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
    doc.text(`RUC ${opts.org.ruc}`, cx, blockY + 15, { align: 'center' })
  }

  doc.setFont('times', 'italic')
  doc.setFontSize(CONTRACT_LAYOUT.pageSubtitleFontSize)
  doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
  doc.text('y', cx, blockY + 25, { align: 'center' })

  doc.setFont('times', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
  doc.text(opts.workerFullName.toUpperCase(), cx, blockY + 33, { align: 'center' })

  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
  if (opts.workerDni) doc.text(`DNI ${opts.workerDni}`, cx, blockY + 39, { align: 'center' })

  // Ficha de control sobria: suficiente para archivo legal sin convertir la
  // portada en una pantalla de sistema.
  const controlY = blockY + 56
  const rowH = 8
  const labelW = 38
  const valueW = maxWidth - labelW
  const rows = [
    ['Tipo documental', opts.contractType ?? 'Contrato'],
    ['Jurisdicción', 'Perú'],
    ['Familia legal', opts.legalFamily ?? 'Laboral'],
    ['Versión de emisión', opts.documentVersion ?? 'contract-render-v1'],
  ]
  doc.setDrawColor(222, 222, 222)
  rows.forEach(([label, value], index) => {
    const rowY = controlY + index * rowH
    doc.rect(x, rowY, labelW, rowH)
    doc.rect(x + labelW, rowY, valueW, rowH)
    doc.setFont('times', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...CONTRACT_LAYOUT.textColor)
    doc.text(label, x + 3, rowY + 5.3)
    doc.setFont('times', 'normal')
    doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
    doc.text(String(value), x + labelW + 3, rowY + 5.3)
  })

  // Pie de portada: ciudad y fecha en cursiva
  doc.setFont('times', 'italic')
  doc.setFontSize(CONTRACT_LAYOUT.pageSubtitleFontSize)
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
  const fecha = opts.fechaIngreso ? new Date(opts.fechaIngreso) : new Date()
  doc.text(`${opts.ciudad}, ${fechaEnLetras(fecha)}`, cx, H - 40, { align: 'center' })

  doc.setDrawColor(230, 230, 230)
  doc.line(x, H - 24, W - x, H - 24)
  doc.setFont('times', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
  doc.text('Documento preparado para suscripción y archivo en legajo laboral.', cx, H - 19, { align: 'center' })

  // Resetear estilos
  doc.setFont('times', 'normal')
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
}

// ─── Header de páginas internas ────────────────────────────────────────────

export interface ContractHeaderOpts {
  org: { razonSocial?: string | null; name?: string | null; ruc?: string | null }
  logo?: OrgLogo | null
}

/**
 * Header compacto para páginas 2+ (después de la portada). Muestra solo la
 * empresa cliente. NO emite ninguna referencia a COMPLY360.
 */
export function addContractHeader(doc: JsPDFContractDoc, opts: ContractHeaderOpts): void {
  const W = doc.internal.pageSize.getWidth()
  const empleador = opts.org.razonSocial ?? opts.org.name ?? ''
  const marginX = CONTRACT_LAYOUT.marginX

  // Logo pequeño a la izquierda
  if (opts.logo) {
    const logoW = 22
    const logoH = 9
    doc.addImage(opts.logo.data, opts.logo.format, marginX, 12, logoW, logoH)
  }

  // Razón social + RUC a la derecha
  doc.setFont('times', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
  doc.text(empleador, W - marginX, 16, { align: 'right' })

  if (opts.org.ruc) {
    doc.setFont('times', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
    doc.text(`RUC ${opts.org.ruc}`, W - marginX, 21, { align: 'right' })
  }

  // Línea fina separadora
  doc.setDrawColor(...CONTRACT_LAYOUT.hairlineColor)
  doc.line(marginX, 25, W - marginX, 25)

  // Reset
  doc.setFont('times', 'normal')
  doc.setFontSize(CONTRACT_LAYOUT.bodyFontSize)
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
}

// ─── Justified paragraph ───────────────────────────────────────────────────

/**
 * Imprime un párrafo con justificación completa. La última línea queda
 * align-left (comportamiento estándar de jsPDF).
 *
 * Devuelve la nueva posición Y después del párrafo.
 */
export function drawJustifiedParagraph(
  doc: JsPDFContractDoc,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const trimmed = text.trim()
  if (!trimmed) return y
  const lines = doc.splitTextToSize(trimmed, maxWidth)
  if (lines.length === 0) return y
  // align: 'justify' funciona desde jsPDF 1.5+
  doc.text(lines, x, y, { maxWidth, align: 'justify' })
  return y + lines.length * lineHeight
}

// ─── Page break helper para contratos ──────────────────────────────────────

/**
 * Page break que NO agrega header automáticamente — los headers internos
 * se manejan al inicio de cada página por el caller, una sola vez.
 */
export function checkContractPageBreak(
  doc: JsPDFContractDoc,
  y: number,
  reservedBottom = CONTRACT_LAYOUT.marginBottom + 6,
  headerOpts?: ContractHeaderOpts,
): number {
  const H = doc.internal.pageSize.getHeight()
  const limit = H - reservedBottom
  if (y > limit) {
    doc.addPage()
    if (headerOpts) addContractHeader(doc, headerOpts)
    return CONTRACT_LAYOUT.marginTop + (headerOpts ? 8 : 0)
  }
  return y
}

// ─── Render del cuerpo (cláusulas) ─────────────────────────────────────────

export interface RenderBodyOpts {
  startY: number
  headerOpts?: ContractHeaderOpts
}

export function renderContractBody(
  doc: JsPDFContractDoc,
  cleaned: CleanedContract,
  opts: RenderBodyOpts,
): number {
  const W = doc.internal.pageSize.getWidth()
  const x = CONTRACT_LAYOUT.marginX
  const maxWidth = W - CONTRACT_LAYOUT.marginX * 2
  const lh = CONTRACT_LAYOUT.lineHeight
  let y = opts.startY

  doc.setFont('times', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
  doc.text('CUERPO CONTRACTUAL', x, y)
  y += 7
  doc.setDrawColor(220, 220, 220)
  doc.line(x, y, x + maxWidth, y)
  y += 9

  // Preámbulo
  if (cleaned.preamble) {
    doc.setFont('times', 'normal')
    doc.setFontSize(CONTRACT_LAYOUT.bodyFontSize)
    doc.setTextColor(...CONTRACT_LAYOUT.textColor)
    const blocks = cleaned.preamble.split(/\n\s*\n+/).filter(Boolean)
    for (const block of blocks) {
      y = checkContractPageBreak(doc, y, undefined, opts.headerOpts)
      y = drawJustifiedParagraph(doc, block, x, y, maxWidth, lh)
      y += CONTRACT_LAYOUT.paragraphGap
    }
    y += CONTRACT_LAYOUT.paragraphGap
  }

  // Cláusulas
  for (const clause of cleaned.clauses) {
    // Reservar espacio para que el título no quede huérfano al final de la
    // página (al menos título + 2 líneas de cuerpo).
    y = checkContractPageBreak(doc, y + CONTRACT_LAYOUT.clauseGap, lh * 3, opts.headerOpts)

    // Título de cláusula
    if (clause.title) {
      doc.setFont('times', 'bold')
      doc.setFontSize(CONTRACT_LAYOUT.clauseTitleFontSize)
      doc.setTextColor(...CONTRACT_LAYOUT.textColor)
      doc.text(clause.title, x, y)
      y += lh + 1
    }

    // Cuerpo justificado
    if (clause.body) {
      doc.setFont('times', 'normal')
      doc.setFontSize(CONTRACT_LAYOUT.bodyFontSize)
      doc.setTextColor(...CONTRACT_LAYOUT.textColor)
      const paragraphs = clause.body.split(/\n\s*\n+/).filter(Boolean)
      for (const para of paragraphs) {
        y = checkContractPageBreak(doc, y, undefined, opts.headerOpts)
        y = drawJustifiedParagraph(doc, para, x, y, maxWidth, lh)
        y += CONTRACT_LAYOUT.paragraphGap
      }
    }

    // Pie de cláusula con base legal en italic 8pt gris
    if (clause.baseLegal) {
      y = checkContractPageBreak(doc, y, undefined, opts.headerOpts)
      doc.setFont('times', 'italic')
      doc.setFontSize(CONTRACT_LAYOUT.baseLegalFontSize)
      doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
      doc.text(`Base legal: ${clause.baseLegal}`, x, y)
      y += 4
    }

    y += 2 // pequeño respiro entre cláusulas
  }

  // Cierre
  if (cleaned.closingParagraph) {
    y += CONTRACT_LAYOUT.paragraphGap
    doc.setFont('times', 'normal')
    doc.setFontSize(CONTRACT_LAYOUT.bodyFontSize)
    doc.setTextColor(...CONTRACT_LAYOUT.textColor)
    const blocks = cleaned.closingParagraph.split(/\n\s*\n+/).filter(Boolean)
    for (const block of blocks) {
      y = checkContractPageBreak(doc, y, undefined, opts.headerOpts)
      y = drawJustifiedParagraph(doc, block, x, y, maxWidth, lh)
      y += CONTRACT_LAYOUT.paragraphGap
    }
  }

  return y
}

// ─── Bloque de firmas ──────────────────────────────────────────────────────

export interface SignatureBlockOpts {
  empleador: { razonSocial: string; ruc: string }
  trabajador: { fullName: string; dni: string }
  ciudad: string
  fecha: Date
  headerOpts?: ContractHeaderOpts
}

export function addSignatureBlock(
  doc: JsPDFContractDoc,
  y: number,
  opts: SignatureBlockOpts,
): number {
  const W = doc.internal.pageSize.getWidth()
  const x = CONTRACT_LAYOUT.marginX
  const maxWidth = W - CONTRACT_LAYOUT.marginX * 2
  const lh = CONTRACT_LAYOUT.lineHeight

  // Espacio antes del bloque
  y += 14

  // Si no caben las firmas + lugar/fecha + 2 líneas, salto a página nueva
  const REQUIRED_HEIGHT = 70
  const H = doc.internal.pageSize.getHeight()
  if (y + REQUIRED_HEIGHT > H - CONTRACT_LAYOUT.marginBottom) {
    doc.addPage()
    if (opts.headerOpts) addContractHeader(doc, opts.headerOpts)
    y = CONTRACT_LAYOUT.marginTop + (opts.headerOpts ? 8 : 0)
  }

  // Lugar y fecha
  doc.setFont('times', 'normal')
  doc.setFontSize(CONTRACT_LAYOUT.bodyFontSize)
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
  const lugarFecha = `Suscrito en ${opts.ciudad}, a los ${fechaEnLetras(opts.fecha)}.`
  y = drawJustifiedParagraph(doc, lugarFecha, x, y, maxWidth, lh)
  y += 26 // espacio físico para firma manuscrita y sello

  // Dos columnas: izquierda EL EMPLEADOR, derecha EL TRABAJADOR
  const colW = (maxWidth - 20) / 2
  const leftCenter = x + colW / 2
  const rightCenter = x + colW + 20 + colW / 2

  // Líneas de firma
  doc.setDrawColor(80, 80, 80)
  doc.line(x, y, x + colW, y)
  doc.line(x + colW + 20, y, x + maxWidth, y)

  // Etiquetas EL EMPLEADOR / EL TRABAJADOR
  doc.setFont('times', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)
  doc.text('EL EMPLEADOR', leftCenter, y + 5, { align: 'center' })
  doc.text('EL TRABAJADOR', rightCenter, y + 5, { align: 'center' })

  // Razón social + RUC (izquierda) | Nombre + DNI (derecha)
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  doc.text(opts.empleador.razonSocial, leftCenter, y + 11, { align: 'center' })
  doc.text(opts.trabajador.fullName, rightCenter, y + 11, { align: 'center' })

  doc.setFont('times', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
  if (opts.empleador.ruc) {
    doc.text(`RUC ${opts.empleador.ruc}`, leftCenter, y + 16, { align: 'center' })
  }
  doc.text(`DNI ${opts.trabajador.dni}`, rightCenter, y + 16, { align: 'center' })

  // Texto de ayuda "Firma y sello" / "Firma y huella"
  doc.setFont('times', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...CONTRACT_LAYOUT.mutedColor)
  doc.text('Firma y sello', leftCenter, y + 22, { align: 'center' })
  doc.text('Firma y huella digital', rightCenter, y + 22, { align: 'center' })

  // Reset
  doc.setFont('times', 'normal')
  doc.setTextColor(...CONTRACT_LAYOUT.textColor)

  return y + 26
}

// ─── Footer minimalista ────────────────────────────────────────────────────

export function addContractFooter(doc: JsPDFContractDoc): void {
  const total = doc.getNumberOfPages()
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFont('times', 'normal')
    doc.setFontSize(CONTRACT_LAYOUT.footerFontSize)
    doc.setTextColor(150, 150, 150)
    doc.text(`Página ${i} de ${total}`, W / 2, H - 10, { align: 'center' })
  }
}

// ─── Finalize ──────────────────────────────────────────────────────────────

export function contractPDFBuffer(doc: JsPDFContractDoc): ArrayBuffer {
  addContractFooter(doc)
  return doc.output('arraybuffer')
}

export function finalizeContractPDF(doc: JsPDFContractDoc, filename: string): NextResponse {
  const buffer = contractPDFBuffer(doc)
  return pdfResponse(buffer, filename)
}
