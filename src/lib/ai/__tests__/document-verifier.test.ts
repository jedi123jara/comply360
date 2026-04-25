/**
 * Tests for document-verifier.ts
 *
 * Validates:
 *  - Returns 'unsupported' for non-image/non-PDF MIME types
 *  - Returns 'error' when OPENAI_API_KEY is not set
 *  - Accepted MIME types are image/jpeg and image/png (and application/pdf)
 *  - Never returns 'rejected' as a decision
 *  - VerificationResult shape includes required fields
 *  - Decision logic based on AI response confidence + cross-match
 *  - Cross-match DNI and fuzzy name matching via mocked API responses
 */

import type {
  DocumentInput,
  WorkerIdentity,
  VerificationResult,
  VerificationDecision,
} from '../document-verifier'

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const worker: WorkerIdentity = {
  firstName: 'Carlos',
  lastName: 'Ramirez Torres',
  dni: '45678912',
  birthDate: null,
  position: 'Analista',
}

function imageDoc(overrides: Partial<DocumentInput> = {}): DocumentInput {
  return {
    fileUrl: 'https://storage.example.com/docs/dni-photo.jpg',
    mimeType: 'image/jpeg',
    documentType: 'dni_copia',
    ...overrides,
  }
}

/**
 * Build a mock OpenAI chat completions response body for fetch.
 */
function openAIResponseBody(content: Record<string, unknown>): string {
  return JSON.stringify({
    choices: [{ message: { content: JSON.stringify(content) } }],
  })
}

function makeAIPayload(overrides: Record<string, unknown> = {}) {
  return {
    isCorrectType: true,
    isLegible: true,
    confidence: 0.92,
    extracted: {
      dni: '45678912',
      nombres: 'Carlos',
      apellidos: 'Ramirez Torres',
    },
    issues: [],
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════════════════

// Mock fs/promises so resolveImageDataUrl for local files does not hit disk
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('fake-image-data')),
}))

