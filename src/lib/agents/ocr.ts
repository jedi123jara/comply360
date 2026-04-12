/**
 * OCR Helper — Extracción de texto de PDFs escaneados
 *
 * Estrategia en cascada (usa el primero disponible):
 *  1. Mistral OCR API   → si MISTRAL_API_KEY está configurada
 *                         $1/1,000 páginas · Máxima calidad · PDF directo
 *  2. OCR.space API     → si OCR_SPACE_API_KEY está configurada (o usa clave pública)
 *                         Gratis 25k páginas/mes · PDF directo · Solo fetch
 *
 * Sin instalación de binarios nativos. Funciona en Vercel, Railway, VPS, etc.
 */

const OCR_SPACE_ENDPOINT = 'https://api.ocr.space/parse/image'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface OcrSpaceResult {
  ParsedResults?: { ParsedText: string; ErrorMessage?: string }[]
  IsErroredOnProcessing: boolean
  ErrorMessage?: string[]
  OCRExitCode: number
}

interface MistralOcrPage {
  markdown: string
  index: number
}

interface MistralOcrResult {
  pages?: MistralOcrPage[]
  model?: string
}

// ── Función principal ─────────────────────────────────────────────────────────

/**
 * Extrae texto de un PDF escaneado usando OCR.
 * Devuelve el texto completo o lanza un error si todos los métodos fallan.
 *
 * @param buffer - Buffer del archivo PDF
 * @param maxSizeMb - Límite de tamaño en MB (default 4.5 — límite OCR.space paid)
 */
export async function ocrPdfBuffer(
  buffer: Buffer,
  maxSizeMb = 4.5
): Promise<string> {
  const sizeMb = buffer.byteLength / (1024 * 1024)

  if (sizeMb > maxSizeMb) {
    throw new Error(
      `El PDF pesa ${sizeMb.toFixed(1)} MB y supera el límite de ${maxSizeMb} MB para OCR. ` +
      `Divide el archivo en partes más pequeñas.`
    )
  }

  // 1. Intentar Mistral OCR si hay API key configurada
  const mistralKey = process.env.MISTRAL_API_KEY
  if (mistralKey && mistralKey.trim().length > 10) {
    try {
      const text = await ocrWithMistral(buffer, mistralKey)
      if (text && text.trim().length > 50) return text
    } catch (e) {
      console.warn('[OCR] Mistral OCR falló, intentando OCR.space:', e instanceof Error ? e.message : e)
    }
  }

  // 2. Intentar OCR.space
  const ocrSpaceKey = process.env.OCR_SPACE_API_KEY || 'hpuser'
  try {
    const text = await ocrWithOcrSpace(buffer, ocrSpaceKey)
    if (text && text.trim().length > 50) return text
    throw new Error('OCR.space devolvió texto vacío')
  } catch (e) {
    throw new Error(
      `No se pudo extraer texto del PDF escaneado. ` +
      `Detalle: ${e instanceof Error ? e.message : String(e)}. ` +
      `Solución: convierte el PDF a texto en ilovepdf.com/ocr-pdf antes de subirlo.`
    )
  }
}

// ── OCR.space ─────────────────────────────────────────────────────────────────

/**
 * OCR.space API
 * Docs: https://ocr.space/ocrapi
 * Free: 25k páginas/mes con clave pública "hpuser"
 * Paid: desde $6/mes — sin límite de páginas ni tamaño
 */
async function ocrWithOcrSpace(buffer: Buffer, apiKey: string): Promise<string> {
  const base64 = buffer.toString('base64')

  // OCR.space acepta form-urlencoded con base64Image
  const params = new URLSearchParams({
    apikey: apiKey,
    base64Image: `data:application/pdf;base64,${base64}`,
    language: 'spa',           // Español
    filetype: 'PDF',
    detectOrientation: 'true', // Corrige páginas rotadas
    scale: 'true',             // Mejora imágenes de baja resolución
    OCREngine: '2',            // Engine 2: mejor para documentos multiidioma
    isTable: 'false',
    isSearchablePdfHideTextLayer: 'false',
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000) // 60s timeout

  let res: Response
  try {
    res = await fetch(OCR_SPACE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OCR.space HTTP ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = (await res.json()) as OcrSpaceResult

  if (data.IsErroredOnProcessing) {
    const msg = data.ErrorMessage?.join('; ') || 'Error desconocido en OCR.space'
    throw new Error(`OCR.space: ${msg}`)
  }

  if (!data.ParsedResults?.length) {
    throw new Error('OCR.space no devolvió resultados')
  }

  // Concatenar texto de todas las páginas procesadas
  const text = data.ParsedResults
    .map(r => r.ParsedText || '')
    .join('\n\n')
    .trim()

  return text
}

// ── Mistral OCR ───────────────────────────────────────────────────────────────

/**
 * Mistral OCR API (mistral-ocr-latest)
 * Docs: https://docs.mistral.ai/capabilities/document/
 * Precio: $1/1,000 páginas · Sin límite de páginas por request
 * Acepta PDF directo como base64 data URI
 */
async function ocrWithMistral(buffer: Buffer, apiKey: string): Promise<string> {
  const base64 = buffer.toString('base64')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000) // 2 min timeout

  let res: Response
  try {
    res = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          document_url: `data:application/pdf;base64,${base64}`,
        },
        include_image_base64: false,
      }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Mistral OCR HTTP ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = (await res.json()) as MistralOcrResult

  if (!data.pages?.length) {
    throw new Error('Mistral OCR no devolvió páginas')
  }

  // Concatenar markdown de todas las páginas (ya viene bien formateado)
  const text = data.pages
    .sort((a, b) => a.index - b.index)
    .map(p => p.markdown || '')
    .join('\n\n')
    .trim()

  return text
}

// ── Detección de PDF escaneado ────────────────────────────────────────────────

/**
 * Determina si un texto extraído por pdf-parse es insuficiente
 * (indica PDF escaneado o con muy poco texto).
 *
 * @param text - Texto extraído por pdf-parse
 * @param minChars - Mínimo de caracteres esperados (default 200)
 */
export function isTextInsufficient(text: string, minChars = 200): boolean {
  if (!text) return true
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length < minChars
}
