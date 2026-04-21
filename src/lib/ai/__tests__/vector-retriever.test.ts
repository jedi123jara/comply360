import { describe, it, expect } from 'vitest'
import {
  cosineSimilarity,
  getUnifiedCorpus,
  retrieveRelevantLawVector,
  formatVectorContext,
} from '../rag/vector-retriever'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [0.5, 0.2, 0.9, 0.1]
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 5)
  })

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5)
  })

  it('returns value in [-1, 1] for arbitrary vectors', () => {
    const v1 = [0.3, 0.7, 0.1]
    const v2 = [0.9, 0.2, 0.4]
    const sim = cosineSimilarity(v1, v2)
    expect(sim).toBeGreaterThanOrEqual(-1)
    expect(sim).toBeLessThanOrEqual(1)
  })

  it('returns 0 for zero-magnitude vectors', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
    expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0)
  })

  it('returns 0 for mismatched-length vectors', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0)
  })

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0)
  })

  it('is commutative', () => {
    const a = [0.1, 0.5, 0.3, 0.9]
    const b = [0.8, 0.2, 0.7, 0.4]
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10)
  })

  it('correctly scales with vector magnitude (cosine ignora magnitud)', () => {
    const a = [1, 2, 3]
    const b = [2, 4, 6] // same direction, 2x magnitude
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5)
  })
})

describe('getUnifiedCorpus', () => {
  it('returns a non-empty array of chunks', () => {
    const corpus = getUnifiedCorpus()
    expect(Array.isArray(corpus)).toBe(true)
    expect(corpus.length).toBeGreaterThan(0)
  })

  it('only returns vigente chunks', () => {
    const corpus = getUnifiedCorpus()
    for (const c of corpus) {
      expect(c.vigente).toBe(true)
    }
  })

  it('every chunk has required fields', () => {
    const corpus = getUnifiedCorpus()
    for (const c of corpus) {
      expect(typeof c.id).toBe('string')
      expect(c.id.length).toBeGreaterThan(0)
      expect(typeof c.norma).toBe('string')
      expect(typeof c.titulo).toBe('string')
      expect(typeof c.texto).toBe('string')
      expect(Array.isArray(c.tags)).toBe(true)
    }
  })

  it('combines v1 (legal-corpus) and v2 (extended chunks.json) when available', () => {
    const corpus = getUnifiedCorpus()
    // At least the v1 has 73 chunks handcrafted → unified must have >= 73.
    expect(corpus.length).toBeGreaterThanOrEqual(73)
  })
})

describe('retrieveRelevantLawVector — fallback path', () => {
  // Sin embeddings.json presente → debe caer al keyword retriever y no crashear.
  it('returns results using keyword fallback when no embeddings', async () => {
    const results = await retrieveRelevantLawVector('que es CTS?', { topK: 3 })
    expect(Array.isArray(results)).toBe(true)
    // Puede devolver 0-3 resultados según corpus, pero nunca debe crashear
    expect(results.length).toBeLessThanOrEqual(3)
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.method === 'keyword' || r.method === 'vector').toBe(true)
    }
  })

  it('respects topK limit', async () => {
    const results = await retrieveRelevantLawVector('gratificacion julio diciembre', { topK: 2 })
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('respects minScore threshold', async () => {
    const strict = await retrieveRelevantLawVector('xyzabc queryinexistente zzz', { topK: 5, minScore: 0.5 })
    // Query absurda + score alto → debe devolver pocos o cero
    for (const r of strict) {
      expect(r.score).toBeGreaterThanOrEqual(0.5)
    }
  })

  it('returns empty-string context when no results', () => {
    expect(formatVectorContext([])).toBe('')
  })

  it('formats context with norma + titulo headers', () => {
    const corpus = getUnifiedCorpus()
    const sample = corpus.slice(0, 1).map((chunk) => ({
      chunk,
      score: 0.5,
      method: 'keyword' as const,
    }))
    const formatted = formatVectorContext(sample)
    expect(formatted).toContain('NORMATIVA APLICABLE RECUPERADA')
    expect(formatted).toContain(sample[0].chunk.norma)
    expect(formatted).toContain(sample[0].chunk.titulo)
  })
})
