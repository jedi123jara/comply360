/**
 * POST /api/workers/prepare-batch-from-pdf
 *
 * Endpoint LIGERO: solo extrae texto, detecta contratos y guarda la sesión.
 * NO llama a la IA — eso lo hace /extract-one-from-batch bajo demanda.
 *
 * Retorna:
 *   { sessionId, fileInfo, contracts: [{index, preview, startPage, endPage, pageCount}] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getAuthContext } from '@/lib/auth'
import {
  extractTextByPage,
  findPageRangeForOffsets,
} from '@/lib/agents/extract-text'
import { splitContracts } from '@/lib/agents/contract-splitter'
import { saveBatchSession } from '@/lib/agents/batch-session-store'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FILE_SIZE = 4.5 * 1024 * 1024
const MAX_CONTRACTS = 100

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

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
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json(
      { error: 'Solo se aceptan archivos PDF.' },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // ── Paso 1: Extraer texto ──────────────────────────────────────────────────
  let pagesData
  try {
    pagesData = await extractTextByPage(buffer)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'desconocido'
    return NextResponse.json({ error: `No se pudo leer el PDF: ${msg}` }, { status: 422 })
  }

  const { fullText, pages, totalPages } = pagesData

  if (!fullText || fullText.trim().length < 100) {
    return NextResponse.json(
      { error: 'El PDF no contiene texto legible. Si es escaneado, conviértelo con OCR.' },
      { status: 422 }
    )
  }

  // ── Paso 2: Detectar contratos ─────────────────────────────────────────────
  const blocks = splitContracts(fullText)

  if (blocks.length > MAX_CONTRACTS) {
    return NextResponse.json(
      { error: `Se detectaron ${blocks.length} contratos. Máximo: ${MAX_CONTRACTS}.` },
      { status: 422 }
    )
  }

  // ── Paso 3: Guardar sesión con textos (sin llamar IA) ──────────────────────
  const sessionId = randomUUID()
  const contracts = blocks.map((block, i) => {
    const blockEnd = block.startOffset + block.text.length
    const { startPage, endPage } = findPageRangeForOffsets(pages, block.startOffset, blockEnd)
    const preview = block.text.slice(0, 140).replace(/\s+/g, ' ').trim()
    return {
      index: i + 1,
      startPage,
      endPage,
      status: 'pending' as const,
      data: undefined,
      error: undefined,
      preview,
    }
  })

  saveBatchSession({
    sessionId,
    orgId: ctx.orgId,
    userId: ctx.userId,
    fileName: file.name,
    fileSize: file.size,
    totalPages,
    pdfBuffer: buffer,
    contracts: contracts.map(c => ({
      ...c,
      status: 'error' as const,
      error: 'Pendiente de extracción',
    })),
    contractTexts: blocks.map(b => b.text),
  })

  return NextResponse.json({
    sessionId,
    fileInfo: {
      name: file.name,
      size: file.size,
      totalPages,
    },
    contracts: contracts.map(c => ({
      index: c.index,
      preview: c.preview,
      startPage: c.startPage,
      endPage: c.endPage,
      pageCount: c.endPage - c.startPage + 1,
    })),
  })
}
