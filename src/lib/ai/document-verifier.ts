/**
 * Document Verifier — auto-verificación de documentos del legajo con GPT-4o vision.
 *
 * Para cada documento subido por el trabajador (DNI, CV, examen médico, etc.),
 * esta lib:
 *   1. Lee el archivo (desde filesystem local o URL pública de Supabase)
 *   2. Lo envía a GPT-4o-mini con vision + prompt específico según docType
 *   3. Pide al modelo que extraiga campos clave + dictamine si:
 *      - El tipo de documento coincide con lo esperado
 *      - La identidad coincide con la del worker (cross-match DNI, nombres)
 *   4. Devuelve un `VerificationResult` con confianza, issues detectados y
 *      recomendación (auto-approve / pending-review / reject).
 *
 * Política del sistema:
 *   - Confianza >= 0.85 + todos los matches OK → auto-marcar VERIFIED
 *   - Confianza 0.60–0.85 → mantener UPLOADED + flag para admin review
 *   - Confianza < 0.60 o mismatch → mantener UPLOADED + reason visible al admin
 *
 * Nunca marca REJECTED automáticamente — la decisión final es humana.
 * Nunca lanza excepciones — devuelve `status: 'error'` con el motivo.
 */

import { readFile } from 'fs/promises'
import path from 'path'
import type { AIMessage } from '@/lib/ai/provider'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WorkerIdentity {
  firstName: string
  lastName: string
  dni: string
  birthDate?: Date | string | null
  position?: string | null
}

export interface DocumentInput {
  fileUrl: string
  mimeType: string | null
  /** Tipo esperado — ver legajo-config.REQUIRED_DOC_TYPES. */
  documentType: string
}

export type VerificationDecision =
  | 'auto-verified'    // Todo cuadra con alta confianza → status=VERIFIED
  | 'needs-review'     // Algo raro, admin debe revisar manualmente
  | 'mismatch'         // DNI/nombre no coincide con worker → sospechoso
  | 'wrong-type'       // El documento no es del tipo esperado
  | 'unreadable'       // GPT no pudo leer el documento
  | 'unsupported'      // Tipo de archivo no soportado (ej. DOCX)
  | 'error'            // Falla técnica

