/**
 * RAG Retriever — Búsqueda de normativa peruana relevante
 *
 * Mejoras implementadas:
 * - Sinónimos legales peruanos para expansión de consultas
 * - TF-IDF scoring (términos raros pesan más que comunes)
 * - Parámetros configurables vía env vars (RAG_TOP_K, RAG_MIN_SCORE)
 */

import { LEGAL_CORPUS, type LegalChunk } from './legal-corpus'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetrievalResult {
  chunk: LegalChunk
  score: number
  method: 'keyword' | 'vector'
}

// ─── Configurable Parameters ──────────────────────────────────────────────────

const DEFAULT_TOP_K = parseInt(process.env.RAG_TOP_K ?? '5', 10)
const DEFAULT_MIN_SCORE = parseFloat(process.env.RAG_MIN_SCORE ?? '0.12')

// ─── Legal Synonyms (Peruvian labor law) ──────────────────────────────────────

const LEGAL_SYNONYMS: Record<string, string[]> = {
  despido: ['cese', 'terminacion', 'desvinculacion', 'extincion', 'separacion'],
  cese: ['despido', 'terminacion', 'desvinculacion', 'liquidacion'],
  contrato: ['convenio', 'acuerdo', 'vinculo laboral'],
  sueldo: ['remuneracion', 'salario', 'pago', 'haberes', 'retribucion'],
  remuneracion: ['sueldo', 'salario', 'pago', 'haberes'],
  multa: ['sancion', 'penalidad', 'infraccion', 'castigo'],
  sancion: ['multa', 'penalidad', 'infraccion'],
  trabajador: ['empleado', 'colaborador', 'personal', 'obrero'],
  empleador: ['empresa', 'patron', 'compania'],
  vacaciones: ['descanso vacacional', 'goce vacacional', 'periodo vacacional'],
  gratificacion: ['aguinaldo', 'bonificacion', 'gratificaciones'],
  cts: ['compensacion tiempo servicios', 'deposito cts', 'beneficio social'],
  inspeccion: ['fiscalizacion', 'visita inspectiva', 'supervision'],
  sunafil: ['inspeccion', 'fiscalizacion', 'autoridad trabajo'],
  hostigamiento: ['acoso', 'hostigamiento sexual', 'violencia laboral'],
  accidente: ['incidente', 'siniestro', 'accidente trabajo'],
  seguridad: ['sst', 'seguridad salud', 'prevencion riesgos'],
  capacitacion: ['entrenamiento', 'formacion', 'induccion'],
  liquidacion: ['beneficios sociales', 'pago final', 'finiquito'],
  mype: ['microempresa', 'pequena empresa', 'pyme', 'micro'],
  renuncia: ['dimision', 'retiro voluntario'],
  licencia: ['permiso', 'ausencia', 'descanso medico'],
  maternidad: ['pre natal', 'post natal', 'embarazo', 'gestante'],
  discapacidad: ['invalidez', 'persona con discapacidad'],
  datos: ['privacidad', 'proteccion datos', 'informacion personal'],
  indemnizacion: ['compensacion', 'resarcimiento', 'reparacion'],
  utilidades: ['participacion utilidades', 'reparto ganancias'],
  teletrabajo: ['trabajo remoto', 'trabajo distancia', 'home office'],
}

// ─── TF-IDF Precomputation ────────────────────────────────────────────────────

const TAG_DOC_FREQUENCY = new Map<string, number>()
for (const chunk of LEGAL_CORPUS) {
  for (const tag of chunk.tags) {
    TAG_DOC_FREQUENCY.set(tag, (TAG_DOC_FREQUENCY.get(tag) ?? 0) + 1)
  }
}
const TOTAL_DOCS = Math.max(LEGAL_CORPUS.length, 1)

/** IDF weight: rare tags → higher score, common tags → lower score */
function idf(tag: string): number {
  const df = TAG_DOC_FREQUENCY.get(tag) ?? 1
  return Math.log(TOTAL_DOCS / (1 + df)) / Math.log(TOTAL_DOCS) // normalized ~0-1
}

// ─── Synonym Expansion ────────────────────────────────────────────────────────

