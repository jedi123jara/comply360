#!/usr/bin/env node
/**
 * Ingest PDF Informes Explicativos → Markdown para RAG.
 *
 * Convierte los 13 PDFs de "08 Informes explicativos" del pack
 * Compensaciones 30° a archivos Markdown + un índice TS.
 *
 * Output:
 *   src/data/legal/corpus/<slug>.md          — texto limpio por informe
 *   src/data/legal/corpus/index.ts           — metadata + helper para RAG
 *
 * Corre con:
 *   node scripts/ingest/ingest-corpus.mjs
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PDFParse } = require('pdf-parse')

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..', '..')
const SRC = 'C:/Users/User/Desktop/IMPRIMIR/Pack de  Compensaciones Laborales 30°/Materiales/08 Informes explicativos'
const OUT_DIR = path.join(ROOT, 'src/data/legal/corpus')

// Map filename → { slug, title, topic, legalRef }
const META = {
  '01  Informe explicativo - Auditoría laboral - due diligence.docx': { slug: 'auditoria-due-diligence', title: 'Auditoría laboral / Due diligence', topic: 'auditoria', skip: true },
  '02 Informe explicativo - Las remuneraciones.pdf': { slug: 'remuneraciones', title: 'Las remuneraciones', topic: 'remuneraciones', legalRef: 'D.Leg. 728, art. 6' },
  '03  Informe explicativo - Ingresos no remunerativos.pdf': { slug: 'ingresos-no-remunerativos', title: 'Ingresos no remunerativos', topic: 'remuneraciones', legalRef: 'D.Leg. 650, art. 19-20' },
  '04  Informe explicativo - Remuneraciones especiales.pdf': { slug: 'remuneraciones-especiales', title: 'Remuneraciones especiales', topic: 'remuneraciones' },
  '05  Informe explicativo - Prestaciones alimentarias.pdf': { slug: 'prestaciones-alimentarias', title: 'Prestaciones alimentarias', topic: 'remuneraciones', legalRef: 'Ley 28051' },
  '06  Informe explicativo - Determinación y pago de las remuneraciones.pdf': { slug: 'determinacion-pago-remuneraciones', title: 'Determinación y pago de las remuneraciones', topic: 'remuneraciones' },
  '07  Informe explicativo - Protección de la remuneración.pdf': { slug: 'proteccion-remuneracion', title: 'Protección de la remuneración', topic: 'remuneraciones', legalRef: 'Constitución art. 24' },
  '08 Informe explicativo - Extinción de la relación de trabajo.pdf': { slug: 'extincion-relacion-trabajo', title: 'Extinción de la relación de trabajo', topic: 'cese', legalRef: 'D.Leg. 728, art. 16-34' },
  '09 Informe explicativo - Seguro de vida ley.docx': { slug: 'seguro-vida-ley', title: 'Seguro de vida ley', topic: 'beneficios', skip: true },
  '10 Informe explicativo - Entidad prestadora de Salud - EPS.docx': { slug: 'eps', title: 'Entidad Prestadora de Salud - EPS', topic: 'seguridad-social', skip: true },
  '11. Informe explicativo - SCTR.pdf': { slug: 'sctr', title: 'Seguro Complementario de Trabajo de Riesgo (SCTR)', topic: 'sst', legalRef: 'Ley 26790, D.S. 009-97-SA' },
  '12 Informe explicativo - Inspecciones de trabajo.docx': { slug: 'inspecciones-trabajo-docx', title: 'Inspecciones de trabajo (detallado)', topic: 'inspecciones', skip: true },
  '13 Esquema explicativo - Inspecciones de trabajo.pdf': { slug: 'inspecciones-trabajo', title: 'Esquema de Inspecciones de trabajo', topic: 'inspecciones', legalRef: 'Ley 28806, D.S. 019-2006-TR' },
}

function cleanText(s) {
  return s
    // Join hyphenated line-breaks like "mate-\nria" → "materia"
    .replace(/(\w)-\n(\w)/g, '$1$2')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Trim trailing spaces on lines
    .replace(/[ \t]+\n/g, '\n')
    // Remove page markers from pdf-parse ("-- N of M --")
    .replace(/-- \d+ of \d+ --/g, '')
    .trim()
}

function chunkMarkdown(text, title, meta) {
  // Split on likely section boundaries (numbered, ALL CAPS, Capítulo)
  const header = `# ${title}\n\n` +
    (meta.legalRef ? `> **Base legal:** ${meta.legalRef}\n>\n> **Tópico:** ${meta.topic}\n\n` : `> **Tópico:** ${meta.topic}\n\n`)
  return header + text
}

async function extractPdf(file) {
  const buffer = fs.readFileSync(file)
  const parser = new PDFParse({ data: buffer })
  const res = await parser.getText()
  return { text: res.text || '', pages: res.pages?.length || 0 }
}

/* ───────────────────────────────── RUN ───────────────────────────────── */