export interface VerificationResult {
  decision: VerificationDecision
  confidence: number // 0-1
  /** Datos extraídos por IA (dni, nombres, fechas, etc). */
  extracted: Record<string, string | null>
  /** Lista legible de issues detectados. */
  issues: string[]
  /** Mensaje breve en español para mostrar al admin. */
  summary: string
  /** Modelo usado (para trazabilidad). */
  model?: string
  /** Si ocurrió un error técnico, el mensaje. */
  errorMessage?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// Prompts por tipo de documento
// ═══════════════════════════════════════════════════════════════════════════

interface DocPromptConfig {
  /** Nombre legible del documento en español. */
  label: string
  /** Qué campos esperamos extraer. */
  expectedFields: string[]
  /** Instrucciones específicas para este tipo. */
  instructions: string
  /** Campos que DEBEN cruzar con datos del worker (si el worker los tiene). */
  crossMatch: Array<'dni' | 'firstName' | 'lastName' | 'fullName' | 'birthDate'>
}

const DOC_PROMPTS: Record<string, DocPromptConfig> = {
  dni_copia: {
    label: 'DNI peruano',
    expectedFields: ['dni', 'nombres', 'apellidos', 'fechaNacimiento', 'sexo'],
    instructions:
      'Debe ser un DNI peruano (Documento Nacional de Identidad) — tiene 8 dígitos. Verificá que sea legible. Leé ambos lados si están visibles.',
    crossMatch: ['dni', 'firstName', 'lastName'],
  },
  cv: {
    label: 'Curriculum Vitae',
    expectedFields: ['nombreCompleto', 'experienciaLaboral', 'formacion'],
    instructions:
      'Debe ser un CV / hoja de vida profesional. Verificá que contenga al menos nombre + experiencia o formación.',
    crossMatch: ['fullName'],
  },
  declaracion_jurada: {
    label: 'Declaración jurada de domicilio',
    expectedFields: ['nombreCompleto', 'dni', 'direccion', 'fecha'],
    instructions:
      'Debe ser una declaración jurada donde una persona declara su domicilio. Verificá nombre, DNI y dirección.',
    crossMatch: ['dni', 'fullName'],
  },
  examen_medico_ingreso: {
    label: 'Examen médico de ingreso',
    expectedFields: ['nombreCompleto', 'dni', 'fechaExamen', 'institucion', 'aptitud'],
    instructions:
      'Debe ser un certificado de aptitud médica laboral (preocupacional). Verificá nombre del trabajador y que se declare aptitud para el puesto.',
    crossMatch: ['fullName', 'dni'],
  },
  examen_medico_periodico: {
    label: 'Examen médico periódico',
    expectedFields: ['nombreCompleto', 'dni', 'fechaExamen', 'aptitud'],
    instructions:
      'Debe ser un certificado médico ocupacional periódico. Verificá identidad y vigencia.',
    crossMatch: ['fullName', 'dni'],
  },
  afp_onp_afiliacion: {
    label: 'Afiliación AFP u ONP',
    expectedFields: ['nombreCompleto', 'dni', 'cuspp', 'afp', 'fechaAfiliacion'],
    instructions:
      'Debe ser un comprobante de afiliación al sistema previsional (AFP o ONP). Aceptá constancia de Habitat, Integra, Prima, Profuturo, ONP.',
    crossMatch: ['fullName', 'dni'],
  },
}

// Config default para tipos sin prompt específico
const DEFAULT_PROMPT: DocPromptConfig = {
  label: 'documento',
  expectedFields: ['nombreCompleto', 'dni'],
  instructions:
    'Verificá que el documento sea legible y contenga información identificable (nombre y/o DNI del trabajador).',
  crossMatch: ['fullName', 'dni'],
}

// ═══════════════════════════════════════════════════════════════════════════
// Main function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica un documento del legajo usando IA de visión.
 *
 * - Seguro: nunca lanza excepciones, devuelve `decision: 'error'` con detalle
 * - Idempotente: múltiples llamadas con el mismo archivo dan el mismo
 *   resultado (modulo variabilidad del LLM — por eso temperature=0)
 * - Respeta gracefully archivos no soportados (DOCX, PDF escaneado pesado)
 */
export async function verifyDocument(
  document: DocumentInput,
  worker: WorkerIdentity,
): Promise<VerificationResult> {
  // ── Validación de tipo de archivo ────────────────────────────────────────
  const mime = (document.mimeType ?? '').toLowerCase()
  const supportsImage = mime === 'image/jpeg' || mime === 'image/png'
  const supportsPdf = mime === 'application/pdf'

  if (!supportsImage && !supportsPdf) {
    return {
      decision: 'unsupported',
      confidence: 0,
      extracted: {},
      issues: [`Tipo de archivo no soportado para auto-verificación: ${mime || 'desconocido'}`],
      summary: 'Solo se pueden auto-verificar imágenes JPG/PNG y PDFs.',
    }
  }

  // ── Ruta PDF: extraer texto con pdf-parse y usar GPT-4o text ─────────────
  // Evitamos el costoso render PDF→imagen (pdfjs-dist requiere canvas nativo).
  // Si el PDF es texto-extraíble funciona 1000× mejor (y más barato) que vision.
  // Si es scan de imagen sin OCR, pdf-parse devuelve texto vacío y devolvemos
  // `unsupported` con mensaje útil sugiriendo al worker que suba foto.
  if (supportsPdf && !supportsImage) {
    return await verifyPdfDocument(document, worker)
  }

  // ── Resolver contenido del archivo ───────────────────────────────────────
  let imageDataUrl: string
  try {
    imageDataUrl = await resolveImageDataUrl(document.fileUrl, mime)
  } catch (err) {
    return {
      decision: 'error',
      confidence: 0,
      extracted: {},
      issues: ['No se pudo leer el archivo'],
      summary: 'Error accediendo al archivo para verificación.',
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }

  // ── Armar prompt ─────────────────────────────────────────────────────────
  const config = DOC_PROMPTS[document.documentType] ?? DEFAULT_PROMPT
  const workerFullName = `${worker.firstName} ${worker.lastName}`.trim()

  const systemPrompt = buildSystemPrompt(config)
  const userPrompt = buildUserPrompt(config, worker, workerFullName)

  // ── Llamada a GPT-4o con vision ──────────────────────────────────────────
  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    // El content de user combina texto + imagen. Usamos el hack de contenido
    // estructurado con image_url — nuestro callAI envía content como string,
    // así que tenemos que hacer la llamada más directa para vision.
    {
      role: 'user',
      content: userPrompt,
    },
  ]

  let rawResponse: string
  try {
    rawResponse = await callAIWithVision(messages, imageDataUrl)
  } catch (err) {
    return {
      decision: 'error',
      confidence: 0,
      extracted: {},
      issues: ['Error en API de IA'],
      summary: 'No se pudo contactar al servicio de verificación.',
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }

  // ── Parsear y validar ────────────────────────────────────────────────────
  const parsed = parseVerificationResponse(rawResponse)
  if (!parsed) {
    return {
      decision: 'error',
      confidence: 0,
      extracted: {},
      issues: ['Respuesta IA no parseable'],
      summary: 'El sistema de verificación devolvió una respuesta inesperada.',
      errorMessage: `Raw: ${rawResponse.slice(0, 200)}`,
    }
  }

  // ── Cross-match contra datos del worker ──────────────────────────────────
  const issues: string[] = []
  const matches = crossMatchFields(parsed.extracted, worker, config.crossMatch, issues)

  // ── Decidir resultado ────────────────────────────────────────────────────
  const aiConfidence = Math.max(0, Math.min(1, parsed.confidence ?? 0))

  let decision: VerificationDecision
  let summary: string

  if (parsed.isCorrectType === false) {
    decision = 'wrong-type'
    summary = `No parece ser un ${config.label}.`
  } else if (!parsed.isLegible) {
    decision = 'unreadable'
    summary = 'El documento no es suficientemente legible.'
  } else if (!matches.allMatch && matches.hardMismatches > 0) {
    decision = 'mismatch'
    summary = `Los datos del documento no coinciden con el trabajador.`
  } else if (aiConfidence >= 0.85 && matches.allMatch) {
    decision = 'auto-verified'
    summary = `${config.label.charAt(0).toUpperCase() + config.label.slice(1)} validado con IA.`
  } else {
    decision = 'needs-review'
    summary = 'Documento subido correctamente, pendiente de revisión manual.'
  }

  // Agregar issues del parser a los del cross-match
  if (Array.isArray(parsed.issues)) {
    for (const i of parsed.issues) {
      if (typeof i === 'string' && i.length > 0 && !issues.includes(i)) {
        issues.push(i)
      }
    }
  }

  return {
    decision,
    confidence: aiConfidence,
    extracted: parsed.extracted,
    issues,
    summary,
    model: 'gpt-4o-mini',
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Prompt builders
// ═══════════════════════════════════════════════════════════════════════════

function buildSystemPrompt(config: DocPromptConfig): string {
  return `Sos un verificador de documentos del legajo laboral peruano. Tu rol es analizar la imagen de un documento y responder estrictamente en JSON.

Contexto legal: estás ayudando a una empresa peruana a validar documentos subidos por sus trabajadores según el legajo digital obligatorio (D.S. 003-97-TR).

Instrucciones para este documento (${config.label}):
${config.instructions}

Campos esperados: ${config.expectedFields.join(', ')}

Respondé SIEMPRE con este JSON exacto, sin texto adicional:
{
  "isCorrectType": boolean,
  "isLegible": boolean,
  "confidence": number,
  "extracted": {
    "campo1": "valor o null",
    ...
  },
  "issues": ["issue 1", "issue 2"]
}

Reglas:
- isCorrectType: true si la imagen es un ${config.label}, false si es otra cosa
- isLegible: true si podés leer el contenido, false si está borroso/cortado
- confidence: tu certeza de 0 a 1 sobre la identificación correcta del documento
- extracted: objeto plano con los campos que pudiste leer. Usá null si no se ve
- issues: lista de problemas detectados (ej: "documento vencido", "dato borroso", "foto rotada")

Si el documento no es del tipo esperado, devolvé isCorrectType=false pero igual intentá extracción para diagnóstico.`
}

function buildUserPrompt(
  config: DocPromptConfig,
  worker: WorkerIdentity,
  fullName: string,
): string {
  return `Analizá este ${config.label} para el trabajador:
- Nombre: ${fullName}
- DNI: ${worker.dni}
${worker.position ? `- Cargo: ${worker.position}` : ''}

Verificá que:
1. El documento es efectivamente un ${config.label}
2. Los datos coinciden con el trabajador (cuando aplique)
3. El documento está vigente y legible

Respondé con el JSON especificado. No agregues explicaciones fuera del JSON.`
}

// ═══════════════════════════════════════════════════════════════════════════
// Cross-match logic
// ═══════════════════════════════════════════════════════════════════════════

interface CrossMatchResult {
  allMatch: boolean
  /** Mismatches "duros" — DNI distinto, nombre totalmente distinto. */
  hardMismatches: number
}

function crossMatchFields(
  extracted: Record<string, string | null>,
  worker: WorkerIdentity,
  required: DocPromptConfig['crossMatch'],
  issues: string[],
): CrossMatchResult {
  let hardMismatches = 0
  let matchChecks = 0
  let matchHits = 0

  for (const field of required) {
    if (field === 'dni') {
      const extractedDni = findAny(extracted, ['dni', 'documento', 'documentoIdentidad'])
      if (extractedDni) {
        matchChecks++
        const clean = extractedDni.replace(/\D/g, '')
        if (clean === worker.dni) {
          matchHits++
        } else {
          hardMismatches++
          issues.push(`DNI del documento (${clean}) no coincide con el del trabajador (${worker.dni})`)
        }
      }
    } else if (field === 'firstName') {
      const v = findAny(extracted, ['nombres', 'nombre', 'firstName'])
      if (v) {
        matchChecks++
        if (fuzzyNameMatch(v, worker.firstName)) matchHits++
        else issues.push(`Nombres del documento ("${v}") no coinciden con "${worker.firstName}"`)
      }
    } else if (field === 'lastName') {
      const v = findAny(extracted, ['apellidos', 'apellido', 'lastName'])
      if (v) {
        matchChecks++
        if (fuzzyNameMatch(v, worker.lastName)) matchHits++
        else issues.push(`Apellidos del documento ("${v}") no coinciden con "${worker.lastName}"`)
      }
    } else if (field === 'fullName') {
      const v = findAny(extracted, [
        'nombreCompleto',
        'nombreYApellido',
        'fullName',
        'titular',
        'nombres',
      ])
      if (v) {
        matchChecks++
        const fullName = `${worker.firstName} ${worker.lastName}`.trim()
        if (fuzzyNameMatch(v, fullName) || fuzzyNameMatch(v, worker.firstName) || fuzzyNameMatch(v, worker.lastName)) {
          matchHits++
        } else {
          issues.push(`Nombre del documento ("${v}") no coincide con "${fullName}"`)
        }
      }
    }
  }

  // Si nunca pudimos cruzar nada, no contamos mismatch — pero tampoco puntos
  const allMatch = matchChecks > 0 && matchHits === matchChecks
  return { allMatch, hardMismatches }
}

function findAny(extracted: Record<string, string | null>, keys: string[]): string | null {
  for (const k of keys) {
    const v = extracted[k]
    if (typeof v === 'string' && v.trim().length > 0) return v.trim()
  }
  return null
}

/**
 * Fuzzy match tolerante — normaliza tildes, case, espacios, y acepta si
 * las palabras se contienen mutuamente (orden no importa).
 */
function fuzzyNameMatch(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)

  const aWords = new Set(normalize(a))
  const bWords = new Set(normalize(b))
  if (aWords.size === 0 || bWords.size === 0) return false

  // Al menos 1 palabra significativa (>2 chars) debe estar en ambos lados
  for (const w of aWords) {
    if (w.length > 2 && bWords.has(w)) return true
  }
  return false
}

// ═══════════════════════════════════════════════════════════════════════════
// AI call with vision
// ═══════════════════════════════════════════════════════════════════════════

interface ParsedResponse {
  isCorrectType: boolean
  isLegible: boolean
  confidence: number
  extracted: Record<string, string | null>
  issues: string[]
}

/**
 * Llama a GPT-4o-mini con vision directamente (bypassa `callAI` porque
 * necesitamos content estructurado con image_url).
 *
 * Si no hay OPENAI_API_KEY, falla — la verificación IA es feature de plan
 * EMPRESA+ que requiere OpenAI.
 */
async function callAIWithVision(messages: AIMessage[], imageDataUrl: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no configurada')
  }

  const url = 'https://api.openai.com/v1/chat/completions'

  // Agregar la imagen al último mensaje de user
  const lastUser = messages[messages.length - 1]
  const visionMessages = [
    ...messages.slice(0, -1),
    {
      role: lastUser.role,
      content: [
        { type: 'text', text: lastUser.content },
        { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
      ],
    },
  ]

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: visionMessages,
      temperature: 0,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI vision ${res.status}: ${errText.slice(0, 200)}`)
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('Respuesta OpenAI sin content')
  return content
}

function parseVerificationResponse(raw: string): ParsedResponse | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    // Flexibilidad en el formato — intentamos recuperar campos aunque el
    // modelo haya variado ligeramente.
    return {
      isCorrectType: Boolean(parsed.isCorrectType),
      isLegible: parsed.isLegible !== false,
      confidence:
        typeof parsed.confidence === 'number'
          ? parsed.confidence
          : typeof parsed.confidence === 'string'
            ? parseFloat(parsed.confidence) || 0
            : 0.5,
      extracted:
        typeof parsed.extracted === 'object' && parsed.extracted !== null
          ? (parsed.extracted as Record<string, string | null>)
          : {},
      issues: Array.isArray(parsed.issues) ? (parsed.issues as string[]) : [],
    }
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// File resolver — local filesystem o URL externa
// ═══════════════════════════════════════════════════════════════════════════

async function resolveImageDataUrl(fileUrl: string, mime: string): Promise<string> {
  // Supabase / cualquier URL absoluta → devolver tal cual (GPT la fetcha)
  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl
  }

  // URL relativa local (ej: "/uploads/workers/abc/123.jpg") → leer del FS y
  // empaquetar como base64 data URL
  if (fileUrl.startsWith('/uploads/')) {
    const absPath = path.join(process.cwd(), 'public', fileUrl)
    const buffer = await readFile(absPath)
    const base64 = buffer.toString('base64')
    return `data:${mime};base64,${base64}`
  }

  throw new Error(`URL de archivo no reconocida: ${fileUrl}`)
}

// ═══════════════════════════════════════════════════════════════════════════
// PDF verification — extrae texto con pdf-parse + GPT-4o text
// ═══════════════════════════════════════════════════════════════════════════

async function verifyPdfDocument(
  document: DocumentInput,
  worker: WorkerIdentity,
): Promise<VerificationResult> {
  // ── Leer bytes del PDF ───────────────────────────────────────────────────
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await resolvePdfBuffer(document.fileUrl)
  } catch (err) {
    return {
      decision: 'error',
      confidence: 0,
      extracted: {},
      issues: ['No se pudo leer el PDF'],
      summary: 'Error accediendo al archivo PDF.',
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }

  // ── Extraer texto (pdf-parse v2 API: PDFParse class + getText()) ─────────
  let extractedText: string
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const { PDFParse } = require('pdf-parse') as any
    const result = await new PDFParse({ data: pdfBuffer }).getText()
    extractedText = ((result.text as string) ?? '')
      .replace(/\n*-- \d+ of \d+ --\n*/g, '\n\n') // markers de página v2
      .trim()
  } catch (err) {
    return {
      decision: 'error',
      confidence: 0,
      extracted: {},
      issues: ['Error al parsear PDF'],
      summary: 'No se pudo extraer texto del PDF.',
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }

  // PDF scaneado sin OCR → texto vacío. Fallback: pedir que suba foto.
  if (extractedText.length < 30) {
    return {
      decision: 'unsupported',
      confidence: 0,
      extracted: {},
      issues: [
        'El PDF no contiene texto extraíble (probablemente escaneo de imagen sin OCR)',
      ],
      summary:
        'Este PDF es un escaneo. Para auto-verificarlo, subí una foto clara del documento (JPG/PNG).',
    }
  }

  // ── Armar prompt text-only ───────────────────────────────────────────────
  const config = DOC_PROMPTS[document.documentType] ?? DEFAULT_PROMPT
  const workerFullName = `${worker.firstName} ${worker.lastName}`.trim()

  const systemPrompt = buildSystemPrompt(config)
  const userPrompt = `Analizá este ${config.label} para el trabajador:
- Nombre: ${workerFullName}
- DNI: ${worker.dni}
${worker.position ? `- Cargo: ${worker.position}` : ''}

Texto extraído del PDF (puede tener saltos de línea raros o caracteres OCR):
"""
${extractedText.slice(0, 8000)}
"""

Respondé con el JSON especificado. No agregues explicaciones fuera del JSON.`

  // ── Llamada a GPT-4o-mini text ───────────────────────────────────────────
  let rawResponse: string
  try {
    rawResponse = await callAITextOnly([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
  } catch (err) {
    return {
      decision: 'error',
      confidence: 0,
      extracted: {},
      issues: ['Error en API de IA'],
      summary: 'No se pudo contactar al servicio de verificación.',
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }

  const parsed = parseVerificationResponse(rawResponse)
  if (!parsed) {
    return {
      decision: 'error',
      confidence: 0,
      extracted: {},
      issues: ['Respuesta IA no parseable'],
      summary: 'El sistema de verificación devolvió una respuesta inesperada.',
      errorMessage: `Raw: ${rawResponse.slice(0, 200)}`,
    }
  }

  // ── Cross-match + decisión (misma lógica que imagen) ─────────────────────
  const issues: string[] = []
  const matches = crossMatchFields(parsed.extracted, worker, config.crossMatch, issues)
  const aiConfidence = Math.max(0, Math.min(1, parsed.confidence ?? 0))

  let decision: VerificationDecision
  let summary: string

  if (parsed.isCorrectType === false) {
    decision = 'wrong-type'
    summary = `No parece ser un ${config.label}.`
  } else if (!parsed.isLegible) {
    decision = 'unreadable'
    summary = 'El documento no es suficientemente legible.'
  } else if (!matches.allMatch && matches.hardMismatches > 0) {
    decision = 'mismatch'
    summary = 'Los datos del documento no coinciden con el trabajador.'
  } else if (aiConfidence >= 0.85 && matches.allMatch) {
    decision = 'auto-verified'
    summary = `${config.label.charAt(0).toUpperCase() + config.label.slice(1)} validado con IA (PDF).`
  } else {
    decision = 'needs-review'
    summary = 'PDF subido correctamente, pendiente de revisión manual.'
  }

  if (Array.isArray(parsed.issues)) {
    for (const i of parsed.issues) {
      if (typeof i === 'string' && i.length > 0 && !issues.includes(i)) {
        issues.push(i)
      }
    }
  }

  return {
    decision,
    confidence: aiConfidence,
    extracted: parsed.extracted,
    issues,
    summary,
    model: 'gpt-4o-mini-text',
  }
}

async function resolvePdfBuffer(fileUrl: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(fileUrl)) {
    const res = await fetch(fileUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching PDF`)
    const ab = await res.arrayBuffer()
    return Buffer.from(ab)
  }
  if (fileUrl.startsWith('/uploads/')) {
    const absPath = path.join(process.cwd(), 'public', fileUrl)
    return readFile(absPath)
  }
  throw new Error(`URL de PDF no reconocida: ${fileUrl}`)
}

async function callAITextOnly(messages: AIMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY no configurada')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`)
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('Respuesta OpenAI sin content')
  return content
}
