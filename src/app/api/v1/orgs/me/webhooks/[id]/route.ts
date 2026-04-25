/**
 * /api/v1/orgs/me/webhooks/[id]
 *
 *   PATCH  — actualiza url/events/active/description (no toca secret)
 *   DELETE — elimina (cascade borra deliveries históricas)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiKeyService } from '@/lib/api-keys'
import { listEventNames } from '@/lib/events'

function getApiKey(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth) return null
  return auth.startsWith('Bearer ') ? auth.slice(7) : auth
}

async function authorize(req: NextRequest): Promise<{ orgId: string } | NextResponse> {
  const key = getApiKey(req)
  if (!key) {
    return NextResponse.json({ error: 'API key requerida' }, { status: 401 })
  }
  const v = apiKeyService.validateApiKey(key)
  if (!v.valid || !v.orgId) {
    return NextResponse.json({ error: v.error ?? 'API key inválida' }, { status: 401 })
  }
  return { orgId: v.orgId }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorize(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await ctx.params

  const sub = await prisma.webhookSubscription.findFirst({
    where: { id, orgId: auth.orgId },
  })
  if (!sub) {
    return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
  }

  let body: {
    url?: string
    events?: string[]
    active?: boolean
    description?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const data: {
    url?: string
    events?: string[]
    active?: boolean
    description?: string
    consecutiveFailures?: number
  } = {}

  if (body.url !== undefined) {
    try {
      const u = new URL(body.url)
      if (u.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'URL debe ser HTTPS en producción' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'url no es válida' }, { status: 400 })
    }
    data.url = body.url
  }
  if (body.events !== undefined) {
    if (!Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json({ error: 'events: array no vacío' }, { status: 400 })
    }
    const validEventNames = new Set(listEventNames())
    const invalid = body.events.filter((e) => !validEventNames.has(e as never))
    if (invalid.length > 0) {
      return NextResponse.json({ error: 'eventos no soportados', invalid }, { status: 400 })
    }
    data.events = body.events
  }
  if (body.active !== undefined) {
    data.active = !!body.active
    // Re-activar resetea el contador de fallas
    if (body.active === true) data.consecutiveFailures = 0
  }
  if (body.description !== undefined) data.description = body.description

  const updated = await prisma.webhookSubscription.update({
    where: { id },
    data,
    select: {
      id: true,
      url: true,
      events: true,
      description: true,
      active: true,
      lastDeliveryAt: true,
      lastDeliveryStatus: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ subscription: updated })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorize(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await ctx.params

  const sub = await prisma.webhookSubscription.findFirst({
    where: { id, orgId: auth.orgId },
    select: { id: true },
  })
  if (!sub) {
    return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
  }

  await prisma.webhookSubscription.delete({ where: { id } })
  return NextResponse.json({ ok: true, deleted: id })
}
