/**
 * /api/diagnostico/auto-prefill
 *
 * POST — Ejecuta el motor auto-evaluator y persiste las respuestas auto-derivadas
 *        para la org del usuario. Se invoca al iniciar el wizard del diagnóstico.
 * GET  — Devuelve las auto-answers cacheadas (sin re-ejecutar). Útil para el
 *        bloque "Evidencia automática" del wizard final.
 * PATCH — Override manual de una auto-answer.
 *
 * Ver `src/lib/compliance/auto-evaluator/` para el motor y los evaluators.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { runFullPrefill } from '@/lib/compliance/auto-evaluator/registry'
import { isFresh, loadCachedAnswers, setOverride } from '@/lib/compliance/auto-evaluator/cache'
import { prisma } from '@/lib/prisma'
import { DEFAULT_MIN_CONFIDENCE, type AutoAnswerValue } from '@/lib/compliance/auto-evaluator/types'

export const runtime = 'nodejs'
export const maxDuration = 60 // hasta 60s para orgs grandes

/* ── POST: ejecuta el motor + persiste ─────────────────────────────────── */

export const POST = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const force = searchParams.get('force') === '1'

    // Si tenemos cache fresco (< 24h) y no se pidió force → devuelve cache
    if (!force) {
      const cached = await loadCachedAnswers(ctx.orgId)
      if (cached.size > 0) {
        const sample = Array.from(cached.values())[0]
        // No tenemos computedAt en CachedAutoAnswer — chequeamos vía DB
        const lastRow = await prisma.diagnosticAutoAnswer.findFirst({
          where: { orgId: ctx.orgId },
          orderBy: { computedAt: 'desc' },
          select: { computedAt: true },
        })
        if (lastRow && isFresh(lastRow.computedAt)) {
          return NextResponse.json({
            cached: true,
            answers: Array.from(cached.values()),
            count: cached.size,
            sample: sample.questionId,
          })
        }
      }
    }

    const result = await runFullPrefill(ctx.orgId)
    return NextResponse.json({
      cached: false,
      total: result.total,
      answered: result.answered,
      durationMs: result.duration,
      answers: result.answers,
    })
  } catch (err) {
    console.error('[auto-prefill POST]', err)
    return NextResponse.json({ error: 'Failed to prefill', detail: String(err) }, { status: 500 })
  }
})

/* ── GET: lee del cache ────────────────────────────────────────────────── */

export const GET = withPlanGate('diagnostico', async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const cached = await loadCachedAnswers(ctx.orgId)
    const arr = Array.from(cached.values())
    // Cuenta solo las que tienen confianza ≥ threshold como "auto-aplicables"
    const aplicables = arr.filter(
      (a) => a.answer !== null && a.confidence >= DEFAULT_MIN_CONFIDENCE
    ).length
    return NextResponse.json({
      total: arr.length,
      aplicables,
      answers: arr,
    })
  } catch (err) {
    console.error('[auto-prefill GET]', err)
    return NextResponse.json({ error: 'Failed to read cache', detail: String(err) }, { status: 500 })
  }
})

/* ── PATCH: override manual ────────────────────────────────────────────── */

export const PATCH = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const { questionId, overrideAnswer, reason } = body as {
      questionId?: string
      overrideAnswer?: AutoAnswerValue | null
      reason?: string
    }
    if (!questionId) {
      return NextResponse.json({ error: 'questionId requerido' }, { status: 400 })
    }
    if (overrideAnswer !== null && !['SI', 'NO', 'PARCIAL'].includes(overrideAnswer ?? '')) {
      return NextResponse.json({ error: 'overrideAnswer inválido' }, { status: 400 })
    }
    await setOverride(ctx.orgId, questionId, overrideAnswer ?? null, ctx.userId, reason)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[auto-prefill PATCH]', err)
    return NextResponse.json({ error: 'Failed to override', detail: String(err) }, { status: 500 })
  }
})
