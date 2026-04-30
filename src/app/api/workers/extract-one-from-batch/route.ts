/**
 * POST /api/workers/extract-one-from-batch
 *
 * Extrae datos con IA de UN solo contrato de una sesión batch existente.
 * Se llama bajo demanda: cuando el usuario llega a ese contrato en el wizard.
 *
 * Body: { sessionId: string, contractIndex: number }
 * Retorna: { status, data?, error? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { callAI, extractJson } from '@/lib/ai/provider'
import { getBatchSession, updateContractEntry } from '@/lib/agents/batch-session-store'
import { cleanContractText } from '@/lib/agents/text-cleaner'
import { buildExtractionPrompt, SYSTEM_PROMPT } from '@/lib/agents/extraction-prompt'
import type { ExtractedWorkerData } from '../extract-from-contract/route'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { sessionId, contractIndex } = body as { sessionId: string; contractIndex: number }

  if (!sessionId || contractIndex == null) {
    return NextResponse.json(
      { error: 'sessionId y contractIndex son requeridos' },
      { status: 400 }
    )
  }

  // ── Recuperar sesión ───────────────────────────────────────────────────────
  const session = getBatchSession(sessionId)
  if (!session) {
    return NextResponse.json(
      { error: 'Sesión expirada. Sube el PDF nuevamente.' },
      { status: 410 }
    )
  }

  if (session.orgId !== ctx.orgId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // ── Verificar si ya fue extraído ───────────────────────────────────────────
  const entry = session.contracts.find(c => c.index === contractIndex)
  if (!entry) {
    return NextResponse.json(
      { error: `Contrato ${contractIndex} no existe en esta sesión` },
      { status: 404 }
    )
  }

  // Si ya se extrajo exitosamente, devolver los datos cacheados
  if (entry.status === 'success' && entry.data) {
    return NextResponse.json({
      status: 'success',
      data: entry.data,
      cached: true,
    })
  }

  // ── Obtener texto del contrato ─────────────────────────────────────────────
  const texts = session.contractTexts
  if (!texts || !texts[contractIndex - 1]) {
    return NextResponse.json(
      { error: 'Textos de contratos no disponibles. Sube el PDF nuevamente.' },
      { status: 410 }
    )
  }

  const rawText = texts[contractIndex - 1]
  const totalContracts = session.contracts.length

  // ── Llamar a la IA ─────────────────────────────────────────────────────────
  try {
    const cleaned = cleanContractText(rawText)
    const aiResponse = await callAI(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildExtractionPrompt(cleaned, { index: contractIndex, total: totalContracts }) },
      ],
      { temperature: 0.1, maxTokens: 1500, jsonMode: true, feature: 'pdf-extract' }
    )

    const data = extractJson<ExtractedWorkerData>(aiResponse)

    // Actualizar la sesión con los datos extraídos
    updateContractEntry(sessionId, contractIndex, {
      status: 'success',
      data,
      error: undefined,
    })

    return NextResponse.json({ status: 'success', data })
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Error desconocido'

    updateContractEntry(sessionId, contractIndex, {
      status: 'error',
      error: errorMsg,
    })

    return NextResponse.json({ status: 'error', error: errorMsg })
  }
}
