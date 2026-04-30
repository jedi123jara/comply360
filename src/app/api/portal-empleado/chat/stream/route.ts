/**
 * POST /api/portal-empleado/chat/stream — SSE streaming del chat del trabajador.
 *
 * Versión streaming del endpoint POST block en /api/portal-empleado/chat.
 * Misma lógica de auth, system prompt y context, pero emite tokens conforme
 * llegan del LLM (TTFT < 2s p95 vs 5-10s del POST block).
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { callAIStream } from '@/lib/ai/provider'
import { recordAiUsage } from '@/lib/ai/usage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `Eres "COMPLY", asistente legal laboral personal para trabajadores en Perú. Tu función:

1. Responder preguntas sobre derechos laborales peruanos (CTS, gratificaciones, vacaciones, horas extras, jornada, despido, etc.)
2. Citar artículos específicos de leyes peruanas cuando sea relevante (D.Leg. 650 CTS, D.Leg. 713 vacaciones, Ley 27735 gratificaciones, D.S. 007-2002-TR jornada, Ley 27942 hostigamiento, etc.)
3. Ser empático y claro — el usuario es un trabajador, no un abogado
4. Siempre incluir al final: "⚖️ Esta respuesta es informativa y no reemplaza asesoría legal profesional. Si tu caso es complejo, consulta a un abogado laboralista o acude a SUNAFIL (gratuito)."

Reglas estrictas:
- NO inventes artículos o leyes que no conoces
- NO des consejos que puedan ser usados para evadir obligaciones del trabajador
- Si la pregunta NO es sobre derecho laboral peruano, responde: "Solo puedo ayudarte con temas de derecho laboral peruano."
- NO respondas preguntas sobre otros países
- Tono amigable, español peruano, máximo 300 palabras`

function sseFormat(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: {
    message?: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
    workerContext?: {
      fechaIngreso?: string
      sueldoBruto?: number
      regimenLaboral?: string
      tipoContrato?: string
      position?: string
    }
  }
  try {
    body = await req.json()
  } catch {
    return new NextResponse(sseFormat('error', { error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }
  if (!body.message || body.message.trim().length < 3) {
    return new NextResponse(sseFormat('error', { error: 'message requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }
  if (body.message.length > 2000) {
    return new NextResponse(sseFormat('error', { error: 'message muy largo' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  const contextBlock = body.workerContext
    ? `
CONTEXTO DEL TRABAJADOR (usa solo si es relevante):
- Cargo: ${body.workerContext.position || 'N/A'}
- Régimen laboral: ${body.workerContext.regimenLaboral || 'N/A'}
- Tipo de contrato: ${body.workerContext.tipoContrato || 'N/A'}
- Fecha de ingreso: ${body.workerContext.fechaIngreso || 'N/A'}
- Sueldo bruto: ${body.workerContext.sueldoBruto ? `S/${body.workerContext.sueldoBruto}` : 'N/A'}
`
    : ''

  const history = (body.history || []).slice(-6)
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT + contextBlock },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: body.message },
  ]

  const encoder = new TextEncoder()
  const abortController = new AbortController()

  const stream = new ReadableStream({
    async start(controller) {
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch { /* closed */ }
      }, 15000)

      let firstChunkAt: number | null = null

      try {
        for await (const chunk of callAIStream(messages, {
          temperature: 0.3,
          maxTokens: 700,
          feature: 'worker-chat',
          signal: abortController.signal,
        })) {
          if (chunk.delta) {
            if (firstChunkAt === null) firstChunkAt = Date.now()
            controller.enqueue(encoder.encode(sseFormat('delta', { delta: chunk.delta })))
          }
          if (chunk.done && chunk.usage) {
            const ttftMs = firstChunkAt && (chunk.usage.latencyMs - (Date.now() - firstChunkAt))
            void recordAiUsage({
              orgId: ctx.orgId,
              userId: ctx.userId,
              feature: 'worker-chat',
              provider: chunk.usage.provider,
              model: chunk.usage.model,
              promptTokens: chunk.usage.promptTokens,
              completionTokens: chunk.usage.completionTokens,
              cachedTokens: chunk.usage.cachedTokens,
              reasoningTokens: chunk.usage.reasoningTokens,
              ttftMs: typeof ttftMs === 'number' ? ttftMs : null,
              latencyMs: chunk.usage.latencyMs,
            })
            controller.enqueue(
              encoder.encode(
                sseFormat('done', {
                  usage: {
                    provider: chunk.usage.provider,
                    model: chunk.usage.model,
                    totalTokens: chunk.usage.totalTokens,
                    cachedTokens: chunk.usage.cachedTokens,
                    latencyMs: chunk.usage.latencyMs,
                  },
                  disclaimer: 'Respuesta generada por IA. No constituye asesoría legal profesional.',
                }),
              ),
            )
          }
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            sseFormat('error', {
              error: e instanceof Error ? e.message : 'desconocido',
              fallback:
                'Si es urgente, consulta a SUNAFIL al 0800-16872 (línea gratuita).',
            }),
          ),
        )
      } finally {
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch { /* closed */ }
      }
    },
    cancel() {
      abortController.abort()
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})
