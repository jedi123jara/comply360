/**
 * POST /api/diagnostics/anthropic-test
 *
 * Admin-only endpoint para diagnosticar la integración con Anthropic Claude.
 *
 * Body opcional: { prompt?: string, model?: string, useRag?: boolean }
 *
 * Devuelve un reporte completo:
 *   - hasKey: bool
 *   - keyPrefix: primeros 6 chars
 *   - modelRequested vs modelResponded
 *   - response: texto del modelo
 *   - usage: { inputTokens, outputTokens }
 *   - estimatedCost: USD
 *   - latencyMs
 *   - suggestion accionable si falla
 *
 * Diseño espejo al de /api/diagnostics/ai-test pero para Anthropic.
 * Usa la API directamente (no la abstracción provider.ts) para diagnosticar
 * pura conexión Key + modelo, no la abstracción.
 *
 * Auth: ADMIN+ (founder bypass aplica via withRole).
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { estimateCostUsd } from '@/lib/ai/pricing'
import { retrieveRelevantLaw, formatRetrievedContext } from '@/lib/ai/rag/retriever'

const DEFAULT_PROMPT =
  'Genera un párrafo introductorio para un contrato de trabajo a plazo indeterminado bajo el régimen general (D.Leg. 728), para Juan Pérez, salario S/ 2,500, jornada nocturna en construcción civil. Incluye el sobre-tasa nocturna correcta. Sé conciso (máximo 100 palabras).'
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

const ANTHROPIC_PRICING_DISPLAY: Record<string, { promptPer1M: number; completionPer1M: number }> = {
  'claude-sonnet-4-20250514': { promptPer1M: 3, completionPer1M: 15 },
  'claude-4-sonnet': { promptPer1M: 3, completionPer1M: 15 },
  'claude-opus-4-20250514': { promptPer1M: 15, completionPer1M: 75 },
  'claude-4-opus': { promptPer1M: 15, completionPer1M: 75 },
  'claude-haiku-4-20250514': { promptPer1M: 0.8, completionPer1M: 4 },
  'claude-4-haiku': { promptPer1M: 0.8, completionPer1M: 4 },
}

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  let body: { prompt?: string; model?: string; useRag?: boolean }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const prompt = body.prompt?.trim() || DEFAULT_PROMPT
  const model = body.model?.trim() || DEFAULT_MODEL
  const useRag = body.useRag !== false // default true

  const apiKey = process.env.ANTHROPIC_API_KEY
  const hasKey = !!apiKey
  const keyPrefix = apiKey ? apiKey.slice(0, 14) + '...' : null

  // RAG opcional — inyecta corpus laboral peruano para que Claude tenga
  // los datos correctos al generar contratos / diagnósticos.
  let ragChunks: ReturnType<typeof retrieveRelevantLaw> = []
  let ragContext = ''
  if (useRag) {
    try {
      ragChunks = retrieveRelevantLaw(prompt, 5, 0.05)
      if (ragChunks.length > 0) {
        ragContext = formatRetrievedContext(ragChunks)
      }
    } catch (ragErr) {
      console.error('[anthropic-test] RAG retrieval failed (non-fatal):', ragErr)
    }
  }

  const baseReport = {
    diagnostics: {
      hasKey,
      keyPrefix,
      modelRequested: model,
      environment: {
        NODE_ENV: process.env.NODE_ENV ?? 'unknown',
      },
      timestamp: new Date().toISOString(),
      requestedBy: ctx.email ?? 'admin',
      ragEnabled: useRag,
      ragChunksFound: ragChunks.length,
      ragChunkTitles: ragChunks.map((r) => ({
        id: r.chunk.id,
        titulo: r.chunk.titulo,
        score: Number(r.score.toFixed(3)),
      })),
    },
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        ...baseReport,
        result: {
          success: false,
          error: 'ANTHROPIC_API_KEY no está configurada en este environment',
        },
        suggestion:
          'Configura ANTHROPIC_API_KEY en Vercel → Settings → Environment Variables → Production. ' +
          'La key la obtienes en https://console.anthropic.com/settings/keys (formato sk-ant-api03-...). Después haz redeploy.',
      },
      { status: 200 },
    )
  }

  // System prompt + user message (Anthropic API es distinta a OpenAI)
  const systemPrompt =
    'Eres un asesor laboral peruano experto en compliance SUNAFIL y redacción legal. ' +
    'Responde en español peruano (tuteo, NO voseo argentino), preciso y profesional.' +
    (ragContext
      ? '\n\n=== CORPUS LEGAL PERUANO ACTUALIZADO ===\n' +
        'Usa OBLIGATORIAMENTE estos datos como fuente de verdad. Cita los valores exactos:\n\n' +
        ragContext +
        '\n\n=== FIN CORPUS ===\n\nSi el corpus tiene la respuesta, úsala. Si no, indica claramente que no tienes la información actualizada.'
      : '')

  const startTime = Date.now()

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(45000), // 45s — Claude puede tardar más que DeepSeek
    })

    const latencyMs = Date.now() - startTime
    const responseText = await response.text()
    let responseJson: unknown
    try {
      responseJson = JSON.parse(responseText)
    } catch {
      responseJson = responseText
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ...baseReport,
          result: {
            success: false,
            httpStatus: response.status,
            error: `Anthropic API error ${response.status}`,
          },
          anthropicApiError: responseJson,
          latencyMs,
          suggestion: getSuggestionByStatus(response.status, responseText),
        },
        { status: 200 },
      )
    }

    type AnthropicResponse = {
      id?: string
      model?: string
      content?: Array<{ type: string; text?: string }>
      stop_reason?: string
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    const data = responseJson as AnthropicResponse

    // Anthropic devuelve content como array — concatenar todos los text blocks
    const responseContent =
      data.content?.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n') ?? '(sin respuesta)'
    const inputTokens = data.usage?.input_tokens ?? 0
    const outputTokens = data.usage?.output_tokens ?? 0
    const totalTokens = inputTokens + outputTokens

    const estimatedCost = estimateCostUsd({
      provider: 'anthropic',
      model,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
    })
    const pricing = ANTHROPIC_PRICING_DISPLAY[model] ?? ANTHROPIC_PRICING_DISPLAY['claude-sonnet-4-20250514']

    return NextResponse.json({
      ...baseReport,
      result: {
        success: true,
        httpStatus: response.status,
        modelResponded: data.model ?? model,
        responseId: data.id ?? null,
        stopReason: data.stop_reason ?? null,
        response: responseContent.trim(),
      },
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
      },
      pricing: pricing
        ? {
            promptPer1M: pricing.promptPer1M,
            completionPer1M: pricing.completionPer1M,
            estimatedCostUsd: estimatedCost.toFixed(6),
            costPer1000Requests: (estimatedCost * 1000).toFixed(2),
          }
        : null,
      latencyMs,
      message: `✓ Anthropic Claude respondió en ${latencyMs}ms con el modelo ${data.model ?? model}`,
    })
  } catch (err) {
    const latencyMs = Date.now() - startTime
    const errMsg = err instanceof Error ? err.message : String(err)

    if (errMsg.includes('timeout') || errMsg.includes('aborted')) {
      return NextResponse.json(
        {
          ...baseReport,
          result: {
            success: false,
            error: 'Timeout — Anthropic no respondió en 45s',
          },
          latencyMs,
          suggestion: 'Anthropic está lento o caído. Reintenta en 1 minuto. Si persiste, revisa https://status.anthropic.com',
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        ...baseReport,
        result: {
          success: false,
          error: errMsg,
        },
        latencyMs,
        suggestion: 'Error de red al llamar Anthropic. Reintenta en unos minutos.',
      },
      { status: 200 },
    )
  }
})

function getSuggestionByStatus(status: number, body: string): string {
  if (status === 401) {
    return 'API key inválida o revocada (401). Regenera una nueva en https://console.anthropic.com/settings/keys y actualiza ANTHROPIC_API_KEY en Vercel. Después redeploy.'
  }
  if (status === 402 || body.toLowerCase().includes('credit') || body.toLowerCase().includes('balance')) {
    return 'Saldo o crédito agotado. Anthropic da crédito de evaluación inicial pero al agotarse necesitas cargar fondos en https://console.anthropic.com/settings/billing'
  }
  if (status === 403) {
    return 'Rechazado por Anthropic (403). Tu cuenta puede requerir verificación o tu key tiene permisos restringidos. Revisa https://console.anthropic.com'
  }
  if (status === 429) {
    return 'Rate limit excedido (429). Anthropic limita por cuenta y modelo. Espera 60s o reduce el ritmo.'
  }
  if (status === 503) {
    return 'Anthropic temporalmente no disponible (503). Reintenta en 1-5 min. Revisa https://status.anthropic.com'
  }
  if (status === 400 && body.toLowerCase().includes('model')) {
    return 'Modelo solicitado no existe o no está disponible para tu cuenta. Revisa el ID del modelo (ej. claude-sonnet-4-20250514).'
  }
  return `Anthropic devolvió ${status}. Revisa los logs en https://console.anthropic.com/dashboard para detalles.`
}
