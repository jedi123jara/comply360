#!/usr/bin/env node
/**
 * Chunker del corpus legal → `src/data/legal/corpus/chunks.json`.
 *
 * Convierte los 9 markdown del pack "08 Informes explicativos" en chunks
 * consumibles por el retriever RAG (keyword + vector).
 *
 * Estrategia:
 *  - Limpia páginas sueltas (líneas numéricas, headers repetidos, títulos sueltos).
 *  - Une párrafos hasta ~1500 chars (≈ 400 tokens ES).
 *  - Overlap de 1 párrafo entre chunks (contexto continuo).
 *  - Cada chunk hereda metadata del documento: slug, título, topic, legalRef.
 *  - Deriva tags a partir del topic + términos content-bearing frecuentes.
 *
 * Output format (compatible con LegalChunk existente):
 *   { id, norma, articulo?, titulo, texto, tags, vigente, source? }
 *
 * Corre con:
 *   node scripts/ingest/chunk-corpus.mjs
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..', '..')
const CORPUS_DIR = path.join(ROOT, 'src/data/legal/corpus')
const OUT_FILE = path.join(CORPUS_DIR, 'chunks.json')

// ─── Load corpus index (documents metadata) ──────────────────────────────────

/**
 * Extrae documentos del index.ts sin importarlo (evita dependencia TS).
 * Parsea el array CORPUS_DOCUMENTS embebido.
 */
function loadCorpusIndex() {
  const indexPath = path.join(CORPUS_DIR, 'index.ts')
  const src = fs.readFileSync(indexPath, 'utf8')
  const match = src.match(/CORPUS_DOCUMENTS[^=]+=\s*(\[[\s\S]*?\])\s*as const/)
  if (!match) throw new Error('No pude parsear CORPUS_DOCUMENTS del index.ts')
  return JSON.parse(match[1])
}

// ─── Stopwords español (mínimos, para tags) ──────────────────────────────────

const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al',
  'a', 'en', 'por', 'para', 'con', 'sin', 'sobre', 'entre', 'como', 'que',
  'se', 'su', 'sus', 'lo', 'le', 'les', 'es', 'ser', 'son', 'fue', 'fueron',
  'ha', 'han', 'haber', 'habido', 'este', 'esta', 'estos', 'estas', 'ese',
  'esa', 'esos', 'esas', 'aquel', 'aquella', 'o', 'u', 'y', 'e', 'ni', 'pero',
  'si', 'no', 'ya', 'muy', 'mas', 'mucho', 'poco', 'tanto', 'mismo', 'todo',
  'todos', 'toda', 'todas', 'otro', 'otra', 'otros', 'otras', 'cada', 'varios',
  'varias', 'caso', 'casos', 'parte', 'partes', 'forma', 'manera', 'tipo', 'tipos',
  'hacer', 'hace', 'hacen', 'hizo', 'tener', 'tiene', 'tienen', 'tenia',
  'debe', 'deben', 'debera', 'podra', 'puede', 'pueden', 'deberia',
  'asi', 'tal', 'cual', 'cuales', 'donde', 'cuando', 'porque', 'tambien',
  'ademas', 'dentro', 'fuera', 'decir', 'dice', 'dicho', 'sino', 'solo',
  'efectos', 'efecto', 'presente', 'siguiente', 'anterior', 'articulo',
])

// ─── Text cleaning ────────────────────────────────────────────────────────────

