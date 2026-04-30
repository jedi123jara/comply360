/**
 * POST /api/workers/extract-batch-from-pdf-stream
 *
 * Versión SSE (Server-Sent Events) del extractor batch de PDFs.
 * En vez de esperar a que todos los contratos se procesen, emite eventos
 * de progreso en tiempo real conforme se detectan y extraen datos.
 *
 * Eventos emitidos:
 *   progress  → { step, message, detail? }
 *   contract  → { index, status, data?, error?, preview, startPage, endPage, pageCount }
 *   complete  → { sessionId, fileInfo, detected, successCount, errorCount }
 *   error     → { message }
 */

import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { getAuthContext } from '@/lib/auth'
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

const MAX_FILE_SIZE = 4.5 * 1024 * 1024
const MAX_CONTRACTS = 100
const MAX_BATCH_CHARS = 50_000
const MAX_SINGLE_CONTRACT_FOR_BATCH = 6_000

// ── Helpers ────────────────────────────────────────────────────────────────────

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

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

function groupContractsForBatch(blocks: (ContractBlock & { index: number })[]): (ContractBlock & { index: number })[][] {
  const groups: (ContractBlock & { index: number })[][] = []
  let currentGroup: (ContractBlock & { index: number })[] = []
  let currentChars = 0

  for (const block of blocks) {
    const len = block.text.length
    if (len > MAX_SINGLE_CONTRACT_FOR_BATCH) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
        currentGroup = []
        currentChars = 0
      }
      groups.push([block])
      continue
    }
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
  blocks: (ContractBlock & { index: number })[],
  totalContracts: number
): Promise<Array<{ blockIndex: number; status: 'success' | 'error'; data?: ExtractedWorkerData; error?: string }>> {
  if (blocks.length === 1) {
    const result = await extractOne(blocks[0].text, blocks[0].index, totalContracts)
    return [{ blockIndex: blocks[0].index, ...result }]
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

    if (Array.isArray(parsed)) {
      return parsed.map((item, j) => ({
        blockIndex: blocks[j]?.index ?? j + 1,
        status: 'success' as const,
        data: item,
      }))
    }

    if (typeof parsed === 'object' && parsed !== null) {
      return [{ blockIndex: blocks[0].index, status: 'success', data: parsed as unknown as ExtractedWorkerData }]
    }

    throw new Error('Respuesta batch no es un array válido')
  } catch {
    // Fallback: extraer individualmente
    const results = await Promise.all(
      blocks.map(async b => {
        const r = await extractOne(b.text, b.index, totalContracts)
        return { blockIndex: b.index, ...r }
      })
    )
    return results
  }
}

