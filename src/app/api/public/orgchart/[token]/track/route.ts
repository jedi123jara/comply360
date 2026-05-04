/**
 * POST /api/public/orgchart/[token]/track
 *
 * Registra un evento de visita del Auditor Link "Modo Inspector SUNAFIL".
 * Sirve para que el cliente sepa qué pasos del tour vio el inspector — útil
 * en post-mortem ("¿realmente revisó el Comité SST?").
 *
 * Sin auth — cualquier visitante con token válido puede registrar eventos.
 * El orgId se extrae del JWT (no del body) para evitar tampering.
 *
 * Body: { stepKey: string, action: 'enter' | 'leave' | 'tour-completed' }
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyAuditorToken } from '@/lib/orgchart/public-link/token'
import { silentLog } from '@/lib/orgchart/_v2-utils/silent-log'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_ACTIONS = ['enter', 'leave', 'tour-completed', 'tour-started'] as const

const schema = z.object({
  stepKey: z.string().min(1).max(64),
  action: z.enum(ALLOWED_ACTIONS),
})

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params
  const decoded = verifyAuditorToken(token)
  if (!decoded) {
    return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Body inválido', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { stepKey, action } = parsed.data
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    null
  const userAgent = req.headers.get('user-agent') ?? null

  // Audit log con orgId del token (audience-bound) — no del body.
  await prisma.auditLog
    .create({
      data: {
        orgId: decoded.aud,
        userId: null, // visitor sin login
        action: `orgchart.auditor_link.${action}`,
        entityType: 'OrgChartSnapshot',
        entityId: decoded.sub,
        metadataJson: {
          stepKey,
          snapshotHash: decoded.hash,
          userAgent,
        } as object,
        ipAddress: ip,
      },
    })
    .catch(silentLog('orgchart.auditor_link.track_failed', {
      orgId: decoded.aud,
      snapshotId: decoded.sub,
      stepKey,
      action,
    }))

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