/** Elimina ruido de PDF-to-markdown: números sueltos, headers repetidos, etc. */
function cleanPdfNoise(text, docTitle) {
  const titleNormalized = docTitle.toLowerCase()
  const lines = text.split('\n')
  const kept = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      kept.push('')
      continue
    }
    // Líneas que son solo números (page numbers)
    if (/^\d{1,3}$/.test(line)) continue
    // Repeticiones del título del documento (con tolerancia)
    if (line.toLowerCase() === titleNormalized) continue
    // Headers típicos repetidos
    if (/^(ASESORÍA LABORAL|CAPÍTULO\s+\d+|Capítulo\s+\d+)$/i.test(line)) continue
    // Líneas muy cortas que son headers sueltos (< 4 palabras y ALL CAPS sin punto)
    if (line.length < 30 && line === line.toUpperCase() && !line.endsWith('.') && !line.endsWith(':')) continue
    kept.push(raw)
  }
  // Colapsa líneas en blanco múltiples
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Quita el frontmatter (H1 + blockquote) al inicio. */
function stripFrontmatter(md) {
  let body = md
  // Quita el H1 inicial
  body = body.replace(/^#\s+.+\n+/, '')
  // Quita el blockquote de metadata (base legal, tópico)
  body = body.replace(/^(>.*\n)+/gm, '')
  return body.trim()
}

// ─── Paragraphing + chunking ──────────────────────────────────────────────────

const MAX_CHUNK_CHARS = 1500
const MIN_CHUNK_CHARS = 200
const MIN_PARAGRAPH_CHARS = 40

/** Split por oraciones terminadas en `.`, `?`, `!` seguidas de espacio. */
function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/** Split por boundaries de palabras cuando ni párrafos ni oraciones alcanzan. */
function hardSplit(text, maxChars) {
  const out = []
  let buf = ''
  for (const word of text.split(/\s+/)) {
    if (buf.length + word.length + 1 > maxChars && buf.length > 0) {
      out.push(buf)
      buf = word
    } else {
      buf = buf ? `${buf} ${word}` : word
    }
  }
  if (buf) out.push(buf)
  return out
}

/**
 * Split por párrafos. Si un párrafo supera MAX_CHUNK_CHARS, lo divide
 * por oraciones agrupándolas para respetar el target.
 */
function splitParagraphs(text) {
  const rawPars = text
    .split(/\n\s*\n/)
    .map(p => p.trim().replace(/\s+/g, ' '))
    .filter(p => p.length >= MIN_PARAGRAPH_CHARS)

  const out = []
  for (const p of rawPars) {
    if (p.length <= MAX_CHUNK_CHARS) {
      out.push(p)
      continue
    }
    // Párrafo gigante: split por oraciones agrupando hasta MAX_CHUNK_CHARS
    const sentences = splitSentences(p)
    let buf = []
    let size = 0
    for (const s of sentences) {
      // Si una sola oración ya supera MAX, hard-split por palabras
      if (s.length > MAX_CHUNK_CHARS) {
        if (buf.length > 0) {
          out.push(buf.join(' '))
          buf = []
          size = 0
        }
        for (const hard of hardSplit(s, MAX_CHUNK_CHARS)) out.push(hard)
        continue
      }
      if (size + s.length + 1 > MAX_CHUNK_CHARS && buf.length > 0) {
        out.push(buf.join(' '))
        buf = [s]
        size = s.length
      } else {
        buf.push(s)
        size += s.length + 1
      }
    }
    if (buf.length > 0) out.push(buf.join(' '))
  }
  return out
}

/**
 * Agrupa párrafos en chunks respetando MAX_CHUNK_CHARS.
 * Overlap: sólo si los párrafos son chicos (< MAX/3), arrastra el último.
 * Si un párrafo ya excede MAX, asumimos que `splitParagraphs` lo sub-dividió
 * y cada uno se convierte en un chunk propio.
 */
function chunkParagraphs(paragraphs) {
  const chunks = []
  let current = []
  let currentSize = 0

  const flush = () => {
    if (current.length === 0) return
    const text = current.join('\n\n')
    if (text.length >= MIN_CHUNK_CHARS) chunks.push(text)
    else if (chunks.length > 0) chunks[chunks.length - 1] += '\n\n' + text
    else chunks.push(text)
    current = []
    currentSize = 0
  }

  for (const p of paragraphs) {
    // Si el párrafo solo ya llena o excede MAX: cada uno es su propio chunk.
    if (p.length >= MAX_CHUNK_CHARS) {
      flush()
      chunks.push(p)
      continue
    }
    // Si agregarlo nos pasa del límite, flush primero.
    if (currentSize + p.length + 2 > MAX_CHUNK_CHARS && current.length > 0) {
      const prevLast = current[current.length - 1]
      flush()
      // Overlap solo si párrafo previo pequeño (ayuda a retrieval sin inflar chunks)
      if (prevLast.length < MAX_CHUNK_CHARS / 3) {
        current = [prevLast]
        currentSize = prevLast.length + 2
      }
    }
    current.push(p)
    currentSize += p.length + 2
  }
  flush()
  return chunks
}

// ─── Tag derivation ───────────────────────────────────────────────────────────

function tokenize(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w))
}

