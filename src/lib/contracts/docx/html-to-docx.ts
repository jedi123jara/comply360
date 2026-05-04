// =============================================
// HTML → DOCX (server-side, sin plantilla)
// Generador de Contratos / Chunk 6
//
// Convierte un contentHtml razonable (h1, h2, h3, p, ul, ol, table, b/i/u,
// a, br) en un .docx OOXML auténtico usando la librería `docx`.
//
// No es un parser de HTML completo — está pensado para el output del
// editor del módulo de contratos, que produce HTML limpio.
// =============================================

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx'
import type { Paragraph as DocxParagraph, TableRow as DocxTableRow } from 'docx'

export interface HtmlToDocxInput {
  title: string
  /** Contenido HTML — mantén marcado simple (sin scripts ni inline styles). */
  contentHtml: string
  /** Pie de página opcional. Evitar marca SaaS en documentos oficiales. */
  footer?: string
  /** Metadatos OOXML. */
  author?: string
  company?: string
}

const FONT = 'Times New Roman'

// Estilos base (rgba/hex sin "#")
const HEADING_COLOR = '111827'
const TEXT_COLOR = '111111'
const SUBTLE = '4B5563'

interface InlineState {
  bold: boolean
  italic: boolean
  underline: boolean
}

const INITIAL_INLINE: InlineState = { bold: false, italic: false, underline: false }

/**
 * Tokenizer/parser muy simple para HTML controlado. NO maneja XSS de fuente
 * arbitraria — sanitiza con DOMPurify upstream si el HTML viene del usuario.
 */
function htmlToBlocks(html: string): Array<DocxParagraph | Table> {
  // Normalizar
  const cleaned = html
    .replace(/\r\n/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

  // Splitter por bloques top-level. Soporta h1-h3, p, ul, ol, table.
  const blockRegex = /<(h1|h2|h3|p|ul|ol|table|section)[^>]*>([\s\S]*?)<\/\1>/gi
  const blocks: Array<DocxParagraph | Table> = []
  let match: RegExpExecArray | null

  while ((match = blockRegex.exec(cleaned)) !== null) {
    const tag = match[1].toLowerCase()
    const inner = match[2]

    switch (tag) {
      case 'h1':
        blocks.push(makeHeading(inner, HeadingLevel.HEADING_1, 32))
        break
      case 'h2':
        blocks.push(makeHeading(inner, HeadingLevel.HEADING_2, 28))
        break
      case 'h3':
        blocks.push(makeHeading(inner, HeadingLevel.HEADING_3, 24))
        break
      case 'p':
        blocks.push(makeParagraph(inner))
        break
      case 'ul':
        for (const item of extractListItems(inner)) blocks.push(makeListItem(item, false))
        break
      case 'ol':
        for (const item of extractListItems(inner)) blocks.push(makeListItem(item, true))
        break
      case 'table':
        blocks.push(makeTable(inner))
        break
      case 'section':
        // Sections (ej: cláusulas insertadas) — recursivo
        for (const inner2 of htmlToBlocks(inner)) blocks.push(inner2)
        break
    }
  }

  // Si no se encontró ningún bloque (HTML sin tags), generar un párrafo con todo
  if (blocks.length === 0 && cleaned.trim()) {
    blocks.push(makeParagraph(cleaned))
  }

  return blocks
}

function makeHeading(inner: string, level: typeof HeadingLevel[keyof typeof HeadingLevel], size: number): DocxParagraph {
  return new Paragraph({
    heading: level,
    spacing: { before: 280, after: 140 },
    children: parseInline(inner, { ...INITIAL_INLINE, bold: true }, { color: HEADING_COLOR, size }),
  })
}

function makeParagraph(inner: string): DocxParagraph {
  return new Paragraph({
    spacing: { after: 140, line: 360 },
    alignment: AlignmentType.JUSTIFIED,
    children: parseInline(inner, INITIAL_INLINE, { color: TEXT_COLOR, size: 22 }),
  })
}

function makeListItem(text: string, ordered: boolean): DocxParagraph {
  return new Paragraph({
    bullet: ordered ? undefined : { level: 0 },
    numbering: ordered ? { reference: 'default-numbering', level: 0 } : undefined,
    spacing: { after: 100, line: 360 },
    children: parseInline(text, INITIAL_INLINE, { color: TEXT_COLOR, size: 22 }),
  })
}

function extractListItems(html: string): string[] {
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) out.push(m[1])
  return out
}

