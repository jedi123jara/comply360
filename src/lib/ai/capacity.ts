/**
 * Capacity guards — rate limit + budget enforcement per-org.
 *
 * Cada llamada IA pasa por checkCapacity ANTES de enviarse al provider.
 * Si el caller intenta exceder caps, se bloquea con un mensaje accionable.
 *
 * Tipos de cap:
 *   1. Mensual USD: cap por plan (FREE=$1, EMPRESA=$25, PRO=$100, etc.)
 *   2. Por hora calls: throttle anti-abuso (default 1000/hora por org)
 *
 * Usa la tabla AiBudgetCounter actualizada incrementalmente desde recordAiUsage,
 * lo que da O(1) sin agregaciones en cada check.
 */

import { prisma } from '@/lib/prisma'
import { getMonthlyBudgetUsd } from './usage'

const HOURLY_CALL_LIMIT = Number(process.env.AI_HOURLY_CALL_LIMIT || 1000)
const HOURLY_WINDOW_MS = 60 * 60 * 1000

export type CapacityDenyReason =
  | 'monthly_budget_exceeded'
  | 'monthly_budget_warning'
  | 'hourly_throttle'
  | 'org_disabled'

export interface CapacityCheckResult {
  allowed: boolean
  reason?: CapacityDenyReason
  monthlySpentUsd: number
  monthlyBudgetUsd: number
  monthlyPercent: number
  hourlyCalls: number
  hourlyLimit: number
  message?: string
}

/**
 * Verifica si una org puede ejecutar una llamada IA ahora.
 * Soft cap a 80% (genera warning), hard cap a 110% (bloquea).
 */
export async function checkCapacity(params: {
  orgId: string | null | undefined
  plan: string
  estimatedCostUsd?: number
}): Promise<CapacityCheckResult> {
  // Sin orgId (cron, health check, eval) no hay enforcement
  if (!params.orgId) {
    return {
      allowed: true,
      monthlySpentUsd: 0,
      monthlyBudgetUsd: 0,
      monthlyPercent: 0,
      hourlyCalls: 0,
      hourlyLimit: HOURLY_CALL_LIMIT,
    }
  }

  const budget = getMonthlyBudgetUsd(params.plan)
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const counter = await prisma.aiBudgetCounter.findUnique({
    where: { orgId_monthStart: { orgId: params.orgId, monthStart } },
  })

  const monthlySpent = Number(counter?.totalCostUsd ?? 0)
  const projectedSpent = monthlySpent + (params.estimatedCostUsd ?? 0)
  const monthlyPercent = budget > 0 ? (projectedSpent / budget) * 100 : 0

  // Reset hourly counter si la ventana expiró
  let hourlyCalls = counter?.hourlyCalls ?? 0
  if (counter && counter.hourlyResetAt) {
    const elapsed = now.getTime() - new Date(counter.hourlyResetAt).getTime()
    if (elapsed > HOURLY_WINDOW_MS) {
      // Reset programado (lo hace recordAiUsage en su próximo bump). Aquí solo lectura.
      hourlyCalls = 0
    }
  }

  // ── Hard caps ──────────────────────────────────────────────────────────
  if (hourlyCalls >= HOURLY_CALL_LIMIT) {
    return {
      allowed: false,
      reason: 'hourly_throttle',
      monthlySpentUsd: monthlySpent,
      monthlyBudgetUsd: budget,
      monthlyPercent,
      hourlyCalls,
      hourlyLimit: HOURLY_CALL_LIMIT,
      message: `Tu organización superó el límite de ${HOURLY_CALL_LIMIT} llamadas IA por hora. Reintenta en unos minutos.`,
    }
  }

  // 110% de budget = hard stop. Da margen sobre el cap nominal.
  if (budget > 0 && projectedSpent > budget * 1.1) {
    return {
      allowed: false,
      reason: 'monthly_budget_exceeded',
      monthlySpentUsd: monthlySpent,
      monthlyBudgetUsd: budget,
      monthlyPercent,
      hourlyCalls,
      hourlyLimit: HOURLY_CALL_LIMIT,
      message: `Tu plan tiene un cap mensual de $${budget} en IA y ya excediste el 110% ($${monthlySpent.toFixed(2)}). Actualiza tu plan o espera al próximo mes.`,
    }
  }

  // ── Soft warning (no bloquea pero el caller puede mostrar UI) ──────────
  if (budget > 0 && monthlyPercent >= 80) {
    return {
      allowed: true,
      reason: 'monthly_budget_warning',
      monthlySpentUsd: monthlySpent,
      monthlyBudgetUsd: budget,
      monthlyPercent,
      hourlyCalls,
      hourlyLimit: HOURLY_CALL_LIMIT,
      message: `Has usado ${monthlyPercent.toFixed(0)}% de tu cuota mensual de IA ($${monthlySpent.toFixed(2)} de $${budget}).`,
    }
  }

  return {
    allowed: true,
    monthlySpentUsd: monthlySpent,
    monthlyBudgetUsd: budget,
    monthlyPercent,
    hourlyCalls,
    hourlyLimit: HOURLY_CALL_LIMIT,
  }
}

/**
 * Helper para wrap call sites: retorna throw-friendly error si no allowed.
 * Usar en endpoints API:
 *   await assertCapacity({ orgId, plan })
 *   const { content } = await callAI(...)
 */
export async function assertCapacity(params: {
  orgId: string | null | undefined
  plan: string
  estimatedCostUsd?: number
}): Promise<CapacityCheckResult> {
  const r = await checkCapacity(params)
  if (!r.allowed) {
    const err = new Error(r.message ?? 'Capacidad IA excedida') as Error & { reason?: string; capacity?: CapacityCheckResult }
    err.reason = r.reason
    err.capacity = r
    throw err
  }
  return r
}
