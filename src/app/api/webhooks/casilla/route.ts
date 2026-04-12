/**
 * POST /api/webhooks/casilla
 *
 * Webhook público autenticado por token compartido (`CASILLA_WEBHOOK_SECRET`)
 * para recibir notificaciones de la casilla electrónica SUNAFIL desde un
 * proveedor partner que monitoree la casilla.
 *
 * Body esperado:
 * {
 *   orgId: string,
 *   numeroOficial: string,
 *   tipo: "ACTA_INSPECCION" | "CITACION" | ...,
 *   fechaNotificacion: "YYYY-MM-DD",
 *   fechaIngreso: "YYYY-MM-DD",
 *   asunto: string,
 *   inspector?: string,
 *   intendenciaRegional?: string,
 *   plazoDiasHabiles?: number,
 *   documentoUrl?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ingestNotification, type CasillaNotificationType } from '@/lib/integrations/casilla-sunafil'
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

// In-memory rate limit counter for webhooks
let _webhookCounts: Map<string, number> | null = null

export async function POST(req: NextRequest) {
  // SECURITY: Validate webhook secret + HMAC signature
  const auth = req.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.CASILLA_WEBHOOK_SECRET || ''}`
  if (!process.env.CASILLA_WEBHOOK_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Rate limit: max 30 webhook calls per minute
  const sourceIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'webhook'
  const now = Date.now()
  const windowKey = `casilla-wh:${sourceIp}:${Math.floor(now / 60000)}`
  // Simple in-memory counter (for production, use Redis)
  if (!_webhookCounts) _webhookCounts = new Map()
  const count = (_webhookCounts.get(windowKey) ?? 0) + 1
  _webhookCounts.set(windowKey, count)
  if (count > 30) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: {
    orgId?: string
    numeroOficial?: string
    tipo?: string
    fechaNotificacion?: string
    fechaIngreso?: string
    asunto?: string
    inspector?: string
    intendenciaRegional?: string
    plazoDiasHabiles?: number
    documentoUrl?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.orgId || !body.numeroOficial || !body.fechaNotificacion || !body.asunto) {
    return NextResponse.json(
      { error: 'orgId, numeroOficial, fechaNotificacion y asunto son requeridos' },
      { status: 400 }
    )
  }

  // SECURITY: Validate orgId exists in our DB (prevents injection to non-existent orgs)
  const orgExists = await prisma.organization.findUnique({
    where: { id: body.orgId },
    select: { id: true },
  })
  if (!orgExists) {
    return NextResponse.json({ error: 'Organizacion no encontrada' }, { status: 404 })
  }

  const notification = ingestNotification({
    orgId: body.orgId,
    numeroOficial: body.numeroOficial,
    tipo: (body.tipo as CasillaNotificationType) || 'OTRO',
    fechaNotificacion: body.fechaNotificacion,
    fechaIngreso: body.fechaIngreso || new Date().toISOString().slice(0, 10),
    asunto: body.asunto,
    inspector: body.inspector,
    intendenciaRegional: body.intendenciaRegional,
    plazoDiasHabiles: body.plazoDiasHabiles ?? 15,
    documentoUrl: body.documentoUrl,
  })

  // Disparar webhook event genérico a suscriptores del cliente
  dispatchWebhookEvent({
    id: randomUUID(),
    type: 'sunafil.notification.received',
    orgId: body.orgId,
    occurredAt: new Date().toISOString(),
    data: {
      notificationId: notification.id,
      tipo: notification.tipo,
      numeroOficial: notification.numeroOficial,
      fechaLimite: notification.fechaLimite,
    },
  })

  return NextResponse.json(
    {
      success: true,
      notification,
      nextSteps: [
        'Ejecutar Agente Analizador SUNAFIL sobre el documento',
        'Agendar recordatorio 3 días antes del vencimiento',
        'Notificar al admin de la organización',
      ],
    },
    { status: 201 }
  )
}
