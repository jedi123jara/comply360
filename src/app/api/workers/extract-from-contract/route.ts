import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { callAI, extractJson } from '@/lib/ai/provider'
import { cleanContractText } from '@/lib/agents/text-cleaner'
import { buildExtractionPrompt, SYSTEM_PROMPT } from '@/lib/agents/extraction-prompt'

// ─── Disable body parsing (we'll use formData) ────────────────────────────
export const runtime = 'nodejs'

// ─── Extracted worker data shape ─────────────────────────────────────────
export interface ExtractedWorkerData {
  // Personal
  dni?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  birthDate?: string          // ISO date string YYYY-MM-DD
  gender?: string             // M / F
  nationality?: string
  address?: string
  // Work
  position?: string
  department?: string
  regimenLaboral?: string     // GENERAL, MYPE_MICRO, MYPE_PEQUENA, ...
  tipoContrato?: string       // INDEFINIDO, PLAZO_FIJO, ...
  fechaIngreso?: string       // ISO date string YYYY-MM-DD
  fechaFin?: string           // ISO date string YYYY-MM-DD (plazo fijo)
  sueldoBruto?: number
  jornadaSemanal?: number
  asignacionFamiliar?: boolean
  // Pension
  tipoAporte?: string         // AFP, ONP, SIN_APORTE
  afpNombre?: string
  // Confidence
  confidence: number          // 0-100
  fieldsFound: string[]       // List of field names that were found
  warnings: string[]          // Any ambiguities or missing required fields
}

// ─── Text extraction helpers ──────────────────────────────────────────────

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // pdf-parse v2: getText() → { pages: [{text,num}], text: string, total: number }
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const { PDFParse } = require('pdf-parse') as any
  const result = await new PDFParse({ data: buffer }).getText()
  // Limpiar marcadores de página "-- X of Y --" que v2 inserta
  return (result.text || '').replace(/\n*-- \d+ of \d+ --\n*/g, '\n\n').trim()
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value || ''
}

// ─── Prompt centralizado (importado de extraction-prompt.ts) ─────────────
// Usa buildExtractionPrompt() y SYSTEM_PROMPT importados arriba

// ─── Route handler ────────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    // Validate file type
    const fileName = file.name.toLowerCase()
    const mimeType = file.type.toLowerCase()
    const isPdf = fileName.endsWith('.pdf') || mimeType === 'application/pdf'
    const isDocx = fileName.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    const isDoc = fileName.endsWith('.doc') || mimeType === 'application/msword'

    if (!isPdf && !isDocx && !isDoc) {
      return NextResponse.json(
        { error: 'Formato no soportado. Sube un archivo PDF o DOCX.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'El archivo es muy grande. Máximo 10MB.' },
        { status: 400 }
      )
    }

    // Extract text from file
    const buffer = Buffer.from(await file.arrayBuffer())
    let contractText = ''

    try {
      if (isPdf) {
        contractText = await extractTextFromPdf(buffer)
      } else {
        contractText = await extractTextFromDocx(buffer)
      }
    } catch (parseError) {
      console.error('[ExtractContract] Parse error:', parseError)
      return NextResponse.json(
        { error: 'No se pudo leer el archivo. Asegúrate de que no esté protegido con contraseña.' },
        { status: 422 }
      )
    }

    if (!contractText || contractText.trim().length < 50) {
      return NextResponse.json(
        { error: 'El archivo no contiene texto legible. Puede ser un PDF escaneado (imagen).' },
        { status: 422 }
      )
    }

    // Limpiar texto antes de enviarlo al LLM
    const cleanedText = cleanContractText(contractText)

    // Call AI to extract worker data (prompt centralizado con terminología peruana)
    const prompt = buildExtractionPrompt(cleanedText)

    let aiResponse: string
    try {
      aiResponse = await callAI(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        {
          temperature: 0.1,
          maxTokens: 1500,
          jsonMode: true,
          feature: 'contract-gen',
        }
      )
    } catch (aiError) {
      console.error('[ExtractContract] AI error:', aiError)
      return NextResponse.json(
        { error: 'No se pudo procesar el contrato con IA. Verifica que el servidor de IA esté activo.' },
        { status: 503 }
      )
    }

    // Parse AI response (usa extractJson robusto que maneja think blocks, fences, etc.)
    let extracted: ExtractedWorkerData
    try {
      extracted = extractJson<ExtractedWorkerData>(aiResponse)
    } catch {
      console.error('[ExtractContract] JSON parse error. Raw:', aiResponse.slice(0, 500))
      return NextResponse.json(
        { error: 'La IA no devolvió datos válidos. Intenta con otro archivo.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: extracted,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: isPdf ? 'pdf' : 'docx',
        textLength: contractText.length,
      },
    })
  } catch (error) {
    console.error('[ExtractContract] Unexpected error:', error)
    return NextResponse.json({ error: 'Error inesperado al procesar el archivo' }, { status: 500 })
  }
})
