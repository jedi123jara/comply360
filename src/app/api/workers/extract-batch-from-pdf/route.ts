/**
 * POST /api/workers/extract-batch-from-pdf
 *
 * Recibe un PDF multi-contrato, lo analiza página por página, detecta los
 * bordes de cada contrato, extrae datos del trabajador con IA y devuelve:
 *  - sessionId para que el frontend pueda luego pedir el guardado por contrato
 *  - detected: cantidad de contratos detectados
 *  - workers[]: datos extraídos + rango de páginas (startPage, endPage)
 *
 * El buffer original queda guardado en memoria (batch-session-store) por 60min
 * para que /api/workers/save-from-batch pueda extraer físicamente las páginas
 * del contrato del trabajador aprobado y guardarlas en su legajo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { callAI, extractJson } from '@/lib/ai/provider'
import {
  extractTextByPage,
  findPageRangeForOffsets,
} from '@/lib/agents/extract-text'
import { splitContracts, type ContractBlock } from '@/lib/agents/contract-splitter'
import { saveBatchSession, type BatchContractEntry } from '@/lib/agents/batch-session-store'
import { cleanContractText } from '@/lib/agents/text-cleaner'
import {
  buildExtractionPrompt,
  buildBatchExtractionPrompt,
  SYSTEM_PROMPT,
} from '@/lib/agents/extraction-prompt'
import type { ExtractedWorkerData } from '../extract-from-contract/route'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 min

const MAX_FILE_SIZE = 4.5 * 1024 * 1024 // 4.5 MB (límite plan gratuito Vercel)
const MAX_CONTRACTS = 100 // más permisivo para legajos enterprise
const CONCURRENCY = 1 // secuencial para respetar rate limits de Groq/DeepSeek
const MAX_BATCH_CHARS = 50_000 // máximo de texto por batch LLM
const MAX_SINGLE_CONTRACT_FOR_BATCH = 6_000 // contratos más grandes van solos

// ── Extracción individual (1 contrato → 1 llamada LLM) ──────────────────────

async function extractOne(
  text: string,
  index: number,
  total: number
): Promise<{ status: 'success' | 'error'; data?: ExtractedWorkerData; error?: string }> {
  try {
    const cleaned = cleanContractText(text)
    const ai = await callAI(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildExtractionPrompt(cleaned, { index, total }) },
      ],
      { temperature: 0.1, maxTokens: 1500, jsonMode: true, feature: 'pdf-extract' }
    )
    const data = extractJson<ExtractedWorkerData>(ai)
    return { status: 'success', data }
  } catch (e) {
    return {
      status: 'error',
      error: e instanceof Error ? e.message : 'desconocido',
    }
  }
}

// ── Extracción batch (múltiples contratos → 1 llamada LLM) ──────────────────

function groupContractsForBatch(blocks: ContractBlock[]): ContractBlock[][] {
  const groups: ContractBlock[][] = []
  let currentGroup: ContractBlock[] = []
  let currentChars = 0

  for (const block of blocks) {
    const len = block.text.length
    // Contratos muy grandes van solos
    if (len > MAX_SINGLE_CONTRACT_FOR_BATCH) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
        currentGroup = []
        currentChars = 0
      }
      groups.push([block])
      continue
    }
    // Si agregar este contrato excede el límite, cerrar grupo
    if (currentChars + len > MAX_BATCH_CHARS && currentGroup.length > 0) {
      groups.push(currentGroup)
      currentGroup = []
      currentChars = 0
    }
    currentGroup.push(block)
    currentChars += len
  }
  if (currentGroup.length > 0) groups.push(currentGroup)

  return groups
}

async function extractBatch(
  blocks: ContractBlock[],
  totalContracts: number
): Promise<Array<{ status: 'success' | 'error'; data?: ExtractedWorkerData; error?: string }>> {
  // Si solo hay 1 contrato, usar extracción individual
  if (blocks.length === 1) {
    const result = await extractOne(blocks[0].text, blocks[0].index, totalContracts)
    return [result]
  }

  try {
    const contracts = blocks.map(b => ({
      text: cleanContractText(b.text),
      index: b.index,
    }))
    const ai = await callAI(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildBatchExtractionPrompt(contracts, totalContracts) },
      ],
      { temperature: 0.1, maxTokens: 1500 * blocks.length, jsonMode: true, feature: 'pdf-extract' }
    )
    const parsed = extractJson<ExtractedWorkerData[]>(ai)

    // Validar que sea un array con el número correcto de elementos
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        status: 'success' as const,
        data: item,
      }))
    }

    // Si el LLM devolvió un solo objeto, envolverlo
    if (typeof parsed === 'object' && parsed !== null) {
      return [{ status: 'success', data: parsed as unknown as ExtractedWorkerData }]
    }

    throw new Error('Respuesta batch no es un array válido')
  } catch {
    // Fallback: extraer individualmente si el batch falla
    console.warn('[ExtractBatch] Batch LLM falló, cayendo a extracción individual...')
    const results = await Promise.all(
      blocks.map(b => extractOne(b.text, b.index, totalContracts))
    )
    return results
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

export const POST = withPlanGate('ia_contratos', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo excede ${MAX_FILE_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      )
    }

    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf')) {
      return NextResponse.json(
        {
          error:
            'Formato no soportado para importación batch. Usa PDF. Para un solo contrato DOCX usa el flujo individual.',
        },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // 1. Extraer texto página por página con mapeo de offsets
    // Si el PDF es escaneado, extractTextByPage hace OCR automático (OCR.space / Mistral)
    let pagesData
    try {
      pagesData = await extractTextByPage(buffer)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'desconocido'
      // Distinguir error de OCR (ya intentó) vs error de lectura del PDF
      const esErrorOcr = msg.toLowerCase().includes('ocr') || msg.toLowerCase().includes('escaneado')
      return NextResponse.json(
        {
          error: esErrorOcr
            ? msg  // Mensaje detallado del OCR helper con sugerencia de iLovePDF
            : `No se pudo leer el PDF: ${msg}. Verifica que el archivo no esté dañado o protegido con contraseña.`,
        },
        { status: 422 }
      )
    }

    const { fullText, pages, totalPages } = pagesData
    if (!fullText || fullText.trim().length < 100) {
      return NextResponse.json(
        {
          error:
            'El PDF no contiene texto legible tras el análisis. ' +
            'Si es un PDF escaneado de baja calidad, conviértelo primero en ilovepdf.com/ocr-pdf.',
        },
        { status: 422 }
      )
    }

    // 2. Split en bloques con offsets (splitter hace regex sobre fullText)
    const blocks = splitContracts(fullText)
    if (blocks.length > MAX_CONTRACTS) {
      return NextResponse.json(
        {
          error: `Se detectaron ${blocks.length} contratos. Máximo permitido: ${MAX_CONTRACTS}. Divide el archivo.`,
        },
        { status: 400 }
      )
    }

    // 3. Agrupar contratos en batches y extraer datos con IA
    // En vez de 1 llamada LLM por contrato, agrupamos contratos pequeños
    // para enviar 3-5 juntos → reduce tiempo de 5min a <30s
    const indexedBlocks = blocks.map((b, i) => ({ ...b, index: i + 1 }))
    const groups = groupContractsForBatch(indexedBlocks)

    console.log(`[ExtractBatch] ${blocks.length} contratos → ${groups.length} grupos LLM`)

    // Ejecutar grupos en paralelo (máx CONCURRENCY simultáneos)
    const groupResults = await runWithConcurrency(groups, CONCURRENCY, (group) =>
      extractBatch(group, blocks.length)
    )

    // Aplanar resultados manteniendo el orden original
    const extractionResults: Array<{ status: 'success' | 'error'; data?: ExtractedWorkerData; error?: string }> = []
    let groupIdx = 0
    for (const group of groups) {
      const results = groupResults[groupIdx++]
      for (let j = 0; j < group.length; j++) {
        extractionResults[group[j].index - 1] = results[j] ?? { status: 'error', error: 'Sin resultado' }
      }
    }

    const contracts: BatchContractEntry[] = blocks.map((block, i) => {
      const blockEnd = block.startOffset + block.text.length
      const { startPage, endPage } = findPageRangeForOffsets(
        pages,
        block.startOffset,
        blockEnd
      )
      const preview = block.text.slice(0, 140).replace(/\s+/g, ' ').trim()
      const result = extractionResults[i]
      return {
        index: i + 1,
        startPage,
        endPage,
        status: result.status,
        data: result.data,
        error: result.error,
        preview,
      }
    })

    // 4. Guardar la sesión en memoria con el buffer original
    const sessionId = randomUUID()
    saveBatchSession({
      sessionId,
      orgId: ctx.orgId,
      userId: ctx.userId,
      fileName: file.name,
      fileSize: file.size,
      totalPages,
      pdfBuffer: buffer,
      contracts,
    })

    const successCount = contracts.filter(c => c.status === 'success').length
    const errorCount = contracts.filter(c => c.status === 'error').length

    return NextResponse.json({
      success: true,
      sessionId,
      fileInfo: {
        name: file.name,
        size: file.size,
        totalPages,
      },
      detected: blocks.length,
      successCount,
      errorCount,
      workers: contracts.map(c => ({
        index: c.index,
        status: c.status,
        data: c.data,
        error: c.error,
        preview: c.preview,
        startPage: c.startPage,
        endPage: c.endPage,
        pageCount: c.endPage - c.startPage + 1,
      })),
    })
  } catch (e) {
    console.error('[ExtractBatch] error', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error inesperado' },
      { status: 500 }
    )
  }
})
