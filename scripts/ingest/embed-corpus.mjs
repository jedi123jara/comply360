#!/usr/bin/env node
/**
 * Genera embeddings para `chunks.json` → `embeddings.json`.
 *
 * Soporta 2 providers cloud (sin dependencias locales):
 *
 *  1. Jina AI (gratis) — `JINA_API_KEY` + `jina-embeddings-v3` (1024 dims)
 *                       10M tokens gratis/mes, sin tarjeta. Excelente multilingüe ES.
 *                       Dashboard: https://jina.ai/embeddings
 *
 *  2. OpenAI          — `OPENAI_API_KEY` + `text-embedding-3-small` (1536 dims)
 *                       Costo: ~$0.02/1M tokens ≈ $0.003 para el corpus completo.
 *
 * Variables de entorno:
 *   EMBED_PROVIDER    — 'jina' | 'openai' (default: auto-detect por key presente)
 *   EMBED_MODEL       — override del modelo
 *   EMBED_BATCH       — opcional (default 100 chunks por request)
 *   JINA_API_KEY      — requerido si provider=jina
 *   OPENAI_API_KEY    — requerido si provider=openai
 *
 * Ejemplos:
 *   JINA_API_KEY=jina_... node scripts/ingest/embed-corpus.mjs
 *   OPENAI_API_KEY=sk-... node scripts/ingest/embed-corpus.mjs
 *
 * Idempotente: si `embeddings.json` ya existe, solo embeddea los chunks
 * que NO tienen vector, preservando los existentes.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..', '..')
const CHUNKS_FILE = path.join(ROOT, 'src/data/legal/corpus/chunks.json')
const OUT_FILE = path.join(ROOT, 'src/data/legal/corpus/embeddings.json')

const BATCH_SIZE = Number(process.env.EMBED_BATCH ?? 100)

// ─── Provider detection ──────────────────────────────────────────────────────

/** Autodetecta provider por env vars (o respeta el override EMBED_PROVIDER). */
function detectProvider() {
  const explicit = (process.env.EMBED_PROVIDER ?? '').toLowerCase().trim()
  if (explicit === 'openai' || explicit === 'jina') return explicit
  if (process.env.JINA_API_KEY) return 'jina' // prioridad: gratis primero
  if (process.env.OPENAI_API_KEY) return 'openai'
  return 'jina' // fallback: pide JINA_API_KEY (gratis)
}

const PROVIDER = detectProvider()

const PROVIDER_DEFAULTS = {
  openai: {
    model: 'text-embedding-3-small',
    url: 'https://api.openai.com/v1/embeddings',
    dim: 1536,
    costPer1M: 0.02,
    needsKey: 'OPENAI_API_KEY',
  },
  jina: {
    model: 'jina-embeddings-v3',
    url: 'https://api.jina.ai/v1/embeddings',
    dim: 1024,
    costPer1M: 0, // free tier
    needsKey: 'JINA_API_KEY',
  },
}

const cfg = PROVIDER_DEFAULTS[PROVIDER]
const MODEL = process.env.EMBED_MODEL ?? cfg.model

// ─── Pre-flight checks ────────────────────────────────────────────────────────

if (cfg.needsKey && !process.env[cfg.needsKey]) {
  console.error(`✗ ${cfg.needsKey} no está definida.`)
  if (PROVIDER === 'openai') {
    console.error('  Obtené una clave en https://platform.openai.com/api-keys')
    console.error('  Y corré: OPENAI_API_KEY=sk-... node scripts/ingest/embed-corpus.mjs')
  } else if (PROVIDER === 'jina') {
    console.error('  Obtené una clave gratis en https://jina.ai/embeddings (10M tokens/mes)')
    console.error('  Y corré: JINA_API_KEY=jina_... node scripts/ingest/embed-corpus.mjs')
  }
  process.exit(1)
}

const apiKey = cfg.needsKey ? process.env[cfg.needsKey] : null

if (!fs.existsSync(CHUNKS_FILE)) {
  console.error('✗ chunks.json no existe. Corré primero:')
  console.error('  node scripts/ingest/chunk-corpus.mjs')
  process.exit(1)
}

// Agregamos LEGAL_CORPUS (v1) leyendo el .ts como texto (no podemos importar TS).
// Los 73 chunks handcrafted también merecen embeddings para hybrid search.
function loadLegalCorpusV1() {
  const file = path.join(ROOT, 'src/lib/ai/rag/legal-corpus.ts')
  if (!fs.existsSync(file)) return []
  const src = fs.readFileSync(file, 'utf8')
  // Extrae objetos entre `{ id: '...' ... }` con regex tolerante.
  // Match balanceado básico: asumimos objetos no-anidados, comillas simples/dobles.
  const chunks = []
  const pattern = /\{\s*id:\s*['"]([^'"]+)['"],\s*norma:\s*['"]([^'"]+)['"],[\s\S]*?titulo:\s*['"]([^'"]+)['"],\s*texto:\s*`([\s\S]*?)`,[\s\S]*?tags:\s*\[([^\]]+)\][\s\S]*?vigente:\s*(true|false)/g
  let m
  while ((m = pattern.exec(src)) !== null) {
    const [, id, norma, titulo, texto, tagsRaw, vigenteRaw] = m
    if (vigenteRaw !== 'true') continue
    const tags = [...tagsRaw.matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1])
    chunks.push({ id, norma, titulo, texto: texto.replace(/\s+/g, ' ').trim(), tags, source: 'legal-corpus-v1' })
  }
  return chunks
}

