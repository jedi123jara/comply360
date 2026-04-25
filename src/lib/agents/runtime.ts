/**
 * Agent Runtime — orquesta la ejecución de un agente por slug.
 * Genera runId, captura errores y normaliza el resultado.
 */

import { randomUUID } from 'crypto'
import { getAgent } from './registry'
import type { AgentInput, AgentResult, AgentRunContext } from './types'

export async function runAgent(
  slug: string,
  input: AgentInput,
  ctx: Omit<AgentRunContext, 'runId'> & { runId?: string }
): Promise<AgentResult> {
  const agent = getAgent(slug)
  if (!agent) {
    throw new Error(`Agente no encontrado: ${slug}`)
  }

  if (!agent.acceptedInputs.includes(input.type)) {
    throw new Error(
      `El agente "${agent.name}" no acepta inputs de tipo "${input.type}". Tipos válidos: ${agent.acceptedInputs.join(', ')}`
    )
  }

  const runId = ctx.runId ?? randomUUID()
  const fullCtx: AgentRunContext = { orgId: ctx.orgId, userId: ctx.userId, runId }

  const start = Date.now()
  try {
    const result = await agent.run(input, fullCtx)

    // Validación opcional del output con schema Zod-compatible.
    // Si el output no calza, NO botamos toda la corrida — degradamos el
    // status a 'partial' y agregamos warning. El user igual ve algo útil
    // y nosotros podemos detectar el drift en métricas.
    if (agent.outputSchema && result.data !== null && result.data !== undefined) {
      const parsed = agent.outputSchema.safeParse(result.data)
      if (!parsed.success) {
        const issueMsg = formatZodLikeError(parsed.error)
        return {
          ...result,
          status: 'partial',
          warnings: [
            ...(result.warnings ?? []),
            `Output del agente no calzó con el schema esperado: ${issueMsg}`,
          ],
        }
      }
    }

    return result
  } catch (e) {
    return {
      agentSlug: slug,
      runId,
      status: 'error',
      confidence: 0,
      data: null,
      summary: `Error ejecutando el agente: ${e instanceof Error ? e.message : 'desconocido'}`,
      warnings: [],
      recommendedActions: [],
      model: 'comply360-legal',
      durationMs: Date.now() - start,
      errors: [e instanceof Error ? e.message : String(e)],
    }
  }
}

/**
 * Convierte el `error` de Zod (o de cualquier validador con .issues / .message)
 * en un string legible. Defensivo — distintas versiones de Zod traen formatos
 * distintos.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatZodLikeError(err: any): string {
  if (!err) return 'sin detalle'
  if (Array.isArray(err.issues) && err.issues.length > 0) {
    return err.issues
      .slice(0, 3)
      .map((i: { path?: unknown[]; message?: string }) => {
        const path = Array.isArray(i.path) ? i.path.join('.') : ''
        return `${path}: ${i.message ?? 'inválido'}`
      })
      .join(' | ')
  }
  if (typeof err.message === 'string') return err.message.slice(0, 200)
  return 'invalid output'
}
