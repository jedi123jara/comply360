import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

/**
 * POST /api/notifications/subscribe
 *
 * Persiste una Web Push subscription por usuario autenticado. El shape
 * viene de `PushSubscription.toJSON()`:
 *   { endpoint, keys: { p256dh, auth }, expirationTime }
 *
 * Se guarda en `User.pushSubscription` (JSON). Nueva migración requerida
 * agregando esa columna al modelo User.
 */

interface SubscriptionJson {
  endpoint: string
  keys?: { p256dh?: string; auth?: string }
  expirationTime?: number | null
}

function isValidSubscription(v: unknown): v is SubscriptionJson {
  if (!v || typeof v !== 'object') return false
  const obj = v as Record<string, unknown>
  if (typeof obj.endpoint !== 'string') return false
  return true
}

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!isValidSubscription(body)) {
    return NextResponse.json({ error: 'invalid_subscription' }, { status: 400 })
  }

  // `pushSubscription Json?` — nueva columna en modelo User.
  // Si la migración aún no se corrió, este update fallará; devolvemos un
  // error claro para que el admin aplique `npx prisma migrate dev`.
  try {
    await prisma.user.update({
      where: { id: ctx.userId },
      data: { pushSubscription: body as object },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      {
        error: 'persist_failed',
        hint:
          'Correr `prisma migrate dev` para aplicar la migración de push_subscription.',
        detail: msg,
      },
      { status: 501 }
    )
  }
})
