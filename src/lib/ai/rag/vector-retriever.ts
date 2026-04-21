/**
 * Vector retriever — búsqueda semántica híbrida sobre corpus v1 + v2.
 *
 * Combina:
 *   - `LEGAL_CORPUS` (73 chunks handcrafted en `legal-corpus.ts`)
 *   - `loadExtendedCorpus()` (~360 chunks de los 9 PDFs del pack SUNAFIL)
 *
 * Flujo:
 *   1. Si `embeddings.json` existe → embed query con OpenAI → cosine similarity.
 *   2. Fallback: `retrieveRelevantLaw` (keyword + TF-IDF) sobre corpus unificado.
 *
 * El score normalizado 0-1 permite mezclar con el retriever v1 por rerank.
 *
 * Para generar embeddings:  `node scripts/ingest/embed-corpus.mjs`
 */
import { LEGAL_CORPUS, type LegalChunk } from './legal-corpus'
import { loadExtendedCorpus } from './extended-corpus'
import { retrieveRelevantLaw, type RetrievalResult } from './retriever'

export type { RetrievalResult }

// ─── Unified corpus view ──────────────────────────────────────────────────────

/**
 * Devuelve el corpus completo (v1 + v2) como LegalChunk[].
 * Los chunks del extended corpus heredan el shape de LegalChunk.
 */
export function getUnifiedCorpus(): LegalChunk[] {
  const extended = loadExtendedCorpus()
  // Filtra vigentes por consistencia con el v1
  return [
    ...LEGAL_CORPUS.filter((c) => c.vigente),
    ...extended.filter((c) => c.vigente),
  ]
}

// ─── Embeddings loader ────────────────────────────────────────────────────────

interface EmbeddingsPayload {
  /** Modelo usado (ej. 'text-embedding-3-small'). */
  model: string
  /** Dimensión del vector. */
  dim: number
  /** Fecha ISO de generación. */
  generatedAt: string
  /** Map `chunkId → float array`. */
  vectors: Record<string, number[]>
}

let embeddingsCache: EmbeddingsPayload | null | undefined

function loadEmbeddings(): EmbeddingsPayload | null {
  if (embeddingsCache !== undefined) return embeddingsCache
  if (typeof window !== 'undefined') {
    embeddingsCache = null
    return null
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path') as typeof import('node:path')
    const file = path.join(process.cwd(), 'src/data/legal/corpus/embeddings.json')
    if (!fs.existsSync(file)) {
      embeddingsCache = null
      return null
    }
    const raw = fs.readFileSync(file, 'utf8')
    const parsed = JSON.parse(raw) as EmbeddingsPayload
    if (!parsed.vectors || typeof parsed.vectors !== 'object') {
      embeddingsCache = null
      return null
    }
    embeddingsCache = parsed
    return parsed
  } catch (err) {
    console.warn('[vector-retriever] No pude cargar embeddings.json:', err)
    embeddingsCache = null
    return null
  }
}

// ─── Cosine similarity ────────────────────────────────────────────────────────

/**
 * Cosine similarity entre dos vectores de igual dim. Asume magnitudes > 0.
 * Devuelve valor en [-1, 1], típicamente [0, 1] para embeddings normalizados.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

// ─── Query embedding (OpenAI) ─────────────────────────────────────────────────

/**
 * Embed query usando OpenAI. Devuelve null si falla (clave faltante, red).
 * El caller DEBE hacer fallback al retriever keyword.
 */
