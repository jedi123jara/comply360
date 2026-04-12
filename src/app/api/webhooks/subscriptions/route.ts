/**
 * /api/webhooks/subscriptions
 *  GET   — lista suscripciones de la org
 *  POST  — crea una suscripción { url, events[], secret? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID, randomBytes } from 'crypto'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  listSubscriptions,
  registerSubscription,
  removeSubscription,
  type WebhookEventType,
} from '@/lib/webhooks/dispatcher'

const VALID_EVENTS: WebhookEventType[] = [
  'worker.created',
  'worker.updated',
  'worker.terminated',
  'contract.created',
  'contract.signed',
  'contract.expired',
  'compliance.diagnostic.completed',
  'sunafil.notification.received',
  'agent.run.completed',
  'risk.critical.detected',
]

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const subs = listSubscriptions(ctx.orgId).map(s => ({
    id: s.id,
    url: s.url,
    events: s.events,
    active: s.active,
    createdAt: s.createdAt,
    // No exponer secret completo, solo prefijo
    secretPreview: s.secret.slice(0, 8) + '...',
  }))
  return NextResponse.json({ subscriptions: subs })
})

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: { url?: string; events?: string[]; secret?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.url || !/^https?:\/\//.test(body.url)) {
    return NextResponse.json(
      { error: 'url debe ser http(s)://...' },
      { status: 400 }
    )
  }
  if (!Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json(
      { error: 'events debe ser un array no vacío' },
      { status: 400 }
    )
  }
  const events = body.events.filter((e): e is WebhookEventType =>
    VALID_EVENTS.includes(e as WebhookEventType)
  )
  if (events.length === 0) {
    return NextResponse.json(
      {
        error: 'Ningún evento válido. Eventos disponibles: ' + VALID_EVENTS.join(', '),
      },
      { status: 400 }
    )
  }

  const secret = body.secret || `whsec_${randomBytes(24).toString('hex')}`
  const sub = {
    id: randomUUID(),
    orgId: ctx.orgId,
    url: body.url,
    secret,
    events,
    active: true,
    createdAt: new Date(),
  }
  registerSubscription(sub)

  return NextResponse.json(
    {
      subscription: {
        id: sub.id,
        url: sub.url,
        events: sub.events,
        active: sub.active,
        createdAt: sub.createdAt,
      },
      // Solo se devuelve UNA vez en la creación
      secret,
      verifyHint:
        'Guarda este secret y úsalo para validar la firma X-Comply360-Signature (HMAC-SHA256 del body)',
    },
    { status: 201 }
  )
})

export const DELETE = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }
  const ok = removeSubscription(ctx.orgId, id)
  return NextResponse.json({ deleted: ok })
})
