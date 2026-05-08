/**
 * Custom metrics y telemetría — FIX #8.C.
 *
 * Wrappers tipados sobre Sentry para registrar eventos de negocio observables:
 * - Plan gate denials (qué features intentan los usuarios sin plan)
 * - Cron failures (cuáles crons fallan y con qué frecuencia)
 * - Advisory lock contention (concurrencia en checkouts)
 * - AI usage anomalies (timeouts, budget exceeded)
 *
 * Diseñado para fallar silenciosamente: si Sentry no está configurado los
 * helpers son no-ops. Nunca lanzan excepciones — la observabilidad jamás
 * debe romper el flujo de negocio.
 */

import * as Sentry from '@sentry/nextjs'

type Tags = Record<string, string | number | boolean | undefined | null>

function safeTags(t: Tags = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(t)) {
    if (v === undefined || v === null) continue
    out[k] = String(v)
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// Plan gate denials
// ─────────────────────────────────────────────────────────────────────────

export function recordPlanGateDenial(args: {
  feature: string
  currentPlan: string
  requiredPlan?: string
  orgId: string
  route: string
}) {
  try {
    Sentry.addBreadcrumb({
      category: 'plan-gate',
      message: `Denial: ${args.feature}`,
      level: 'info',
      data: safeTags(args),
    })
    Sentry.captureMessage(`PLAN_GATE_DENIAL ${args.feature}`, {
      level: 'info',
      tags: safeTags({
        feature: args.feature,
        currentPlan: args.currentPlan,
        requiredPlan: args.requiredPlan,
        route: args.route,
      }),
      extra: { orgId: args.orgId },
    })
  } catch { /* never break business flow */ }
}

// ─────────────────────────────────────────────────────────────────────────
// Cron events
// ─────────────────────────────────────────────────────────────────────────

export function recordCronStart(args: { name: string; bucketKey?: string }) {
  try {
    Sentry.addBreadcrumb({
      category: 'cron',
      message: `cron.start ${args.name}`,
      level: 'info',
      data: safeTags(args),
    })
  } catch { /* noop */ }
}

export function recordCronSuccess(args: {
  name: string
  durationMs: number
  bucketKey?: string
}) {
  try {
    Sentry.addBreadcrumb({
      category: 'cron',
      message: `cron.success ${args.name} (${args.durationMs}ms)`,
      level: 'info',
      data: safeTags(args),
    })
  } catch { /* noop */ }
}

export function recordCronFailure(args: {
  name: string
  error: unknown
  durationMs: number
  bucketKey?: string
}) {
  try {
    const err = args.error instanceof Error ? args.error : new Error(String(args.error))
    Sentry.captureException(err, {
      tags: safeTags({
        cron: args.name,
        bucketKey: args.bucketKey,
        kind: 'cron_failure',
      }),
      extra: { durationMs: args.durationMs },
    })
  } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────────────────
// Advisory lock contention
// ─────────────────────────────────────────────────────────────────────────

export function recordAdvisoryLockContention(args: {
  scope: string
  key: string
  holdMs?: number
}) {
  try {
    Sentry.captureMessage(`ADVISORY_LOCK_CONTENTION ${args.scope}`, {
      level: 'warning',
      tags: safeTags({ scope: args.scope, key: args.key }),
      extra: { holdMs: args.holdMs },
    })
  } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────────────────
// AI usage anomalies
// ─────────────────────────────────────────────────────────────────────────

export function recordAiAnomaly(args: {
  kind: 'timeout' | 'budget_exceeded' | 'rate_limited' | 'invalid_response'
  feature: string
  orgId: string
  durationMs?: number
  spentUsd?: number
}) {
  try {
    Sentry.captureMessage(`AI_ANOMALY ${args.kind} ${args.feature}`, {
      level: 'warning',
      tags: safeTags({ kind: args.kind, feature: args.feature }),
      extra: { orgId: args.orgId, durationMs: args.durationMs, spentUsd: args.spentUsd },
    })
  } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────────────────
// Tagging por request — para que toda la traza herede orgId/plan/route.
// ─────────────────────────────────────────────────────────────────────────

export function tagRequestContext(args: {
  orgId?: string | null
  plan?: string | null
  userId?: string | null
  route?: string | null
}) {
  try {
    const tags = safeTags(args)
    Sentry.getCurrentScope().setTags(tags)
  } catch { /* noop */ }
}
