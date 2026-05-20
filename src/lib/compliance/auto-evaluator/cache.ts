/**
 * Persistencia + cache de respuestas auto-derivadas.
 *
 * Cada `(orgId, questionId)` se cachea por 24h. Si el cliente cambia data
 * (sube un payslip nuevo, registra un EMO, etc.) el cron `recompute-auto-answers`
 * invalida el cache forzando un recompute al próximo prefill.
 *
 * Override manual: el usuario puede sobreescribir cualquier respuesta auto
 * en el wizard; el override se persiste con audit trail (overrideBy/At/Reason)
 * y prevalece sobre la auto-answer en el scoring final.
 */

import { prisma } from '@/lib/prisma'
import type { AutoAnswer } from './types'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export interface CachedAutoAnswer extends AutoAnswer {
  override?: {
    answer: 'SI' | 'NO' | 'PARCIAL' | null
    overrideBy: string | null
    overrideAt: Date | null
    overrideReason: string | null
  }
}

/** Carga todas las auto-answers cacheadas de la org. */
export async function loadCachedAnswers(orgId: string): Promise<Map<string, CachedAutoAnswer>> {
  const rows = await prisma.diagnosticAutoAnswer.findMany({
    where: { orgId },
  })

  const map = new Map<string, CachedAutoAnswer>()
  for (const r of rows) {
    map.set(r.questionId, {
      questionId: r.questionId,
      answer: r.answer as 'SI' | 'NO' | 'PARCIAL' | null,
      confidence: r.confidence,
      evidence: Array.isArray(r.evidence) ? (r.evidence as unknown as AutoAnswer['evidence']) : [],
      sources: Array.isArray(r.sources) ? (r.sources as unknown as string[]) : [],
      evaluatorName: r.evaluatorName ?? undefined,
      override: r.overrideBy
        ? {
            answer: r.overrideAnswer as 'SI' | 'NO' | 'PARCIAL' | null,
            overrideBy: r.overrideBy,
            overrideAt: r.overrideAt,
            overrideReason: r.overrideReason,
          }
        : undefined,
    })
  }
  return map
}

/** ¿La entrada cacheada está fresca (< 24h)? */
export function isFresh(computedAt: Date, now = new Date()): boolean {
  return now.getTime() - computedAt.getTime() < CACHE_TTL_MS
}

/**
 * Persiste un batch de respuestas auto. Usa upsert para mantener `override*`
 * intacto cuando ya existía un override del usuario.
 */
export async function persistAnswers(
  orgId: string,
  answers: AutoAnswer[]
): Promise<{ created: number; updated: number }> {
  if (answers.length === 0) return { created: 0, updated: 0 }

  let created = 0
  let updated = 0

  // Una transacción para garantizar atomicidad en orgs grandes
  await prisma.$transaction(
    answers.map((a) =>
      prisma.diagnosticAutoAnswer.upsert({
        where: { orgId_questionId: { orgId, questionId: a.questionId } },
        create: {
          orgId,
          questionId: a.questionId,
          answer: a.answer,
          confidence: a.confidence,
          evidence: a.evidence as unknown as object,
          sources: a.sources,
          evaluatorName: a.evaluatorName ?? a.questionId,
          computedAt: new Date(),
        },
        update: {
          answer: a.answer,
          confidence: a.confidence,
          evidence: a.evidence as unknown as object,
          sources: a.sources,
          evaluatorName: a.evaluatorName ?? a.questionId,
          computedAt: new Date(),
        },
      })
    )
  )

  // Tally aproximado — para reportar al endpoint cuántas eran nuevas vs. actualizadas
  // (Prisma upsert no expone esto directamente; lo dejamos como 0/N por ahora.)
  updated = answers.length
  created = 0

  return { created, updated }
}

/** Registra override manual del usuario sobre una auto-answer existente. */
export async function setOverride(
  orgId: string,
  questionId: string,
  overrideAnswer: 'SI' | 'NO' | 'PARCIAL' | null,
  userId: string,
  reason?: string
): Promise<void> {
  await prisma.diagnosticAutoAnswer.upsert({
    where: { orgId_questionId: { orgId, questionId } },
    create: {
      orgId,
      questionId,
      answer: null,
      confidence: 0,
      evidence: [] as unknown as object,
      sources: [],
      overrideAnswer,
      overrideBy: userId,
      overrideAt: new Date(),
      overrideReason: reason ?? null,
    },
    update: {
      overrideAnswer,
      overrideBy: userId,
      overrideAt: new Date(),
      overrideReason: reason ?? null,
    },
  })
}

/** Invalida (borra) todas las auto-answers de la org. */
export async function invalidateAllAnswers(orgId: string): Promise<number> {
  const result = await prisma.diagnosticAutoAnswer.deleteMany({ where: { orgId } })
  return result.count
}
