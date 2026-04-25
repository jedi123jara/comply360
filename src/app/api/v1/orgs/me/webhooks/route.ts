/**
 * /api/v1/orgs/me/webhooks
 *
 * API pública v1 — gestión de suscripciones de webhooks salientes.
 * Autenticación con Bearer API key (header `Authorization: Bearer comply_live_...`).
 *
 *   GET   — lista subs activas + inactivas de la org
 *   POST  — crea una sub. Retorna `secret` UNA vez (no se exhibe después).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiKeyService } from '@/lib/api-keys'
import { listEventNames } from '@/lib/events'
import { generateWebhookSecret } from '@/lib/webhooks-out/dispatcher'

function getApiKey(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth) return null
  return auth.startsWith('Bearer ') ? auth.slice(7) : auth
}

function unauthorized() {
  return NextResponse.json(
    { error: 'Header Authorization con API key Bearer es requerido' },
    { status: 401 },
  )
}

export async function GET(req: NextRequest) {
  const key = getApiKey(req)
  if (!key) return unauthorized()
  const v = apiKeyService.validateApiKey(key)
  if (!v.valid || !v.orgId) {
    return NextResponse.json({ error: v.error ?? 'API key inválida' }, { status: 401 })
  }

  const subs = await prisma.webhookSubscription.findMany({
    where: { orgId: v.orgId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      url: true,
      events: true,
      description: true,
      active: true,
      lastDeliveryAt: true,
      lastDeliveryStatus: true,
      consecutiveFailures: true,
      createdAt: true,
      updatedAt: true,
      // No retornar `secret` — se exhibe solo en POST.
    },
  })

  return NextResponse.json({ subscriptions: subs, total: subs.length })
}

export async function POST(req: NextRequest) {
  const key = getApiKey(req)
  if (!key) return unauthorized()
  const v = apiKeyService.validateApiKey(key)
  if (!v.valid || !v.orgId) {
    return NextResponse.json({ error: v.error ?? 'API key inválida' }, { status: 401 })
  }

  let body: {
    url?: string
    events?: string[]
    description?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  // Validaciones
  if (!body.url || typeof body.url !== 'string') {
    return NextResponse.json({ error: 'url requerida' }, { status: 400 })
  }
  let parsedUrl: URL
  try {
    parsedUrl = new URL(body.url)
  } catch {
    return NextResponse.json({ error: 'url no es válida' }, { status: 400 })
  }
  if (parsedUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'En producción la URL debe ser HTTPS por seguridad' },
      { status: 400 },
    )
  }

  if (!Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json(
      { error: 'events: array no vacío requerido' },
      { status: 400 },
    )
  }

  const validEventNames = new Set(listEventNames())
  const invalidEvents = body.events.filter((e) => !validEventNames.has(e as never))
  if (invalidEvents.length > 0) {
    return NextResponse.json(
      {
        error: 'events contiene nombres no soportados',
        invalid: invalidEvents,
        supported: Array.from(validEventNames),
      },
      { status: 400 },
    )
  }

  const secret = generateWebhookSecret()

  const created = await prisma.webhookSubscription.create({
    data: {
      orgId: v.orgId,
      url: body.url,
      events: body.events,
      description: body.description ?? null,
      secret,
      createdBy: v.keyId ?? null,
    },
    select: {
      id: true,
      url: true,
      events: true,
      description: true,
      active: true,
      createdAt: true,
    },
  })

  // El secret se exhibe SOLO ahora. El cliente debe guardarlo — no hay forma
  // de recuperarlo después (similar al patrón de las propias API keys).
  return NextResponse.json({
    subscription: created,
    secret,
    notice: 'Guarda este secret — no se mostrará de nuevo. Úsalo para verificar HMAC en tu endpoint.',
    verifyExample: `// Node.js
const crypto = require('crypto');
const sig = req.headers['x-comply360-signature']; // "sha256=..."
const ts = req.headers['x-comply360-timestamp'];
const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(ts + '.' + rawBody).digest('hex');
if (sig !== expected) return res.status(401).end();`,
  }, { status: 201 })
}
