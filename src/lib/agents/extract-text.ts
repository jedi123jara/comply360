/**
 * Helper compartido para extraer texto de archivos PDF/DOCX dentro del runtime
 * de agentes. Usa pdf-parse y mammoth (instalados en sesión anterior).
 *
 * Para PDFs escaneados (sin capa de texto), hace fallback automático a OCR
 * usando OCR.space (gratis) o Mistral OCR (si hay API key).
 */

import { ocrPdfBuffer, isTextInsufficient } from './ocr'
import { cleanContractText } from './text-cleaner'

// ── Polyfill DOMMatrix para Node.js ──────────────────────────────────────────
// pdfjs-dist (usado internamente por pdf-parse) requiere DOMMatrix,
// que solo existe en browsers. Lo polyfillamos antes de cualquier import.
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
    m11 = 1; m12 = 0; m13 = 0; m14 = 0
    m21 = 0; m22 = 1; m23 = 0; m24 = 0
    m31 = 0; m32 = 0; m33 = 1; m34 = 0
    m41 = 0; m42 = 0; m43 = 0; m44 = 1
    is2D = true; isIdentity = true
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_init?: string | number[]) {}
    translate(tx = 0, ty = 0, tz = 0) { void [tx, ty, tz]; return this }
    scale(sx = 1, sy?: number, sz = 1, ox = 0, oy = 0, oz = 0) { void [sx, sy, sz, ox, oy, oz]; return this }
    multiply(_other: unknown) { return this }
    inverse() { return this }
    toString() { return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})` }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).DOMMatrix = DOMMatrixPolyfill
}

/**
 * Limpia los marcadores de página `-- X of Y --` que pdf-parse v2 inserta
 * entre páginas en el texto concatenado.
 */
function cleanPdfParseMarkers(text: string): string {
  return text.replace(/\n*-- \d+ of \d+ --\n*/g, '\n\n').trim()
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const lower = fileName.toLowerCase()

  if (lower.endsWith('.pdf')) {
    // pdf-parse v2: new PDFParse({ data: buffer }).getText()
    // Retorna { pages: [{text, num}], text: string, total: number }
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const { PDFParse } = require('pdf-parse') as any
    const result = await new PDFParse({ data: buffer }).getText()
    const text: string = cleanContractText(cleanPdfParseMarkers(result.text || ''))

    // Si el texto es insuficiente → PDF escaneado → intentar OCR automático
    if (isTextInsufficient(text)) {
      console.log('[OCR] PDF sin texto suficiente, iniciando OCR automático...')
      const ocrText = await ocrPdfBuffer(buffer)
      return ocrText
    }

    return text
  }

  if (lower.endsWith('.docx')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ''
  }

  throw new Error(`Formato no soportado: ${fileName}. Usa PDF o DOCX.`)
}

/**
 * Trunca texto para que quepa en el contexto del LLM sin desperdiciar tokens.
 * Mantiene inicio + fin (más relevantes para actas/resoluciones).
 */
export function truncateForLlm(text: string, maxChars = 12000): string {
  if (text.length <= maxChars) return text
  const half = Math.floor(maxChars / 2) - 100
  return (
    text.slice(0, half) +
    '\n\n[... contenido omitido por longitud ...]\n\n' +
    text.slice(-half)
  )
}

// ================================================================
// Extracción por página con mapeo de offsets (legajo multi-contrato)
// ================================================================

export interface PdfPageText {
  /** Número de página 1-indexed */
  pageNumber: number
  /** Offset absoluto del inicio del texto de esta página dentro del texto completo */
  startOffset: number
  /** Offset absoluto del fin del texto de esta página */
  endOffset: number
  /** Texto de la página */
  text: string
}

export interface PdfTextWithPages {
  /** Texto completo concatenado con delimitadores de página */
  fullText: string
  /** Array de páginas con offsets */
  pages: PdfPageText[]
  /** Cantidad total de páginas */
  totalPages: number
}

/**
 * Extrae el texto de un PDF página por página, manteniendo un mapa
 * página → (offset inicio, offset fin) dentro del texto concatenado.
 *
 * Esto permite, dado un bloque de texto detectado por el splitter de
 * contratos, determinar EXACTAMENTE qué páginas del PDF original contienen
 * ese bloque y luego extraer físicamente esas páginas con pdf-lib.
 */
export async function extractTextByPage(buffer: Buffer): Promise<PdfTextWithPages> {
  // pdf-parse v2: getText() retorna:
  //   { pages: [{text: string, num: number}], text: string, total: number }
  //   - pages: array de objetos por página (text = contenido, num = nro de página)
  //   - text: texto completo con marcadores "-- X of Y --"
  //   - total: cantidad total de páginas (NÚMERO, no array)
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const { PDFParse } = require('pdf-parse') as any
  const parsed = await new PDFParse({ data: buffer }).getText()

  // ⚠️ CUIDADO: parsed.pages es un ARRAY [{text,num}], NO un número.
  //    El total de páginas está en parsed.total.
  const totalPages: number = typeof parsed.total === 'number' ? parsed.total : 1
  const pagesArray: Array<{ text: string; num: number }> = Array.isArray(parsed.pages) ? parsed.pages : []

  // Usar el array de páginas de pdf-parse v2 directamente (cada una tiene {text, num})
  const pageTexts: string[] = pagesArray.length > 0
    ? pagesArray.map((p: { text: string; num: number }) => (p.text || '').trim())
    : [cleanPdfParseMarkers(parsed.text || '').trim()]

  const pages: PdfPageText[] = []
  let cursor = 0
  let fullText = ''
  const PAGE_DELIM = '\n\n'
  for (let i = 0; i < pageTexts.length; i++) {
    const text = pageTexts[i]
    const startOffset = cursor
    fullText += text
    cursor += text.length
    const endOffset = cursor
    pages.push({
      pageNumber: i + 1,
      startOffset,
      endOffset,
      text,
    })
    if (i < pageTexts.length - 1) {
      fullText += PAGE_DELIM
      cursor += PAGE_DELIM.length
    }
  }

  // ── Fallback OCR para PDFs escaneados ──────────────────────────────────────
  // Si el texto total es insuficiente, el PDF es escaneado → OCR automático.
  // En modo OCR no tenemos offsets por página: devolvemos el texto como una
  // sola "página" virtual para que el splitter pueda procesar el texto completo.
  if (isTextInsufficient(fullText)) {
    console.log(`[OCR] PDF escaneado detectado (${totalPages} págs). Iniciando OCR automático...`)
    const ocrText = await ocrPdfBuffer(buffer)

    // Construir estructura de página única con el texto OCR completo
    const ocrPage: PdfPageText = {
      pageNumber: 1,
      startOffset: 0,
      endOffset: ocrText.length,
      text: ocrText,
    }

    return {
      fullText: ocrText,
      pages: [ocrPage],
      totalPages,
    }
  }

  return { fullText, pages, totalPages }
}

/**
 * Dado un rango de offsets absolutos en el texto completo, devuelve el rango
 * de páginas del PDF que contienen ese rango (1-indexed, inclusive).
 */
export function findPageRangeForOffsets(
  pages: PdfPageText[],
  startOffset: number,
  endOffset: number
): { startPage: number; endPage: number } {
  let startPage = 1
  let endPage = pages.length || 1
  for (const p of pages) {
    if (startOffset >= p.startOffset && startOffset <= p.endOffset) {
      startPage = p.pageNumber
    }
    if (endOffset >= p.startOffset && endOffset <= p.endOffset) {
      endPage = p.pageNumber
      break
    }
  }
  if (endPage < startPage) endPage = startPage
  return { startPage, endPage }
}

/**
 * Extrae físicamente un rango de páginas de un PDF y devuelve un nuevo
 * Buffer con solo esas páginas, usando pdf-lib.
 */
export async function extractPdfPagesToBuffer(
  sourceBuffer: Buffer,
  startPage: number,
  endPage: number
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFDocument } = require('pdf-lib')
  const src = await PDFDocument.load(new Uint8Array(sourceBuffer), {
    ignoreEncryption: true,
  })
  const total = src.getPageCount()
  const s = Math.max(1, Math.min(total, startPage))
  const e = Math.max(s, Math.min(total, endPage))
  const indices: number[] = []
  for (let i = s - 1; i <= e - 1; i++) indices.push(i)

  const dest = await PDFDocument.create()
  const copied = await dest.copyPages(src, indices)
  for (const p of copied) dest.addPage(p)
  const bytes = await dest.save()
  return Buffer.from(bytes)
}