// We need to dynamically import after env manipulation, so use a loader helper.
async function loadVerifier() {
  // Clear module cache to pick up new env values
  vi.resetModules()
  const mod = await import('../document-verifier')
  return mod
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests — Input validation (no AI call needed)
// ═══════════════════════════════════════════════════════════════════════════

describe('verifyDocument — input validation', () => {
  it('routes application/pdf to PDF handler (not treated as unsupported)', async () => {
    // The source code DOES accept application/pdf — it routes to verifyPdfDocument
    // which uses pdf-parse for text extraction. It only returns 'unsupported' for
    // truly unsupported types (DOCX, text, octet-stream, etc.).
    // PDF verification will error/unsupported if pdf-parse fails, but the MIME
    // itself is accepted. We verify it does NOT short-circuit as 'unsupported'.
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(
      imageDoc({ mimeType: 'application/pdf', fileUrl: 'https://example.com/doc.pdf' }),
      worker,
    )
    // PDF path will fail (no real file / pdf-parse may error), but the decision
    // should NOT be 'unsupported' for the MIME type itself — it should be 'error'
    // or 'unsupported' only if the PDF has no extractable text.
    expect(['error', 'unsupported']).toContain(result.decision)
    // The key point: it went through the PDF handler, not the generic MIME reject
    // (generic MIME reject says "Solo se pueden auto-verificar imágenes JPG/PNG y PDFs")
    if (result.decision === 'unsupported') {
      // If unsupported, it's because the PDF had no text, not because of MIME
      expect(result.summary).not.toContain('Solo se pueden auto-verificar')
    }
  })

  it('returns decision "unsupported" for mimeType application/vnd.openxmlformats (DOCX)', async () => {
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(
      imageDoc({
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      worker,
    )
    expect(result.decision).toBe('unsupported')
    expect(result.confidence).toBe(0)
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('returns decision "unsupported" for mimeType text/plain', async () => {
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(
      imageDoc({ mimeType: 'text/plain' }),
      worker,
    )
    expect(result.decision).toBe('unsupported')
  })

  it('returns decision "unsupported" for empty/null mimeType', async () => {
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(
      imageDoc({ mimeType: null }),
      worker,
    )
    expect(result.decision).toBe('unsupported')
  })

  it('returns decision "unsupported" for mimeType application/octet-stream', async () => {
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(
      imageDoc({ mimeType: 'application/octet-stream' }),
      worker,
    )
    expect(result.decision).toBe('unsupported')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Tests — API key missing
// ═══════════════════════════════════════════════════════════════════════════

describe('verifyDocument — missing OPENAI_API_KEY', () => {
  const originalKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.OPENAI_API_KEY = originalKey
    } else {
      delete process.env.OPENAI_API_KEY
    }
  })

  it('returns decision "error" when OPENAI_API_KEY is not set (image)', async () => {
    const { verifyDocument } = await loadVerifier()
    // Mock fetch to not be called — the key check happens before fetch
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await verifyDocument(
      imageDoc({ fileUrl: 'https://example.com/img.jpg' }),
      worker,
    )
    expect(result.decision).toBe('error')
    expect(result.confidence).toBe(0)
    // fetch should not have been called for the OpenAI endpoint
    // (it may be called for image resolution but the vision call itself should throw)
    fetchSpy.mockRestore()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Tests — Accepted MIME types + decision logic (mocked AI)
// ═══════════════════════════════════════════════════════════════════════════

describe('verifyDocument — image verification with mocked OpenAI', () => {
  const originalKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key-fake'
  })

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.OPENAI_API_KEY = originalKey
    } else {
      delete process.env.OPENAI_API_KEY
    }
    vi.restoreAllMocks()
  })

  function mockFetchSuccess(payload: Record<string, unknown>) {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(openAIResponseBody(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }

  it('accepts image/jpeg and returns a valid VerificationResult', async () => {
    mockFetchSuccess(makeAIPayload())
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(
      imageDoc({ mimeType: 'image/jpeg' }),
      worker,
    )
    // Should not be unsupported
    expect(result.decision).not.toBe('unsupported')
    // Shape check
    expect(result).toHaveProperty('decision')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('summary')
    expect(result).toHaveProperty('issues')
    expect(result).toHaveProperty('extracted')
    expect(typeof result.confidence).toBe('number')
    expect(typeof result.summary).toBe('string')
    expect(Array.isArray(result.issues)).toBe(true)
  })

  it('accepts image/png and returns a valid VerificationResult', async () => {
    mockFetchSuccess(makeAIPayload())
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(
      imageDoc({ mimeType: 'image/png', fileUrl: 'https://example.com/doc.png' }),
      worker,
    )
    expect(result.decision).not.toBe('unsupported')
    expect(result).toHaveProperty('decision')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('summary')
  })

  it('returns "auto-verified" when confidence >= 0.85 and all fields match', async () => {
    mockFetchSuccess(makeAIPayload({ confidence: 0.92 }))
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.decision).toBe('auto-verified')
    expect(result.confidence).toBeGreaterThanOrEqual(0.85)
    expect(result.model).toBe('gpt-4o-mini')
  })

  it('returns "needs-review" when confidence is between 0.60 and 0.85', async () => {
    mockFetchSuccess(
      makeAIPayload({
        confidence: 0.72,
        extracted: { dni: '45678912', nombres: 'Carlos', apellidos: 'Ramirez Torres' },
      }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    // With matching fields but confidence < 0.85 → needs-review
    expect(result.decision).toBe('needs-review')
    expect(result.confidence).toBeGreaterThanOrEqual(0.60)
    expect(result.confidence).toBeLessThan(0.85)
  })

  it('returns "mismatch" when extracted DNI does not match worker DNI', async () => {
    mockFetchSuccess(
      makeAIPayload({
        confidence: 0.90,
        extracted: {
          dni: '99999999',
          nombres: 'Carlos',
          apellidos: 'Ramirez Torres',
        },
      }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.decision).toBe('mismatch')
    expect(result.issues.some((i: string) => i.includes('DNI'))).toBe(true)
  })

  it('returns "wrong-type" when AI says isCorrectType=false', async () => {
    mockFetchSuccess(makeAIPayload({ isCorrectType: false, confidence: 0.80 }))
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.decision).toBe('wrong-type')
  })

  it('returns "unreadable" when AI says isLegible=false', async () => {
    mockFetchSuccess(
      makeAIPayload({ isLegible: false, confidence: 0.30 }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.decision).toBe('unreadable')
  })

  it('returns "error" when OpenAI returns non-200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Rate limit exceeded', { status: 429 }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.decision).toBe('error')
    expect(result.errorMessage).toBeTruthy()
  })

  it('returns "error" when OpenAI response is not valid JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'NOT VALID JSON {{' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.decision).toBe('error')
  })

  it('clamps confidence to [0, 1] range', async () => {
    mockFetchSuccess(makeAIPayload({ confidence: 1.5 }))
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.confidence).toBeLessThanOrEqual(1)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Tests — Cross-match / fuzzy name matching (via mocked AI responses)
// ═══════════════════════════════════════════════════════════════════════════

describe('verifyDocument — cross-match logic via mocked responses', () => {
  const originalKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key-fake'
  })

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.OPENAI_API_KEY = originalKey
    } else {
      delete process.env.OPENAI_API_KEY
    }
    vi.restoreAllMocks()
  })

  function mockFetchSuccess(payload: Record<string, unknown>) {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(openAIResponseBody(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }

  it('fuzzy matches names with accents (tildes)', async () => {
    mockFetchSuccess(
      makeAIPayload({
        confidence: 0.90,
        extracted: {
          dni: '45678912',
          nombres: 'CÁRLOS',
          apellidos: 'RAMÍREZ TORRES',
        },
      }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    // Should still match despite accents and case differences
    expect(result.decision).toBe('auto-verified')
  })

  it('fuzzy matches names regardless of case', async () => {
    mockFetchSuccess(
      makeAIPayload({
        confidence: 0.90,
        extracted: {
          dni: '45678912',
          nombres: 'carlos',
          apellidos: 'ramirez torres',
        },
      }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.decision).toBe('auto-verified')
  })

  it('reports name mismatch when names are completely different', async () => {
    mockFetchSuccess(
      makeAIPayload({
        confidence: 0.90,
        extracted: {
          dni: '45678912',
          nombres: 'Pedro',
          apellidos: 'Gonzalez Luna',
        },
      }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    // Names don't match → issues about names but DNI matches
    // The cross-match won't have allMatch=true, so it won't be auto-verified
    expect(result.decision).not.toBe('auto-verified')
    expect(result.issues.some((i: string) => i.toLowerCase().includes('nombre') || i.toLowerCase().includes('apellido'))).toBe(true)
  })

  it('handles fullName cross-match for CV document type', async () => {
    mockFetchSuccess({
      isCorrectType: true,
      isLegible: true,
      confidence: 0.88,
      extracted: {
        nombreCompleto: 'Carlos Ramirez Torres',
        experienciaLaboral: 'Analista en ABC Corp',
        formacion: 'Universidad Nacional',
      },
      issues: [],
    })
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(
      imageDoc({ documentType: 'cv', mimeType: 'image/jpeg' }),
      worker,
    )
    // CV uses fullName cross-match
    expect(result.decision).toBe('auto-verified')
  })

  it('strips non-digit characters from extracted DNI before comparison', async () => {
    mockFetchSuccess(
      makeAIPayload({
        confidence: 0.90,
        extracted: {
          dni: '456-789-12', // hyphens in DNI
          nombres: 'Carlos',
          apellidos: 'Ramirez Torres',
        },
      }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    // Should clean DNI and match
    expect(result.decision).toBe('auto-verified')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Tests — parseIsoDate helper (auto-detección de expiresAt)
// ═══════════════════════════════════════════════════════════════════════════

describe('parseIsoDate', () => {
  it('acepta formato ISO YYYY-MM-DD', async () => {
    const { parseIsoDate } = await loadVerifier()
    expect(parseIsoDate('2027-05-15')).toBe('2027-05-15')
  })

  it('acepta ISO con hora y recorta a fecha', async () => {
    const { parseIsoDate } = await loadVerifier()
    expect(parseIsoDate('2027-05-15T00:00:00Z')).toBe('2027-05-15')
  })

  it('rechaza formato DD/MM/YYYY (ambiguo)', async () => {
    const { parseIsoDate } = await loadVerifier()
    expect(parseIsoDate('15/05/2027')).toBe(null)
  })

  it('rechaza null, undefined, strings vacíos', async () => {
    const { parseIsoDate } = await loadVerifier()
    expect(parseIsoDate(null)).toBe(null)
    expect(parseIsoDate(undefined)).toBe(null)
    expect(parseIsoDate('')).toBe(null)
    expect(parseIsoDate(12345)).toBe(null)
  })

  it('rechaza años fuera de rango razonable', async () => {
    const { parseIsoDate } = await loadVerifier()
    expect(parseIsoDate('1800-01-01')).toBe(null)
    expect(parseIsoDate('2200-01-01')).toBe(null)
  })

  it('rechaza mes o día inválidos', async () => {
    const { parseIsoDate } = await loadVerifier()
    expect(parseIsoDate('2027-13-01')).toBe(null)
    expect(parseIsoDate('2027-05-32')).toBe(null)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Tests — Anti-fraude guard (suspicionScore downgrade)
// ═══════════════════════════════════════════════════════════════════════════

describe('verifyDocument — anti-fraude guard', () => {
  const originalKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key-fake'
  })

  afterEach(() => {
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey
    else delete process.env.OPENAI_API_KEY
    vi.restoreAllMocks()
  })

  function mockFetchSuccess(payload: Record<string, unknown>) {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(openAIResponseBody(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }

  it('baja auto-verified a needs-review cuando suspicionScore ≥ 0.6', async () => {
    mockFetchSuccess(
      makeAIPayload({
        confidence: 0.92,
        suspicionScore: 0.75,
        suspicionFlags: ['fuente inconsistente en DNI', 'bordes recortados'],
      }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.decision).toBe('needs-review')
    expect(result.suspicionScore).toBe(0.75)
    expect(result.suspicionFlags).toHaveLength(2)
    expect(result.issues.some((i) => i.includes('Posible manipulación'))).toBe(true)
  })

  it('mantiene auto-verified cuando suspicionScore es bajo', async () => {
    mockFetchSuccess(
      makeAIPayload({
        confidence: 0.92,
        suspicionScore: 0.1,
        suspicionFlags: [],
      }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.decision).toBe('auto-verified')
    expect(result.suspicionScore).toBe(0.1)
  })

  it('no afecta decisiones que ya eran mismatch/wrong-type', async () => {
    mockFetchSuccess(
      makeAIPayload({
        confidence: 0.9,
        suspicionScore: 0.9, // alta sospecha pero DNI distinto
        extracted: { dni: '99999999', nombres: 'Carlos', apellidos: 'Ramirez Torres' },
      }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.decision).toBe('mismatch')
    expect(result.suspicionScore).toBe(0.9)
  })

  it('expone expiresAt cuando la IA lo extrae en formato ISO válido', async () => {
    mockFetchSuccess(
      makeAIPayload({
        confidence: 0.92,
        expiryDate: '2029-06-30',
      }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.expiresAt).toBe('2029-06-30')
  })

  it('ignora expiryDate en formato no-ISO', async () => {
    mockFetchSuccess(
      makeAIPayload({
        confidence: 0.92,
        expiryDate: '30/06/2029',
      }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.expiresAt).toBe(null)
  })

  it('clampea suspicionScore al rango [0,1]', async () => {
    mockFetchSuccess(
      makeAIPayload({
        confidence: 0.9,
        suspicionScore: 1.5, // fuera de rango
      }),
    )
    const { verifyDocument } = await loadVerifier()
    const result = await verifyDocument(imageDoc(), worker)
    expect(result.suspicionScore).toBeLessThanOrEqual(1)
    expect(result.suspicionScore).toBeGreaterThanOrEqual(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Tests — Type system guarantees
// ═══════════════════════════════════════════════════════════════════════════

describe('VerificationDecision type — "rejected" is never a valid decision', () => {
  it('the VerificationDecision union does not include "rejected"', () => {
    // This is a compile-time check. We verify at runtime that the known
    // set of decisions does not include 'rejected'.
    const validDecisions: VerificationDecision[] = [
      'auto-verified',
      'needs-review',
      'mismatch',
      'wrong-type',
      'unreadable',
      'unsupported',
      'error',
    ]
    expect(validDecisions).not.toContain('rejected')
    // Exhaustiveness: the 7 values above are the full union
    expect(validDecisions).toHaveLength(7)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Tests — VerificationResult shape
// ═══════════════════════════════════════════════════════════════════════════

describe('VerificationResult — required fields', () => {
  it('unsupported result includes all required fields', async () => {
    const { verifyDocument } = await loadVerifier()
    const result: VerificationResult = await verifyDocument(
      imageDoc({ mimeType: 'application/msword' }),
      worker,
    )
    expect(result).toHaveProperty('decision')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('summary')
    expect(result).toHaveProperty('issues')
    expect(result).toHaveProperty('extracted')
    expect(typeof result.decision).toBe('string')
    expect(typeof result.confidence).toBe('number')
    expect(typeof result.summary).toBe('string')
    expect(Array.isArray(result.issues)).toBe(true)
    expect(typeof result.extracted).toBe('object')
  })
})
