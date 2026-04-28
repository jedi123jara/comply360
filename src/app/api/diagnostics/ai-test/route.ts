/**
 * POST /api/diagnostics/ai-test
 *
 * Admin-only endpoint para diagnosticar el sistema de IA (DeepSeek por default).
 *
 * Body opcional: { prompt?: string, model?: string }
 *
 * Devuelve un reporte completo:
 *   - hasKey: bool
 *   - keyPrefix: string (primeros 6 chars)
 *   - model: string (qué modelo respondió)
 *   - response: string (texto del modelo)
 *   - usage: { promptTokens, completionTokens, totalTokens }
 *   - estimatedCost: USD (calculado con pricing.ts)
 *   - latencyMs
 *   - error si falla
 *   - suggestion accionable si falla
 *
 * Diseño igual al endpoint /api/diagnostics/email-test:
 * llama directamente a DeepSeek (no pasa por la abstracción provider.ts)
 * para diagnosticar puramente la KEY + modelo, no la abstracción.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { estimateCostUsd } from '@/lib/ai/pricing'

// Tabla local — para mostrar el detalle de promptPer1M/completionPer1M.
// pricing.ts no exporta la tabla cruda (solo la función estimateCostUsd).
// Mantener sincronizado con pricing.ts §deepseek (revisar si subes precios).
const DEEPSEEK_PRICING_DISPLAY: Record<string, { promptPer1M: number; completionPer1M: number }> = {
  'deepseek-chat': { promptPer1M: 0.14, completionPer1M: 0.28 },
  'deepseek-v4': { promptPer1M: 0.14, completionPer1M: 0.28 },
  'deepseek-v4-flash': { promptPer1M: 0.14, completionPer1M: 0.28 },
  'deepseek-reasoner': { promptPer1M: 1.74, completionPer1M: 3.48 },
  'deepseek-v4-pro': { promptPer1M: 1.74, completionPer1M: 3.48 },
}

const DEFAULT_PROMPT = '¿Cuál es la Remuneración Mínima Vital (RMV) en Perú para 2026? Responde en una sola oración.'
const DEFAULT_MODEL = 'deepseek-chat' // alias V4 Flash

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  let body: { prompt?: string; model?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const prompt = body.prompt?.trim() || DEFAULT_PROMPT
  const model = body.model?.trim() || DEFAULT_MODEL

  const apiKey = process.env.DEEPSEEK_API_KEY
  const hasKey = !!apiKey
  const keyPrefix = apiKey ? apiKey.slice(0, 6) + '...' : null

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
    },
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        ...baseReport,
        result: {
          success: false,
          error: 'DEEPSEEK_API_KEY no está configurada en este environment',
        },
        suggestion:
          'Configura DEEPSEEK_API_KEY en Vercel → Settings → Environment Variables → Production. ' +
          'Después haz redeploy. La key la obtienes en https://platform.deepseek.com/api_keys',
      },
      { status: 200 },
    )
  }

  // Llamar a DeepSeek (API compatible con OpenAI)
  const startTime = Date.now()

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Eres un asesor laboral peruano experto en compliance SUNAFIL. Responde en español peruano (tuteo, NO voseo argentino), conciso y preciso.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
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
            error: `DeepSeek API error ${response.status}`,
          },
          deepseekApiError: responseJson,
          latencyMs,
          suggestion: getSuggestionByStatus(response.status, responseText),
        },
        { status: 200 },
      )
    }

    type DeepSeekResponse = {
      id?: string
      model?: string
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    }
    const data = responseJson as DeepSeekResponse

    const responseContent = data.choices?.[0]?.message?.content ?? '(sin respuesta)'
    const usage = data.usage ?? {}
    const promptTokens = usage.prompt_tokens ?? 0
    const completionTokens = usage.completion_tokens ?? 0
    const totalTokens = usage.total_tokens ?? promptTokens + completionTokens

    // Calcular costo aproximado USD usando la abstracción del pricing engine
    const estimatedCost = estimateCostUsd({
      provider: 'deepseek',
      model,
      promptTokens,
      completionTokens,
    })
    const pricing = DEEPSEEK_PRICING_DISPLAY[model] ?? DEEPSEEK_PRICING_DISPLAY['deepseek-chat']

    return NextResponse.json({
      ...baseReport,
      result: {
        success: true,
        httpStatus: response.status,
        modelResponded: data.model ?? model,
        responseId: data.id ?? null,
        finishReason: data.choices?.[0]?.finish_reason ?? null,
        response: responseContent.trim(),
      },
      usage: {
        promptTokens,
        completionTokens,
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
      message: `✓ DeepSeek respondió en ${latencyMs}ms con el modelo ${data.model ?? model}`,
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
            error: 'Timeout — DeepSeek no respondió en 30s',
          },
          latencyMs,
          suggestion: 'DeepSeek está lento o caído. Reintenta en 1 minuto. Si persiste, revisa status.deepseek.com',
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
        suggestion: 'Error de red al llamar DeepSeek. Reintenta en unos minutos.',
      },
      { status: 200 },
    )
  }
})

function getSuggestionByStatus(status: number, body: string): string {
  if (status === 401) {
    return 'API key inválida o revocada (401). Regenera una nueva en https://platform.deepseek.com/api_keys y actualiza DEEPSEEK_API_KEY en Vercel. Después redeploy.'
  }
  if (status === 402) {
    return 'Saldo insuficiente (402). Recarga tu cuenta en https://platform.deepseek.com/billing. DeepSeek requiere prepago — sin saldo, las llamadas fallan.'
  }
  if (status === 403) {
    return 'Rechazado por DeepSeek (403). Tu key puede tener permisos restringidos o tu cuenta requiere verificación. Revisa https://platform.deepseek.com'
  }
  if (status === 429) {
    return 'Rate limit excedido (429). DeepSeek limita por cuenta. Espera 60s o sube de plan.'
  }
  if (status === 503) {
    return 'DeepSeek temporalmente no disponible (503). Reintenta en 1-5 min. Revisa status.deepseek.com'
  }
  if (body.toLowerCase().includes('insufficient') || body.toLowerCase().includes('balance')) {
    return 'Saldo insuficiente. Recarga en https://platform.deepseek.com/billing'
  }
  return `DeepSeek devolvió ${status}. Revisa los logs en https://platform.deepseek.com/usage para detalles.`
}
