import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  webhookService,
  WebhookError,
  type WebhookEvent,
} from '@/lib/webhooks'

// =============================================
// GET /api/webhooks - List webhooks for org
// =============================================

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const webhooks = webhookService.getWebhooksForOrg(ctx.orgId)

    // No exponer el secret completo, solo los primeros caracteres
    const safeWebhooks = webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      active: w.active,
      secretPreview: `${w.secret.slice(0, 10)}...`,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: safeWebhooks,
      availableEvents: webhookService.getAvailableEvents(),
    })
  } catch (error) {
    console.error('[Webhooks API] Error listando webhooks:', error)
    return NextResponse.json(
      { error: 'Error interno al listar webhooks' },
      { status: 500 }
    )
  }
})

// =============================================
// POST /api/webhooks - Register new webhook
// =============================================

export const POST = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = (await req.json()) as {
      url?: string
      events?: WebhookEvent[]
      secret?: string
    }

    const { url, events, secret } = body

    // ---- Validaciones ----
    if (!url) {
      return NextResponse.json(
        { error: 'Se requiere la URL del webhook' },
        { status: 400 }
      )
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un evento. Eventos disponibles: worker.created, worker.updated, contract.created, contract.expiring, alert.triggered, compliance.updated, payment.received' },
        { status: 400 }
      )
    }

    // ---- Registrar webhook ----
    const webhook = webhookService.registerWebhook(ctx.orgId, url, events, secret)

    return NextResponse.json({
      success: true,
      data: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        secret: webhook.secret, // Solo se muestra completo en el registro
        createdAt: webhook.createdAt.toISOString(),
      },
      message: 'Webhook registrado exitosamente. Guarde el secret, no se mostrara nuevamente.',
    }, { status: 201 })
  } catch (error) {
    if (error instanceof WebhookError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    console.error('[Webhooks API] Error registrando webhook:', error)
    return NextResponse.json(
      { error: 'Error interno al registrar el webhook' },
      { status: 500 }
    )
  }
})

// =============================================
// DELETE /api/webhooks - Remove webhook
// =============================================

export const DELETE = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const webhookId = searchParams.get('id')

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del webhook (parametro ?id=...)' },
        { status: 400 }
      )
    }

    // Verificar que el webhook pertenece a la org
    const webhook = webhookService.getWebhook(webhookId)
    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook no encontrado' },
        { status: 404 }
      )
    }

    if (webhook.orgId !== ctx.orgId) {
      return NextResponse.json(
        { error: 'No tiene permiso para eliminar este webhook' },
        { status: 403 }
      )
    }

    webhookService.removeWebhook(webhookId)

    return NextResponse.json({
      success: true,
      message: 'Webhook eliminado exitosamente',
    })
  } catch (error) {
    if (error instanceof WebhookError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'NOT_FOUND' ? 404 : 400 }
      )
    }

    console.error('[Webhooks API] Error eliminando webhook:', error)
    return NextResponse.json(
      { error: 'Error interno al eliminar el webhook' },
      { status: 500 }
    )
  }
})
