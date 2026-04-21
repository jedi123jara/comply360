/**
 * Extended corpus — wrapper tipado sobre `src/data/legal/corpus/chunks.json`.
 *
 * El corpus extended proviene de los 9 PDFs "Informes explicativos SUNAFIL"
 * ingested por `scripts/ingest/chunk-corpus.mjs`. Complementa el `LEGAL_CORPUS`
 * handcrafted (73 chunks en `legal-corpus.ts`) con ~360 chunks de contenido
 * explicativo rico (145 páginas del pack Compensaciones 30°).
 *
 * Si chunks.json falta (fresh checkout antes de correr el script), devuelve
 * array vacío → el retriever sigue funcionando con el corpus v1.
 */
import type { LegalChunk } from './legal-corpus'

export interface ExtendedChunk extends LegalChunk {
  /** Origen: 'informes-explicativos' (único por ahora). */
  source: string
  /** Slug del documento fuente (remuneraciones, sctr, etc.). */
  docSlug: string
  /** Título del documento fuente. */
  docTitle: string
  /** Tópico (remuneraciones, cese, sst, inspecciones, ...). */
  topic: string
  /** Posición del chunk dentro del documento (0-based). */
  chunkIndex: number
}

let cached: ExtendedChunk[] | null = null

/**
 * Carga los chunks del corpus extended. Memoiza la lectura.
 * Safe de llamar en cold-start: si chunks.json no existe (o el JSON es
 * inválido), devuelve array vacío + warning.
 */
export function loadExtendedCorpus(): ExtendedChunk[] {
  if (cached !== null) return cached

  // Import síncrono sólo en Node runtime (server components / API routes).
  if (typeof window !== 'undefined') {
    cached = []
    return cached
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path') as typeof import('node:path')
    const file = path.join(process.cwd(), 'src/data/legal/corpus/chunks.json')
    if (!fs.existsSync(file)) {
      cached = []
      return cached
    }
    const raw = fs.readFileSync(file, 'utf8')
    const parsed = JSON.parse(raw) as ExtendedChunk[]
    // Normaliza: garantiza shape esperado + flag `vigente: true`.
    cached = parsed.map((c) => ({
      ...c,
      vigente: c.vigente ?? true,
      tags: Array.isArray(c.tags) ? c.tags : [],
    }))
    return cached
  } catch (err) {
    console.warn('[extended-corpus] No pude cargar chunks.json:', err)
    cached = []
    return cached
  }
}

/**
 * Total de chunks del corpus extended (para diagnósticos / UI).
 */
export function extendedCorpusSize(): number {
  return loadExtendedCorpus().length
}

/**
 * Filtra por topic (remuneraciones, sctr, inspecciones, etc.).
 */
export function getExtendedChunksByTopic(topic: string): ExtendedChunk[] {
  return loadExtendedCorpus().filter((c) => c.topic === topic)
}