console.log('\n── Corpus Ingest: PDF → Markdown ──\n')
fs.mkdirSync(OUT_DIR, { recursive: true })

const index = []

for (const [filename, meta] of Object.entries(META)) {
  if (meta.skip) {
    console.log(`⊘ skip ${filename} (${meta.slug})`)
    continue
  }
  const srcPath = path.join(SRC, filename)
  if (!fs.existsSync(srcPath)) {
    console.log(`⚠ missing ${filename}`)
    continue
  }

  try {
    const { text, pages } = await extractPdf(srcPath)
    if (!text || text.length < 200) {
      console.log(`⚠ empty ${filename}`)
      continue
    }
    const cleaned = cleanText(text)
    const md = chunkMarkdown(cleaned, meta.title, meta)
    const outPath = path.join(OUT_DIR, `${meta.slug}.md`)
    fs.writeFileSync(outPath, md, 'utf8')
    index.push({
      slug: meta.slug,
      title: meta.title,
      topic: meta.topic,
      legalRef: meta.legalRef ?? null,
      pages,
      bytes: md.length,
      file: `${meta.slug}.md`,
    })
    console.log(`✔ ${meta.slug}.md (${pages}pp, ${Math.round(md.length / 1024)}kb)`)
  } catch (e) {
    console.log(`✗ ${filename}: ${e.message}`)
  }
}

/* Write index.ts */
const indexTs = `/**
 * Corpus legal peruano — índice RAG.
 *
 * Fuente: "08 Informes explicativos" del pack Compensaciones 30°.
 * Los archivos .md viven en este mismo directorio.
 *
 * Generado por scripts/ingest/ingest-corpus.mjs.
 * NO EDITAR — regenerar con: \`node scripts/ingest/ingest-corpus.mjs\`.
 *
 * Total: ${index.length} documentos · ${index.reduce((s, d) => s + d.pages, 0)} páginas · ${Math.round(index.reduce((s, d) => s + d.bytes, 0) / 1024)}kb.
 */

export interface CorpusDocument {
  slug: string
  title: string
  /** Categoría temática (remuneraciones, cese, sst, inspecciones, ...). */
  topic: string
  /** Base legal principal referenciada. */
  legalRef: string | null
  /** Páginas del PDF original. */
  pages: number
  /** Bytes del archivo .md emitido. */
  bytes: number
  /** Nombre del archivo relativo a este directorio. */
  file: string
}

export const CORPUS_DOCUMENTS: readonly CorpusDocument[] = ${JSON.stringify(index, null, 2)} as const

export const CORPUS_BY_SLUG: Readonly<Record<string, CorpusDocument>> = Object.fromEntries(
  CORPUS_DOCUMENTS.map((d) => [d.slug, d])
)

export const CORPUS_BY_TOPIC: Readonly<Record<string, readonly CorpusDocument[]>> = CORPUS_DOCUMENTS.reduce(
  (acc, d) => {
    const list = acc[d.topic] ?? []
    return { ...acc, [d.topic]: [...list, d] }
  },
  {} as Record<string, readonly CorpusDocument[]>
)

/**
 * Lazy-load el contenido markdown de un documento.
 * Usado por el RAG al buscar contexto relevante.
 */
export async function loadCorpusMarkdown(slug: string): Promise<string | null> {
  const doc = CORPUS_BY_SLUG[slug]
  if (!doc) return null
  try {
    // En Node runtime (server components / API routes)
    if (typeof window === 'undefined') {
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const file = path.join(process.cwd(), 'src/data/legal/corpus', doc.file)
      return await fs.readFile(file, 'utf8')
    }
  } catch {
    // ignore
  }
  return null
}
`
fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), indexTs, 'utf8')
console.log(`\n✔ index.ts (${index.length} docs)\n`)