/**
 * Deriva top-6 términos content-bearing del chunk para usar como tags.
 * Reemplaza la curación manual de tags del corpus v1.
 */
function deriveTags(text, seedTags = []) {
  const freq = new Map()
  for (const w of tokenize(text)) {
    freq.set(w, (freq.get(w) ?? 0) + 1)
  }
  const top = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w)
  const seen = new Set([...seedTags, ...top])
  return Array.from(seen).slice(0, 10)
}

// ─── Heading extraction ───────────────────────────────────────────────────────

/**
 * Intenta derivar un subtitulo del chunk: primer heading ## o primera frase.
 */
function extractSubtitle(chunkText, docTitle) {
  const hMatch = chunkText.match(/^##+\s+(.+)$/m)
  if (hMatch) return hMatch[1].trim()
  // Primera oración que termine en punto
  const firstSentence = chunkText.split(/(?<=\.)\s/)[0]
  if (firstSentence && firstSentence.length > 20 && firstSentence.length < 120) {
    return firstSentence.replace(/\s+/g, ' ').trim()
  }
  return docTitle
}

// ─── Main ──────────────────────────────────────────────────────────────────────

console.log('\n── Corpus Chunker → chunks.json ──\n')

const docs = loadCorpusIndex()
const allChunks = []
let totalParagraphs = 0

for (const doc of docs) {
  const mdPath = path.join(CORPUS_DIR, doc.file)
  if (!fs.existsSync(mdPath)) {
    console.log(`⚠ missing ${doc.file}`)
    continue
  }
  const raw = fs.readFileSync(mdPath, 'utf8')
  const body = stripFrontmatter(raw)
  const cleaned = cleanPdfNoise(body, doc.title)
  const paragraphs = splitParagraphs(cleaned)
  totalParagraphs += paragraphs.length
  const chunks = chunkParagraphs(paragraphs)

  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i]
    const norma = doc.legalRef ?? 'Informe explicativo SUNAFIL'
    const articulo = doc.legalRef?.match(/art\.\s*[\d-]+/i)?.[0]
    const seedTags = [doc.topic, doc.slug].filter(Boolean)
    allChunks.push({
      id: `${doc.slug}-${String(i + 1).padStart(2, '0')}`,
      source: 'informes-explicativos',
      norma,
      articulo: articulo ?? undefined,
      titulo: extractSubtitle(chunkText, doc.title),
      texto: chunkText,
      tags: deriveTags(chunkText, seedTags),
      vigente: true,
      docSlug: doc.slug,
      docTitle: doc.title,
      topic: doc.topic,
      chunkIndex: i,
    })
  }
  console.log(`✔ ${doc.slug}: ${chunks.length} chunks de ${paragraphs.length} párrafos`)
}

fs.writeFileSync(OUT_FILE, JSON.stringify(allChunks, null, 2), 'utf8')
const kb = Math.round(fs.statSync(OUT_FILE).size / 1024)
console.log(`\n✔ chunks.json · ${allChunks.length} chunks · ${kb}kb`)
console.log(`  ${totalParagraphs} párrafos → ${allChunks.length} chunks (≈ ${(totalParagraphs / allChunks.length).toFixed(1)} párrafos/chunk)`)