function makeTable(html: string): Table {
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const rows: DocxTableRow[] = []
  let rm: RegExpExecArray | null
  while ((rm = rowRegex.exec(html)) !== null) {
    const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi
    const cells: TableCell[] = []
    let cm: RegExpExecArray | null
    while ((cm = cellRegex.exec(rm[1])) !== null) {
      const isHeader = cm[1].toLowerCase() === 'th'
      cells.push(
        new TableCell({
          children: [makeParagraph(cm[2])],
          shading: isHeader
            ? { type: 'clear', color: 'auto', fill: 'F3F4F6' }
            : undefined,
        }),
      )
    }
    rows.push(new TableRow({ children: cells }))
  }
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(),
  })
}

function tableBorders() {
  const b = { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' }
  return { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b }
}

/** Parser inline minimal: soporta <b>, <strong>, <i>, <em>, <u>, <br>. */
function parseInline(html: string, inherited: InlineState, base: { color: string; size: number }): TextRun[] {
  const tokens = tokenizeInline(html, inherited)
  return tokens.map((t) => new TextRun({
    text: t.text,
    bold: t.state.bold,
    italics: t.state.italic,
    underline: t.state.underline ? {} : undefined,
    color: base.color,
    font: FONT,
    size: base.size,
    break: t.lineBreak ? 1 : undefined,
  }))
}

interface InlineToken { text: string; state: InlineState; lineBreak?: boolean }

function tokenizeInline(html: string, state: InlineState): InlineToken[] {
  const tokens: InlineToken[] = []
  let i = 0
  while (i < html.length) {
    const lt = html.indexOf('<', i)
    if (lt === -1) {
      const text = stripTags(html.slice(i))
      if (text) tokens.push({ text, state })
      break
    }
    if (lt > i) {
      const text = stripTags(html.slice(i, lt))
      if (text) tokens.push({ text, state })
    }
    const gt = html.indexOf('>', lt)
    if (gt === -1) break
    const tag = html.slice(lt + 1, gt).toLowerCase().trim()
    if (tag === 'br' || tag === 'br/' || tag === 'br /') {
      tokens.push({ text: '', state, lineBreak: true })
      i = gt + 1
      continue
    }
    if (tag === 'b' || tag === 'strong') {
      const close = findCloseTag(html, gt + 1, tag)
      if (close === -1) { i = gt + 1; continue }
      const inner = html.slice(gt + 1, close)
      tokens.push(...tokenizeInline(inner, { ...state, bold: true }))
      i = html.indexOf('>', close) + 1
      continue
    }
    if (tag === 'i' || tag === 'em') {
      const close = findCloseTag(html, gt + 1, tag)
      if (close === -1) { i = gt + 1; continue }
      tokens.push(...tokenizeInline(html.slice(gt + 1, close), { ...state, italic: true }))
      i = html.indexOf('>', close) + 1
      continue
    }
    if (tag === 'u') {
      const close = findCloseTag(html, gt + 1, tag)
      if (close === -1) { i = gt + 1; continue }
      tokens.push(...tokenizeInline(html.slice(gt + 1, close), { ...state, underline: true }))
      i = html.indexOf('>', close) + 1
      continue
    }
    // Tag desconocida: la saltamos
    i = gt + 1
  }
  return tokens
}

function findCloseTag(html: string, from: number, tag: string): number {
  const re = new RegExp(`</${tag}\\s*>`, 'i')
  const m = re.exec(html.slice(from))
  return m ? from + m.index : -1
}

function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, '').trim()
}

/**
 * Genera un Buffer .docx desde HTML simple.
 */
export async function htmlToDocxBuffer(input: HtmlToDocxInput): Promise<Buffer> {
  const blocks = htmlToBlocks(input.contentHtml)
  const company = input.company?.trim() || 'Documento legal'
  const titleParagraph = new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 240, line: 320 },
    children: [
      new TextRun({
        text: input.title.toUpperCase(),
        bold: true,
        color: HEADING_COLOR,
        font: FONT,
        size: 36,
      }),
    ],
  })

  const headerNote = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 520 },
    children: [
      new TextRun({
        text: `${company} | Documento legal | ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        color: SUBTLE,
        font: FONT,
        size: 18,
      }),
    ],
  })

  const footerParagraph = input.footer
    ? new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480 },
        children: [
          new TextRun({
            text: input.footer,
            color: SUBTLE,
            font: FONT,
            size: 16,
          }),
        ],
      })
    : null

  const doc = new Document({
    creator: input.author ?? 'Documento legal',
    title: input.title,
    description: input.company
      ? `Contrato laboral oficial - ${input.company}`
      : 'Contrato laboral oficial',
    styles: {
      default: {
        document: { run: { font: FONT, size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 }, // ~2 cm
          },
        },
        children: [
          titleParagraph,
          headerNote,
          ...blocks,
          ...(footerParagraph ? [footerParagraph] : []),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
