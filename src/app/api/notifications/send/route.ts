import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  sendNotification,
  type NotificationChannel,
  type NotificationPriority,
} from '@/lib/notifications'

export const runtime = 'nodejs'

const VALID_CHANNELS: NotificationChannel[] = [
  'console',
  'web-push',
  'whatsapp',
  'email',
  'sms',
]

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: {
    recipient?: string
    channels?: string[]
    priority?: NotificationPriority
    title?: string
    body?: string
    actionUrl?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (!body.recipient || !body.title || !body.body) {
    return NextResponse.json(
      { error: 'recipient, title y body son requeridos' },
      { status: 400 }
    )
  }
  const channels = (body.channels || ['console']).filter((c): c is NotificationChannel =>
    VALID_CHANNELS.includes(c as NotificationChannel)
  )
  if (channels.length === 0) {
    return NextResponse.json({ error: 'Al menos un canal válido es requerido' }, { status: 400 })
  }

  const result = await sendNotification({
    orgId: ctx.orgId,
    recipient: body.recipient,
    channels,
    priority: body.priority || 'normal',
    title: body.title,
    body: body.body,
    actionUrl: body.actionUrl,
  })

  return NextResponse.json(result)
})
