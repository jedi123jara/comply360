import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/notifications/web-push-server'

/**
 * GET /api/notifications/vapid-key
 *
 * Exposes the VAPID public key so that the client can subscribe the user
 * via `pushManager.subscribe({ applicationServerKey })`. Returns 503 if the
 * deployment hasn't configured VAPID keys (push disabled).
 */
export async function GET() {
  const key = getVapidPublicKey()
  if (!key) {
    return NextResponse.json(
      { error: 'push_disabled', hint: 'Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env.' },
      { status: 503 },
    )
  }
  return NextResponse.json({ publicKey: key })
}
