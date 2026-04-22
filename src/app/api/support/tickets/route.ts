/**
 * POST /api/support/tickets
 *
 * Registra un ticket de soporte:
 *   1. Audit log con acción SUPPORT_TICKET_CREATED
 *   2. Email al FOUNDER_EMAIL con el contenido del ticket
 *
 * Body: { subject, category, priority, description }
 * No adjuntos por ahora (requiere upload a Supabase Storage — fase 2).
 *
 * Protegido: cualquier usuario autenticado puede crear su ticket.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/client'

const VALID_CATEGORIES = [
  'billing',
  'tecnico',
  'legal',
  'onboarding',
  'feature_request',
  'bug',
  'otro',
] as const

const VALID_PRIORITIES = ['baja', 'media', 'alta', 'critica'] as const

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))

  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 200) : ''
  const description =
    typeof body.description === 'string' ? body.description.trim().slice(0, 5000) : ''
  const rawCat = typeof body.category === 'string' ? body.category : ''
  const rawPri = typeof body.priority === 'string' ? body.priority : ''

  if (!subject || !description) {
    return NextResponse.json(
      { error: 'Asunto y descripción son requeridos.' },
      { status: 400 },
    )
  }

  const category = (VALID_CATEGORIES as readonly string[]).includes(rawCat) ? rawCat : 'otro'
  const priority = (VALID_PRIORITIES as readonly string[]).includes(rawPri) ? rawPri : 'media'

  // Persistir como AuditLog (reusamos la tabla, zero migration)
  const log = await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'SUPPORT_TICKET_CREATED',
      entityType: 'SupportTicket',
      metadataJson: {
        subject,
        description,
        category,
        priority,
        reporterEmail: ctx.email,
      },
    },
    select: { id: true, createdAt: true },
  })

  const ticketCode = `TKT-${log.createdAt.getFullYear()}-${log.id.slice(-6).toUpperCase()}`

  // Notificar al founder por email (best-effort, no bloquea la respuesta)
  const founderEmail = process.env.FOUNDER_EMAIL
  if (founderEmail) {
    const priorityColor =
      ({
        critica: '#dc2626',
        alta: '#ea580c',
        media: '#0891b2',
        baja: '#65a30d',
      } as Record<string, string>)[priority] ?? '#64748b'
    sendEmail({
      to: founderEmail,
      subject: `[${priority.toUpperCase()}] Ticket ${ticketCode}: ${subject}`,
      html: `
        <div style="font-family: -apple-system, Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: ${priorityColor}; color: white; padding: 12px 16px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
            ${priority} · ${category}
          </div>
          <h2 style="margin: 16px 0 8px; color: #0a0a0f;">${escapeHtml(subject)}</h2>
          <div style="color: #64748b; font-size: 13px; margin-bottom: 20px;">
            Ticket <strong>${ticketCode}</strong> · ${ctx.email ?? 'usuario sin email'} · org <code>${ctx.orgId}</code>
          </div>
          <div style="background: #f8fafc; border-left: 3px solid ${priorityColor}; padding: 16px; border-radius: 8px; color: #334155; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
${escapeHtml(description)}
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
            Responder directamente a ${ctx.email ?? 'el usuario'} o revisar en el Founder Console.
          </p>
        </div>
      `,
    }).catch((err) => {
      console.error('[support/tickets] Failed to send notification email:', err)
    })
  }

  return NextResponse.json({
    ok: true,
    ticketId: log.id,
    ticketCode,
    message: 'Recibimos tu ticket. Te respondemos por email dentro de las 24h hábiles.',
  })
})

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