function expandWithSynonyms(words: string[]): string[] {
  const expanded = new Set(words)
  for (const word of words) {
    // Direct lookup: word is a key
    const syns = LEGAL_SYNONYMS[word]
    if (syns) syns.forEach(s => expanded.add(s))
    // Reverse lookup: word appears as a value
    for (const [key, vals] of Object.entries(LEGAL_SYNONYMS)) {
      if (vals.includes(word)) expanded.add(key)
    }
  }
  return Array.from(expanded)
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-záéíóúüñ0-9\s/-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

const DOMAIN_KEYWORDS: Record<string, number> = {
  contrato: 0.1, laboral: 0.1, trabajador: 0.1, empleador: 0.1,
  despido: 0.15, cese: 0.15, indemnizacion: 0.15,
  cts: 0.2, gratificacion: 0.2, vacacion: 0.2, vacaciones: 0.2,
  utilidad: 0.15, utilidades: 0.15,
  mype: 0.2, microempresa: 0.2,
  sst: 0.2, seguridad: 0.15,
  multa: 0.15, sunafil: 0.15, inspeccion: 0.15,
  hostigamiento: 0.2, acoso: 0.2,
  jornada: 0.15, horas: 0.1, nocturno: 0.15,
  licencia: 0.15, maternidad: 0.2,
  datos: 0.15, privacidad: 0.15,
  discapacidad: 0.2,
}

function scoreChunk(
  chunk: LegalChunk,
  queryLower: string,
  queryWords: string[],
  expandedWords: string[],
): number {
  let score = 0

  // 1. Tag matching with IDF weighting (higher weight for rare tags)
  for (const tag of chunk.tags) {
    if (queryLower.includes(tag)) {
      const baseWeight = tag.split(' ').length > 1 ? 0.4 : 0.2
      score += baseWeight * (1 + idf(tag)) // IDF boosts rare tags
    }
    // Also check expanded synonyms against tags
    for (const ew of expandedWords) {
      if (tag.includes(ew) && !queryLower.includes(tag)) {
        score += 0.1 * (1 + idf(tag)) // Synonym match = lower base but still IDF-weighted
      }
    }
  }

  // 2. Title word match (original + expanded)
  const titleWords = tokenize(chunk.titulo)
  for (const w of expandedWords) {
    if (titleWords.includes(w)) score += 0.12
  }

  // 3. Text body match (capped to avoid over-scoring long texts)
  const textWordSet = new Set(tokenize(chunk.texto))
  let textMatches = 0
  for (const w of queryWords) {
    if (textWordSet.has(w)) textMatches++
  }
  score += Math.min(textMatches * 0.04, 0.2) // cap at 0.2

  // 4. Domain keyword bonus (when query + chunk both match a domain term)
  for (const [keyword, bonus] of Object.entries(DOMAIN_KEYWORDS)) {
    if (queryLower.includes(keyword) && chunk.tags.some(t => t.includes(keyword))) {
      score += bonus
    }
  }

  return Math.min(score, 1.0)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Recupera los chunks más relevantes para una consulta.
 * @param query Texto de la consulta
 * @param topK Número máximo de chunks (default: env RAG_TOP_K or 5)
 * @param minScore Score mínimo para incluir (default: env RAG_MIN_SCORE or 0.12)
 */
export function retrieveRelevantLaw(
  query: string,
  topK = DEFAULT_TOP_K,
  minScore = DEFAULT_MIN_SCORE,
): RetrievalResult[] {
  const queryLower = query.toLowerCase()
  const queryWords = tokenize(queryLower)
  const expandedWords = expandWithSynonyms(queryWords)

  return LEGAL_CORPUS
    .filter(chunk => chunk.vigente)
    .map(chunk => ({
      chunk,
      score: scoreChunk(chunk, queryLower, queryWords, expandedWords),
      method: 'keyword' as const,
    }))
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/**
 * Formatea los chunks recuperados como contexto para el LLM.
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
 * Wrapper: recupera contexto legal formateado listo para inyectar en system prompt.
 */
export function getRelevantLegalContext(query: string, topK = DEFAULT_TOP_K): string {
  const results = retrieveRelevantLaw(query, topK)
  return formatRetrievedContext(results)
}

/**
 * Extrae citas legales de los resultados de retrieval (para mostrar al usuario).
 */
export function extractCitationsFromRetrieval(results: RetrievalResult[]): string[] {
  const seen = new Set<string>()
  const citations: string[] = []
  for (const r of results) {
    const cite = r.chunk.articulo
      ? `${r.chunk.norma}, ${r.chunk.articulo}`
      : r.chunk.norma
    if (!seen.has(cite)) {
      seen.add(cite)
      citations.push(cite)
    }
  }
  return citations
}