// ── Route Handler (SSE) ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth manual (no usamos withAuth porque necesitamos controlar el stream)
  let ctx
  try {
    ctx = await getAuthContext()
  } catch {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!ctx) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Leer el form data
  let file: File | null
  try {
    const form = await req.formData()
    file = form.get('file') as File | null
  } catch {
    return new Response(JSON.stringify({ error: 'No se pudo leer el formulario' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!file) {
    return new Response(JSON.stringify({ error: 'No se recibió archivo' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (file.size > MAX_FILE_SIZE) {
    return new Response(
      JSON.stringify({ error: `El archivo excede ${MAX_FILE_SIZE / 1024 / 1024} MB` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return new Response(
      JSON.stringify({ error: 'Solo se aceptan archivos PDF para importación batch.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = file.name
  const fileSize = file.size

  // Crear el stream SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(event, data)))
        } catch {
          // Stream cerrado por el cliente
        }
      }

      try {
        // ── Paso 1: Extraer texto ────────────────────────────────────────
        send('progress', {
          step: 'extracting',
          message: 'Extrayendo texto del PDF...',
        })

        let pagesData
        try {
          pagesData = await extractTextByPage(buffer)
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'desconocido'
          const esErrorOcr = msg.toLowerCase().includes('ocr') || msg.toLowerCase().includes('escaneado')
          send('error', {
            message: esErrorOcr
              ? msg
              : `No se pudo leer el PDF: ${msg}`,
          })
          controller.close()
          return
        }

        const { fullText, pages, totalPages } = pagesData

        send('progress', {
          step: 'text-extracted',
          message: `Texto extraído: ${totalPages} páginas`,
          detail: { totalPages, textLength: fullText.length },
        })

        if (!fullText || fullText.trim().length < 100) {
          send('error', {
            message: 'El PDF no contiene texto legible. Si es un PDF escaneado de baja calidad, conviértelo en ilovepdf.com/ocr-pdf.',
          })
          controller.close()
          return
        }

        // ── Paso 2: Detectar contratos ───────────────────────────────────
        send('progress', {
          step: 'splitting',
          message: 'Detectando contratos...',
        })

        const blocks = splitContracts(fullText)

        if (blocks.length > MAX_CONTRACTS) {
          send('error', {
            message: `Se detectaron ${blocks.length} contratos. Máximo: ${MAX_CONTRACTS}. Divide el archivo.`,
          })
          controller.close()
          return
        }

        send('progress', {
          step: 'contracts-detected',
          message: `${blocks.length} contrato${blocks.length !== 1 ? 's' : ''} detectado${blocks.length !== 1 ? 's' : ''}`,
          detail: { detected: blocks.length },
        })

        // ── Paso 3: Extraer datos con IA ─────────────────────────────────
        const indexedBlocks = blocks.map((b, i) => ({ ...b, index: i + 1 }))
        const groups = groupContractsForBatch(indexedBlocks)

        send('progress', {
          step: 'ai-extracting',
          message: `Extrayendo datos con IA... ${groups.length} grupo${groups.length !== 1 ? 's' : ''} de procesamiento`,
          detail: { groups: groups.length, contracts: blocks.length },
        })

        // Procesar cada grupo y emitir resultados conforme llegan
        const allContracts: BatchContractEntry[] = blocks.map((block, i) => {
          const blockEnd = block.startOffset + block.text.length
          const { startPage, endPage } = findPageRangeForOffsets(pages, block.startOffset, blockEnd)
          const preview = block.text.slice(0, 140).replace(/\s+/g, ' ').trim()
          return {
            index: i + 1,
            startPage,
            endPage,
            status: 'error' as const,
            data: undefined,
            error: 'Pendiente',
            preview,
          }
        })

        let successCount = 0
        let errorCount = 0
        let processedCount = 0

        // Procesar grupos secuencialmente (1 a la vez) para respetar rate limits de Groq
        const CONCURRENCY = 1
        const groupQueue = [...groups]
        const activePromises: Promise<void>[] = []

        const processGroup = async (group: (ContractBlock & { index: number })[]) => {
          const results = await extractBatch(group, blocks.length)

          for (let j = 0; j < results.length; j++) {
            const result = results[j]
            const contractIdx = result.blockIndex - 1
            const contract = allContracts[contractIdx]

            if (contract) {
              contract.status = result.status
              contract.data = result.data
              contract.error = result.error

              processedCount++
              if (result.status === 'success') successCount++
              else errorCount++

              // Emitir evento de contrato procesado
              send('contract', {
                index: contract.index,
                status: result.status,
                data: result.data,
                error: result.error,
                preview: contract.preview,
                startPage: contract.startPage,
                endPage: contract.endPage,
                pageCount: contract.endPage - contract.startPage + 1,
                progress: {
                  processed: processedCount,
                  total: blocks.length,
                  percent: Math.round((processedCount / blocks.length) * 100),
                },
              })
            }
          }
        }

        // Worker pool con concurrencia
        const runWorkers = async () => {
          const workers = Array.from({ length: Math.min(CONCURRENCY, groupQueue.length) }, async () => {
            while (true) {
              const group = groupQueue.shift()
              if (!group) return
              await processGroup(group)
            }
          })
          await Promise.all(workers)
        }

        await runWorkers()
        void activePromises // suppress unused

        // ── Paso 4: Guardar sesión ───────────────────────────────────────
        const sessionId = randomUUID()
        saveBatchSession({
          sessionId,
          orgId: ctx.orgId,
          userId: ctx.userId,
          fileName,
          fileSize,
          totalPages,
          pdfBuffer: buffer,
          contracts: allContracts,
        })

        // ── Paso 5: Emitir evento completo ───────────────────────────────
        send('complete', {
          sessionId,
          fileInfo: {
            name: fileName,
            size: fileSize,
            totalPages,
          },
          detected: blocks.length,
          successCount,
          errorCount,
        })

      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error inesperado'
        try {
          controller.enqueue(encoder.encode(sseEvent('error', { message: msg })))
        } catch {
          // Stream ya cerrado
        }
      } finally {
        try {
          controller.close()
        } catch {
          // Ya cerrado
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Desactiva buffering en nginx/Vercel
    },
  })
}