// ─── Load existing chunks + embeddings ────────────────────────────────────────

const extendedChunks = JSON.parse(fs.readFileSync(CHUNKS_FILE, 'utf8'))
const v1Chunks = loadLegalCorpusV1()

console.log(`\n── Embeddings generator ──\n`)
console.log(`  Corpus v1 (legal-corpus.ts): ${v1Chunks.length} chunks`)
console.log(`  Corpus v2 (informes SUNAFIL): ${extendedChunks.length} chunks`)
console.log(`  Provider: ${PROVIDER}${PROVIDER === 'jina' ? ' (gratis · 10M tokens/mes)' : ''}`)
console.log(`  Modelo: ${MODEL}`)

const allChunks = [...v1Chunks, ...extendedChunks]

/** Vectors existentes (para idempotencia). */
let existing = { model: MODEL, dim: 0, generatedAt: '', vectors: {} }
if (fs.existsSync(OUT_FILE)) {
  try {
    existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'))
    if (existing.model !== MODEL) {
      console.log(`  ⚠ Modelo cambió (${existing.model} → ${MODEL}). Regenerando TODO.`)
      existing = { model: MODEL, dim: 0, generatedAt: '', vectors: {} }
    } else {
      console.log(`  ✓ embeddings.json previo: ${Object.keys(existing.vectors).length} vectors`)
    }
  } catch {
    existing = { model: MODEL, dim: 0, generatedAt: '', vectors: {} }
  }
}

const pending = allChunks.filter((c) => !existing.vectors[c.id])
if (pending.length === 0) {
  console.log(`\n✓ Nada pendiente. ${Object.keys(existing.vectors).length} vectors al día.\n`)
  process.exit(0)
}
console.log(`  Pendientes: ${pending.length} chunks\n`)

// ─── Embedding dispatch (OpenAI / Jina — ambos OpenAI-compatible) ─────────

async function embedBatch(texts) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }
  const body = { input: texts, model: MODEL }
  const resp = await fetch(cfg.url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`${PROVIDER} HTTP ${resp.status}: ${txt.slice(0, 200)}`)
  }
  const data = await resp.json()
  return data.data.map((d) => d.embedding)
}

// ─── Process in batches ───────────────────────────────────────────────────────

const vectors = { ...existing.vectors }
let totalTokensIn = 0
let dim = existing.dim

for (let i = 0; i < pending.length; i += BATCH_SIZE) {
  const slice = pending.slice(i, i + BATCH_SIZE)
  const texts = slice.map((c) => `${c.titulo}\n\n${c.texto}`)
  totalTokensIn += texts.reduce((s, t) => s + Math.ceil(t.length / 4), 0) // aprox
  const batchN = Math.floor(i / BATCH_SIZE) + 1
  const totalBatches = Math.ceil(pending.length / BATCH_SIZE)
  process.stdout.write(`  Batch ${batchN}/${totalBatches} (${slice.length} chunks)… `)
  try {
    const embs = await embedBatch(texts)
    for (let j = 0; j < slice.length; j++) {
      vectors[slice[j].id] = embs[j]
      if (!dim) dim = embs[j].length
    }
    console.log('✓')
  } catch (err) {
    console.log('✗')
    console.error('    ' + err.message)
    // Guarda progreso parcial y aborta
    break
  }
}

// ─── Persist ──────────────────────────────────────────────────────────────────

const payload = {
  model: MODEL,
  dim: dim || 1536,
  generatedAt: new Date().toISOString(),
  chunkCount: Object.keys(vectors).length,
  vectors,
}

fs.writeFileSync(OUT_FILE, JSON.stringify(payload), 'utf8')
const mb = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2)
console.log(`\n✓ embeddings.json · ${payload.chunkCount} vectors · ${mb}MB`)
console.log(`  ≈ ${totalTokensIn.toLocaleString()} tokens entrada (estimado)`)
if (cfg.costPer1M > 0) {
  const costUsd = (totalTokensIn / 1_000_000) * cfg.costPer1M
  console.log(`  ≈ $${costUsd.toFixed(4)} USD (${MODEL} @ $${cfg.costPer1M}/1M)\n`)
} else {
  console.log(`  Gratis (${PROVIDER})\n`)
}
