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
