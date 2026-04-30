/**
 * Helper de telemetría de uso de IA.
 *
 * Cada feature que llama al LLM debe registrar su consumo aquí. La función
 * es **fire-and-forget**: si la persistencia falla, la respuesta del LLM
 * NO se pierde — solo perdemos un registro de costo.
 *
 * Uso típico desde un endpoint:
 *
 *     const start = Date.now()
 *     try {
 *       const { content, usage } = await callAIWithUsage(messages, {...})
 *       recordAiUsage({
 *         orgId: ctx.orgId,
 *         userId: ctx.userId,
 *         feature: 'contract-review',
 *         provider: 'openai',
 *         model: 'gpt-4o-mini',
 *         promptTokens: usage.promptTokens,
 *         completionTokens: usage.completionTokens,
 *         latencyMs: Date.now() - start,
 *       })
 *       return content
 *     } catch (err) {
 *       recordAiUsage({ ..., success: false, errorMessage: String(err) })
 *       throw err
 *     }
 */

import { prisma } from '@/lib/prisma'
import { estimateCostUsd } from './pricing'

export interface AiUsageInput {
  orgId?: string | null
  userId?: string | null
  feature: string
  provider: string
  model: string
  promptTokens?: number
  completionTokens?: number
  /** Tokens servidos desde cache de contexto (DeepSeek prompt_cache_hit_tokens). */
  cachedTokens?: number
  /** Tokens de reasoning (DeepSeek-reasoner devuelve `reasoning_tokens`). */
  reasoningTokens?: number
  /** Time-to-first-token en streams (ms). Null si fue no-stream. */
  ttftMs?: number | null
  /** True si el primario falló y la respuesta vino de un fallback. */
  fallbackUsed?: boolean
  /** Score evaluado por el harness, si esta llamada vino de un eval run. */
  evalScore?: number | null
  latencyMs?: number | null
  success?: boolean
  errorMessage?: string | null
}

/**
 * Registra el consumo de una llamada al LLM. Fire-and-forget — no bloquea.
 * Devuelve una promesa por si el caller quiere `await` para tests, pero
 * cualquier error se silencia (con console.error).
 */
export function recordAiUsage(input: AiUsageInput): Promise<void> {
  const promptTokens = Math.max(0, input.promptTokens ?? 0)
  const completionTokens = Math.max(0, input.completionTokens ?? 0)
  const cachedTokens = Math.max(0, input.cachedTokens ?? 0)
  const reasoningTokens = Math.max(0, input.reasoningTokens ?? 0)
  const totalTokens = promptTokens + completionTokens

  const costUsd = estimateCostUsd({
    provider: input.provider,
    model: input.model,
    promptTokens,
    completionTokens,
    cachedTokens,
    reasoningTokens,
  })

  // Fire-and-forget: persist y bump del counter mensual en paralelo
  const orgId = input.orgId ?? null
  const persistUsage = prisma.aiUsage
    .create({
      data: {
        orgId,
        userId: input.userId ?? null,
        feature: input.feature,
        provider: input.provider,
        model: input.model,
        promptTokens,
        completionTokens,
        totalTokens,
        cachedTokens: cachedTokens || null,
        reasoningTokens: reasoningTokens || null,
        ttftMs: input.ttftMs ?? null,
        fallbackUsed: input.fallbackUsed === true,
        evalScore: input.evalScore ?? null,
        costUsd,
        latencyMs: input.latencyMs ?? null,
        success: input.success !== false,
        errorMessage: input.errorMessage ?? null,
      },
    })
    .then(() => undefined)
    .catch((err) => {
      console.error('[ai/usage] persist failed:', err)
    })

  // Bump del counter mensual (solo si hay org y la llamada fue exitosa).
  // Esto permite que checkCapacity sea O(1) en lugar de un aggregate sobre AiUsage.
  if (orgId && input.success !== false) {
    void bumpBudgetCounter({ orgId, totalTokens, costUsd }).catch((err) => {
      console.error('[ai/usage] budget counter bump failed:', err)
    })
  }

  return persistUsage
}

/**
 * Incrementa el contador mensual de la org. Crea el registro si no existe
 * para el mes actual. Idempotente — usa upsert.
 */
async function bumpBudgetCounter(params: {
  orgId: string
  totalTokens: number
  costUsd: number
}): Promise<void> {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  await prisma.aiBudgetCounter.upsert({
    where: { orgId_monthStart: { orgId: params.orgId, monthStart } },
    create: {
      orgId: params.orgId,
      monthStart,
      totalCalls: 1,
      totalTokens: params.totalTokens,
      totalCostUsd: params.costUsd,
      hourlyCalls: 1,
      hourlyResetAt: now,
    },
    update: {
      totalCalls: { increment: 1 },
      totalTokens: { increment: params.totalTokens },
      totalCostUsd: { increment: params.costUsd },
      hourlyCalls: { increment: 1 },
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Budget gating
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Budget mensual estándar en USD según plan.
 * Las orgs en plan FREE pueden usar IA pero limitado; las orgs PRO tienen
 * un techo alto que cubre el 99% de uso normal sin alarmar.
 */
const MONTHLY_BUDGET_BY_PLAN: Record<string, number> = {
  FREE: 1, // 1 USD — solo para que no quemen tokens si entra un bot
  STARTER: 5,
  EMPRESA: 25,
  PRO: 100,
  BUSINESS: 250,    // Cuota IA ampliada — coherente con feature listada en plan
  ENTERPRISE: 500,
}

export function getMonthlyBudgetUsd(plan: string): number {
  return MONTHLY_BUDGET_BY_PLAN[plan.toUpperCase()] ?? 5
}

/**
 * ¿La org puede hacer una llamada IA ahora? Consulta el costo gastado en
 * el mes calendario actual y compara con su budget según plan.
 *
 * Devuelve `{ allowed: true }` o `{ allowed: false, reason, spentUsd, budgetUsd }`.
 *
 * Pensar como **soft cap**: el flow del producto puede mostrar "se acabó tu
 * cuota de IA del mes, upgradéa a PRO" en lugar de un error críptico.
 */
export async function checkAiBudget(params: {
  orgId: string
  plan: string
}): Promise<
  | { allowed: true; spentUsd: number; budgetUsd: number; remainingUsd: number }
  | { allowed: false; reason: 'budget_exceeded'; spentUsd: number; budgetUsd: number }
> {
  const budgetUsd = getMonthlyBudgetUsd(params.plan)
  if (budgetUsd <= 0) {
    return { allowed: false, reason: 'budget_exceeded', spentUsd: 0, budgetUsd }
  }

  // Inicio del mes calendario (zona local del server — para Lima usamos UTC-5
  // pero el corte mensual con UTC también es razonable). Optamos por UTC para
  // simplicidad y consistencia con `createdAt`.
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const agg = await prisma.aiUsage.aggregate({
    where: { orgId: params.orgId, createdAt: { gte: monthStart } },
    _sum: { costUsd: true },
  })
  const spentUsd = Number(agg._sum.costUsd ?? 0)

  if (spentUsd >= budgetUsd) {
    return { allowed: false, reason: 'budget_exceeded', spentUsd, budgetUsd }
  }
  return {
    allowed: true,
    spentUsd,
    budgetUsd,
    remainingUsd: Number((budgetUsd - spentUsd).toFixed(6)),
  }
}
