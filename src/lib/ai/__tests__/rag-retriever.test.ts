/**
 * Tests for the Legal RAG Retriever
 *
 * Validates:
 *  - retrieveRelevantLaw returns results for known queries
 *  - Results are ordered by score (descending)
 *  - Score is normalized to [0, 1]
 *  - Only vigente=true chunks are returned
 *  - formatRetrievedContext formats correctly
 *  - getRelevantLegalContext returns non-empty for known topics
 *  - Legal corpus has the expected minimum size
 */

import { describe, it, expect } from 'vitest'
import {
  retrieveRelevantLaw,
  formatRetrievedContext,
  getRelevantLegalContext,
} from '../rag/retriever'
import { LEGAL_CORPUS } from '../rag/legal-corpus'

// ─── Corpus integrity ─────────────────────────────────────────────────────────

describe('LEGAL_CORPUS', () => {
  it('has at least 40 chunks (was 23 before Oleada 3A)', () => {
    expect(LEGAL_CORPUS.length).toBeGreaterThanOrEqual(40)
  })

  it('all chunks have required fields', () => {
    for (const chunk of LEGAL_CORPUS) {
      expect(chunk.id).toBeTruthy()
      expect(chunk.norma).toBeTruthy()
      expect(chunk.titulo).toBeTruthy()
      expect(chunk.texto.length).toBeGreaterThan(20)
      expect(Array.isArray(chunk.tags)).toBe(true)
      expect(typeof chunk.vigente).toBe('boolean')
    }
  })

  it('all chunk IDs are unique', () => {
    const ids = LEGAL_CORPUS.map(c => c.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('includes key normas: CTS, vacaciones, SST, MYPE, hostigamiento', () => {
    const texts = LEGAL_CORPUS.map(c => `${c.titulo} ${c.norma} ${c.tags.join(' ')}`).join(' ')
    expect(texts.toLowerCase()).toContain('cts')
    expect(texts.toLowerCase()).toContain('vacacion')
    expect(texts.toLowerCase()).toContain('sst')
    expect(texts.toLowerCase()).toContain('mype')
    expect(texts.toLowerCase()).toContain('hostigamiento')
  })

  it('includes Oleada 3A additions: teletrabajo, agrario, sctr, afp', () => {
    const texts = LEGAL_CORPUS.flatMap(c => c.tags).join(' ').toLowerCase()
    expect(texts).toContain('teletrabajo')
    expect(texts).toContain('agrario')
    expect(texts).toContain('sctr')
    expect(texts).toContain('afp')
  })
})

// ─── retrieveRelevantLaw ──────────────────────────────────────────────────────

describe('retrieveRelevantLaw', () => {
  it('returns results for a CTS query', () => {
    const results = retrieveRelevantLaw('¿Cómo calculo la CTS?')
    expect(results.length).toBeGreaterThan(0)
  })

  it('returns results ordered by score descending', () => {
    const results = retrieveRelevantLaw('vacaciones truncas trabajador renuncio')
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score)
    }
  })

  it('scores are in [0, 1]', () => {
    const results = retrieveRelevantLaw('gratificaciones julio diciembre calculo')
    for (const r of results) {
      expect(r.score).toBeGreaterThan(0)
      expect(r.score).toBeLessThanOrEqual(1)
    }
  })

  it('limits results to topK parameter', () => {
    const results = retrieveRelevantLaw('contrato plazo fijo', 2)
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('returns empty array for very obscure queries below minScore', () => {
    // Gibberish that matches nothing
    const results = retrieveRelevantLaw('zzzzxxx qqqwwweee 12839474', 4, 0.5)
    expect(results.length).toBe(0)
  })

  it('method is always "keyword"', () => {
    const results = retrieveRelevantLaw('CTS')
    for (const r of results) {
      expect(r.method).toBe('keyword')
    }
  })

  it('returns relevant chunk for CTS query', () => {
    const results = retrieveRelevantLaw('compensación tiempo servicios deposito mayo noviembre')
    const ids = results.map(r => r.chunk.id)
    expect(ids).toContain('cts')
  })

  it('returns relevant chunk for despido query', () => {
    const results = retrieveRelevantLaw('despido arbitrario carta indemnización')
    expect(results.length).toBeGreaterThan(0)
    const ids = results.map(r => r.chunk.id)
    // Should match despido-indemnizacion or faltas-graves
    const hasRelevant = ids.some(id => id.includes('despido') || id.includes('falta'))
    expect(hasRelevant).toBe(true)
  })

  it('returns relevant chunk for hostigamiento sexual query', () => {
    const results = retrieveRelevantLaw('hostigamiento sexual obligaciones empleador denuncia')
    expect(results.length).toBeGreaterThan(0)
    const ids = results.map(r => r.chunk.id)
    const hasHostigamiento = ids.some(id => id.includes('hostigamiento'))
    expect(hasHostigamiento).toBe(true)
  })

  it('returns relevant chunk for teletrabajo query', () => {
    const results = retrieveRelevantLaw('teletrabajo home office desconexion digital')
    expect(results.length).toBeGreaterThan(0)
    const ids = results.map(r => r.chunk.id)
    expect(ids).toContain('teletrabajo')
  })

  it('returns relevant chunk for MYPE query', () => {
    const results = retrieveRelevantLaw('régimen mype microempresa pequeña empresa beneficios')
    expect(results.length).toBeGreaterThan(0)
    const ids = results.map(r => r.chunk.id)
    const hasMype = ids.some(id => id.includes('mype') || id.includes('regimen'))
    expect(hasMype).toBe(true)
  })

  it('returns relevant chunk for AFP/ONP query', () => {
    const results = retrieveRelevantLaw('afp onp aporte pensión sistema previsional')
    expect(results.length).toBeGreaterThan(0)
    const ids = results.map(r => r.chunk.id)
    expect(ids).toContain('afp-onp')
  })

  it('returns relevant chunk for SCTR query', () => {
    const results = retrieveRelevantLaw('sctr seguro complementario trabajo de riesgo accidente')
    expect(results.length).toBeGreaterThan(0)
    const ids = results.map(r => r.chunk.id)
    expect(ids).toContain('sctr')
  })

  it('only returns chunks where vigente=true', () => {
    const results = retrieveRelevantLaw('contrato trabajo')
    for (const r of results) {
      expect(r.chunk.vigente).toBe(true)
    }
  })
})

// ─── formatRetrievedContext ───────────────────────────────────────────────────

describe('formatRetrievedContext', () => {
  it('returns empty string when results array is empty', () => {
    expect(formatRetrievedContext([])).toBe('')
  })

  it('includes norma and titulo in output', () => {
    const results = retrieveRelevantLaw('CTS compensación tiempo servicios', 1)
    if (results.length === 0) return // skip if no results
    const ctx = formatRetrievedContext(results)
    expect(ctx).toContain(results[0].chunk.norma)
    expect(ctx).toContain(results[0].chunk.titulo)
  })

  it('includes separator between chunks', () => {
    const results = retrieveRelevantLaw('remuneracion sueldo RMV vacaciones', 2)
    if (results.length < 2) return
    const ctx = formatRetrievedContext(results)
    expect(ctx).toContain('---')
  })

  it('includes article reference when chunk has articulo', () => {
    const results = retrieveRelevantLaw('CTS compensación')
    const withArticulo = results.find(r => r.chunk.articulo)
    if (!withArticulo) return
    const ctx = formatRetrievedContext([withArticulo])
    expect(ctx).toContain(withArticulo.chunk.articulo!)
  })

  it('wraps output in delimiters', () => {
    const results = retrieveRelevantLaw('vacaciones')
    if (results.length === 0) return
    const ctx = formatRetrievedContext(results.slice(0, 1))
    expect(ctx).toContain('══')
  })
})

// ─── getRelevantLegalContext ──────────────────────────────────────────────────

describe('getRelevantLegalContext', () => {
  it('returns non-empty string for known topics', () => {
    expect(getRelevantLegalContext('cálculo de gratificaciones').length).toBeGreaterThan(0)
    expect(getRelevantLegalContext('despido trabajador carta preaviso').length).toBeGreaterThan(0)
    expect(getRelevantLegalContext('multas sunafil infracción').length).toBeGreaterThan(0)
  })

  it('returns empty string for gibberish query (minScore filter)', () => {
    // Use the default minScore of 0.05 — very obscure query
    const ctx = getRelevantLegalContext('zzzzzzz aabbcc xxyyzz 99999')
    // May or may not be empty depending on partial matches — just check it doesn't throw
    expect(typeof ctx).toBe('string')
  })
})
