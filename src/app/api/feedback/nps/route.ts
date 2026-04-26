/**
 * /api/feedback/nps
 *
 * GET → ¿corresponde mostrar NPS al user actual?
 *   Criterios:
 *     - User existe ≥30 días (account.createdAt)
 *     - Org tiene ≥3 acciones registradas (workers, contratos, diagnostics, etc.)
 *     - User no respondió antes (UNIQUE en npsFeedback.userId)
 *
 * POST → registra el score + comentario opcional.
 *   Body: { score: 0-10, comment?: string, source?: string }
 *
 * El cliente persiste localStorage flag "comply360.npsResponded" después de
 * éxito para no preguntar de nuevo en la misma sesión (defense in depth: el
 * UNIQUE de DB es la fuente real de verdad).
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const ACCOUNT_MIN_AGE_DAYS = 30
const ACTIONS_MIN_COUNT = 3

export const GET = withAuth(async (_req, ctx) => {
  // Check 1: user no respondió antes
  const existing = await prisma.npsFeedback.findUnique({
    where: { userId: ctx.userId },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ shouldShow: false, reason: 'already_responded' })
  }

  // Check 2: cuenta ≥30 días
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { createdAt: true },
  })
  if (!user) {
    return NextResponse.json({ shouldShow: false, reason: 'no_user' })
  }
  const ageDays = Math.floor(
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (ageDays < ACCOUNT_MIN_AGE_DAYS) {
    return NextResponse.json({ shouldShow: false, reason: 'too_new', ageDays })
  }

  // Check 3: org tiene ≥3 acciones (workers + contratos)
  const [workers, contracts] = await Promise.all([
    prisma.worker.count({ where: { orgId: ctx.orgId } }),
    prisma.contract.count({ where: { orgId: ctx.orgId } }),
  ])
  const totalActions = workers + contracts
  if (totalActions < ACTIONS_MIN_COUNT) {
    return NextResponse.json({ shouldShow: false, reason: 'not_engaged', totalActions })
  }

  return NextResponse.json({ shouldShow: true, ageDays, totalActions })
})

export const POST = withAuth(async (req, ctx) => {
  let body: { score?: number; comment?: string; source?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const score = Number(body.score)
  if (!Number.isInteger(score) || score < 0 || score > 10) {
    return NextResponse.json(
      { error: 'Score debe ser entero entre 0 y 10', code: 'INVALID_SCORE' },
      { status: 400 },
    )
  }

  // Idempotente — si ya respondió, devolvemos OK pero no creamos duplicado
  const existing = await prisma.npsFeedback.findUnique({
    where: { userId: ctx.userId },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ success: true, alreadyResponded: true })
  }

  const created = await prisma.npsFeedback.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      score,
      comment: body.comment?.slice(0, 1000) ?? null,
      source: body.source?.slice(0, 50) ?? null,
    },
    select: { id: true, createdAt: true },
  })

  return NextResponse.json({ success: true, id: created.id, createdAt: created.createdAt })
})
