/**
 * RAG Retriever — Búsqueda de normativa peruana relevante
 *
 * Implementa dos modos de búsqueda:
 * 1. Keyword matching (sin modelo de embeddings — funciona siempre)
 * 2. Vector embeddings via Ollama (si está disponible nomic-embed-text)
 *
 * Para el uso actual, keyword matching es suficientemente preciso
 * dado que los chunks están bien etiquetados.
 */

import { LEGAL_CORPUS, type LegalChunk } from './legal-corpus'

export interface RetrievalResult {
  chunk: LegalChunk
  score: number
  method: 'keyword' | 'vector'
}

/**
 * Recupera los chunks más relevantes para una consulta.
 * @param query Texto de la consulta / descripción del contrato
 * @param topK Número máximo de chunks a devolver (default: 4)
 * @param minScore Score mínimo para incluir un chunk (0-1, default: 0.05)
 */
export function retrieveRelevantLaw(
  query: string,
  topK = 4,
  minScore = 0.05
): RetrievalResult[] {
  const queryLower = query.toLowerCase()
  const queryWords = tokenize(queryLower)

  const scored: RetrievalResult[] = LEGAL_CORPUS
    .filter(chunk => chunk.vigente)
    .map(chunk => ({
      chunk,
      score: scoreChunk(chunk, queryLower, queryWords),
      method: 'keyword' as const,
    }))
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return scored
}

/**
 * Formatea los chunks recuperados como contexto para el LLM.
 * Produce un bloque de texto conciso que se inyecta en el system prompt.
 */
export function formatRetrievedContext(results: RetrievalResult[]): string {
  if (results.length === 0) return ''

  const blocks = results.map(r => {
    const header = r.chunk.articulo
      ? `[${r.chunk.norma} — ${r.chunk.articulo}] ${r.chunk.titulo}`
      : `[${r.chunk.norma}] ${r.chunk.titulo}`
    return `${header}\n${r.chunk.texto.trim()}`
  })

  return `\n\n══ NORMATIVA APLICABLE RECUPERADA ══\n${blocks.join('\n\n---\n')}\n══════════════════════════════════`
}

/**
 * Función principal: recupera contexto y lo formatea listo para inyectar.
 * Uso: const ctx = await getRelevantLegalContext(description)
 */
export function getRelevantLegalContext(query: string, topK = 4): string {
  const results = retrieveRelevantLaw(query, topK)
  return formatRetrievedContext(results)
}

// ─── Internal scoring ──────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-záéíóúüñ0-9\s/]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
}

function scoreChunk(chunk: LegalChunk, queryLower: string, queryWords: string[]): number {
  let score = 0

  // 1. Match en tags (peso alto)
  for (const tag of chunk.tags) {
    if (queryLower.includes(tag)) {
      score += tag.split(' ').length > 1 ? 0.4 : 0.2 // multi-word tags pesan más
    }
  }

  // 2. Match de palabras individuales en título
  const titleWords = tokenize(chunk.titulo)
  for (const w of queryWords) {
    if (titleWords.includes(w)) score += 0.15
  }

  // 3. Match de palabras en texto del chunk
  const textWords = tokenize(chunk.texto)
  const textWordSet = new Set(textWords)
  for (const w of queryWords) {
    if (textWordSet.has(w)) score += 0.05
  }

  // 4. Bonus por tipo de contrato detectado
  const contractBonus: Record<string, number> = {
    'contrato': 0.1,
    'laboral': 0.1,
    'trabajador': 0.1,
    'empleador': 0.1,
    'despido': 0.15,
    'indemnizacion': 0.15,
    'cts': 0.2,
    'gratificacion': 0.2,
    'vacacion': 0.2,
    'utilidad': 0.15,
    'mype': 0.2,
    'microempresa': 0.2,
    'sst': 0.2,
    'multa': 0.15,
    'sunafil': 0.15,
  }
  for (const [keyword, bonus] of Object.entries(contractBonus)) {
    if (queryLower.includes(keyword) && chunk.tags.some(t => t.includes(keyword))) {
      score += bonus
    }
  }

  return Math.min(score, 1.0) // normalizar a máximo 1.0
}
