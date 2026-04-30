/**
 * POST /api/portal-empleado/chat
 *
 * Chat RAG personal del trabajador. Responde preguntas sobre legislación
 * laboral peruana + datos específicos del trabajador (cuando el contexto
 * se pasa en el payload: sus boletas, su contrato, sus beneficios).
 *
 * Sistema de safety:
 *  - Disclaimer legal en cada respuesta (no reemplaza asesoría)
 *  - No responde preguntas fuera del dominio laboral
 *  - Cita artículos legales cuando sea posible
 *  - Acepta opcional datos del trabajador ya scoped al usuario actual
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { callAI } from '@/lib/ai/provider'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `Eres "COMPLY", asistente legal laboral personal para trabajadores en Perú. Tu función:

1. Responder preguntas sobre derechos laborales peruanos (CTS, gratificaciones, vacaciones, horas extras, jornada, despido, etc.)
2. Citar artículos específicos de leyes peruanas cuando sea relevante (D.Leg. 650 CTS, D.Leg. 713 vacaciones, Ley 27735 gratificaciones, D.S. 007-2002-TR jornada, Ley 27942 hostigamiento, etc.)
3. Ser empático y claro — el usuario es un trabajador, no un abogado
4. Siempre incluir al final: "⚖️ Esta respuesta es informativa y no reemplaza asesoría legal profesional. Si tu caso es complejo, consulta a un abogado laboralista o acude a SUNAFIL (gratuito)."

Reglas estrictas:
- NO inventes artículos o leyes que no conoces
- NO des consejos que puedan ser usados para evadir obligaciones del trabajador
- Si la pregunta NO es sobre derecho laboral peruano, responde amablemente: "Solo puedo ayudarte con temas de derecho laboral peruano. ¿Tienes alguna duda sobre tu contrato, beneficios o derechos?"
- NO respondas preguntas sobre otros países
- Usa un tono amigable pero profesional, en español peruano
- Respuestas concisas (máximo 300 palabras) con estructura clara`

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
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (!body.message || body.message.trim().length < 3) {
    return NextResponse.json({ error: 'message requerido (mínimo 3 caracteres)' }, { status: 400 })
  }
  if (body.message.length > 2000) {
    return NextResponse.json({ error: 'message muy largo (máximo 2000 caracteres)' }, { status: 400 })
  }

  const contextBlock = body.workerContext
    ? `
CONTEXTO DEL TRABAJADOR (usa solo si es relevante a la pregunta):
- Cargo: ${body.workerContext.position || 'N/A'}
- Régimen laboral: ${body.workerContext.regimenLaboral || 'N/A'}
- Tipo de contrato: ${body.workerContext.tipoContrato || 'N/A'}
- Fecha de ingreso: ${body.workerContext.fechaIngreso || 'N/A'}
- Sueldo bruto: ${body.workerContext.sueldoBruto ? `S/${body.workerContext.sueldoBruto}` : 'N/A'}
`
    : ''

  const history = (body.history || []).slice(-6) // últimos 3 turnos
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT + contextBlock },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: body.message },
  ]

  let response = ''
  try {
    response = await callAI(messages, {
      temperature: 0.3,
      maxTokens: 700,
      feature: 'worker-chat',
      orgId: ctx.orgId,
    })
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Error del modelo',
        fallback:
          'Disculpa, no pude procesar tu pregunta en este momento. Si es urgente, consulta a SUNAFIL al 0800-16872 (línea gratuita).',
      },
      { status: 503 }
    )
  }

  return NextResponse.json({
    response,
    disclaimer: 'Respuesta generada por IA. No constituye asesoría legal profesional.',
    orgId: ctx.orgId,
    timestamp: new Date().toISOString(),
  })
})