async function embedQuery(query: string, model = 'text-embedding-3-small'): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  try {
    const resp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: query, model }),
    })
    if (!resp.ok) {
      console.warn('[vector-retriever] OpenAI embed failed:', resp.status)
      return null
    }
    const data = (await resp.json()) as { data?: Array<{ embedding?: number[] }> }
    const vec = data.data?.[0]?.embedding
    if (!Array.isArray(vec)) return null
    return vec
  } catch (err) {
    console.warn('[vector-retriever] OpenAI embed error:', err)
    return null
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface VectorRetrievalOptions {
  /** Top-K chunks a devolver. Default 5. */
  topK?: number
  /** Score mínimo de cosine (0-1). Default 0.15. */
  minScore?: number
  /** Peso del score vector vs keyword en hybrid (0-1). Default 0.6. */
  vectorWeight?: number
}

/**
 * Retrieve usando vectores (si embeddings.json existe + API key)
 * con fallback al retriever keyword.
 *
 * Cuando hay vectores disponibles, hace hybrid rerank:
 *   final = vectorWeight × cosine + (1 - vectorWeight) × keyword
 *
 * Así se aprovecha el recall semántico sin perder los matches exactos
 * (norma/artículo/sinónimos) del retriever v1.
 */
export async function retrieveRelevantLawVector(
  query: string,
  options: VectorRetrievalOptions = {}
): Promise<RetrievalResult[]> {
  const topK = options.topK ?? 5
  const minScore = options.minScore ?? 0.15
  const vectorWeight = Math.max(0, Math.min(1, options.vectorWeight ?? 0.6))

  const embeddings = loadEmbeddings()
  const unified = getUnifiedCorpus()

  // Fast path: sin embeddings, devuelve keyword sobre corpus unificado.
  // Nota: el retriever keyword actual sólo ve LEGAL_CORPUS (v1). Para incluir
  // el extended en el keyword path usamos nuestro propio scoring simple.
  if (!embeddings) {
    return keywordOnlyFallback(query, unified, topK, minScore)
  }

  // Vector path: embed query con OpenAI.
  const qVec = await embedQuery(query, embeddings.model)
  if (!qVec) {
    return keywordOnlyFallback(query, unified, topK, minScore)
  }

  // Calcula cosine sobre chunks con vector conocido.
  const byId = new Map(unified.map((c) => [c.id, c]))
  const scored: RetrievalResult[] = []
  for (const [id, vec] of Object.entries(embeddings.vectors)) {
    const chunk = byId.get(id)
    if (!chunk) continue
    const cosine = cosineSimilarity(qVec, vec)
    if (cosine < minScore) continue
    scored.push({ chunk, score: cosine, method: 'vector' })
  }

  // Hybrid rerank: fusiona con los resultados del keyword retriever v1.
  const keywordV1 = retrieveRelevantLaw(query, topK * 3, 0.05)
  const keywordMap = new Map(keywordV1.map((r) => [r.chunk.id, r.score]))
  for (const s of scored) {
    const kScore = keywordMap.get(s.chunk.id) ?? 0
    s.score = vectorWeight * s.score + (1 - vectorWeight) * kScore
  }
  // Añade chunks que sólo matchearon por keyword (mejora recall de citas exactas).
  for (const k of keywordV1) {
    if (!embeddings.vectors[k.chunk.id]) {
      scored.push({ chunk: k.chunk, score: (1 - vectorWeight) * k.score, method: 'keyword' })
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

// ─── Keyword-only fallback sobre corpus unificado ─────────────────────────────

function keywordOnlyFallback(
  query: string,
  unified: LegalChunk[],
  topK: number,
  minScore: number
): RetrievalResult[] {
  // Primero usa el retriever v1 (TF-IDF + sinónimos sobre LEGAL_CORPUS).
  const v1 = retrieveRelevantLaw(query, topK, minScore)

  // Luego un scoring simple sobre extended corpus (solo matches literales
  // en título + tags + texto). Es menos sofisticado que el v1 pero mejora
  // cobertura hasta que se generen embeddings.
  const extended = loadExtendedCorpus()
  if (extended.length === 0) return v1

  const qLower = query.toLowerCase()
  const qWords = qLower.split(/\s+/).filter((w) => w.length > 3)
  const extScored: RetrievalResult[] = []
  for (const chunk of extended) {
    const haystack = `${chunk.titulo} ${chunk.tags.join(' ')} ${chunk.texto}`.toLowerCase()
    let hits = 0
    for (const w of qWords) {
      if (haystack.includes(w)) hits += 1
    }
    if (hits === 0) continue
    // Normaliza: hits / qWords.length con bias suave por tag match
    const tagHits = chunk.tags.filter((t) => qLower.includes(t)).length
    const score = Math.min(1, hits / Math.max(qWords.length, 1) + tagHits * 0.15)
    if (score >= minScore) {
      extScored.push({ chunk, score, method: 'keyword' })
    }
  }

  // Fusiona y rerank
  const merged = [...v1, ...extScored]
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
  return merged
}

/**
 * Formatea los chunks recuperados como contexto para el LLM.
 * Incluye el origen (norma/articulo o documento explicativo) en el header.
 */
export function formatVectorContext(results: RetrievalResult[]): string {
  if (results.length === 0) return ''
  const blocks = results.map((r) => {
    const c = r.chunk
    const header = c.articulo
      ? `[${c.norma} — ${c.articulo}] ${c.titulo}`
      : `[${c.norma}] ${c.titulo}`
    const method = r.method === 'vector' ? ' (semantic)' : ''
    return `${header}${method}\n${c.texto.trim()}`
  })
  return `\n\n══ NORMATIVA APLICABLE RECUPERADA ══\n${blocks.join('\n\n---\n')}\n══════════════════════════════════`
}
