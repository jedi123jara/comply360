/**
 * GET /api/cron/ack-reminders
 *
 * Cron diario que recuerda a workers con docs pendientes de firmar.
 *
 * Lógica:
 *   - Para cada OrgDocument con acknowledgmentRequired=true e isPublishedToWorkers=true
 *   - Resolver workers en scope que NO han firmado la versión actual
 *   - Si pasaron 3, 7 o 14 días desde lastNotifiedAt → re-enviar email
 *   - Si pasó el deadline acknowledgmentDeadlineDays → escalar al admin
 *
 * Idempotencia: AuditLog `action='ack.reminder.day-X'` por (org, doc, day)
 * para no duplicar.
 *
 * Auth: Bearer ${CRON_SECRET}
 *
 * Schedule: vercel.json `0 13 * * *` (8am Lima)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyWorkersOfDocUpdate } from '@/lib/documents/acknowledgments'
import { sendEmail } from '@/lib/email'

const REMINDER_INTERVALS_DAYS = [3, 7, 14] // Días desde lastNotifiedAt

export async function GET(req: NextRequest) {
  // Auth check
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // 1. Docs con ack required + publicados + ya notificados al menos una vez
    const docs = await prisma.orgDocument.findMany({
      where: {
        acknowledgmentRequired: true,
        isPublishedToWorkers: true,
        lastNotifiedAt: { not: null },
      },
      select: {
        id: true,
        orgId: true,
        title: true,
        version: true,
        lastNotifiedAt: true,
        acknowledgmentDeadlineDays: true,
      },
    })

    const stats = {
      docsChecked: docs.length,
      remindersSent: 0,
      adminEscalations: 0,
      skippedRecent: 0,
    }

    for (const doc of docs) {
      const daysSince = Math.floor(
        (now.getTime() - new Date(doc.lastNotifiedAt!).getTime()) / (1000 * 60 * 60 * 24),
      )

      // Solo procesar si toca uno de los intervalos exactos (3, 7, 14)
      if (!REMINDER_INTERVALS_DAYS.includes(daysSince)) {
        continue
      }

      // Idempotencia: ¿ya enviamos reminder de este día?
      const alreadyReminded = await prisma.auditLog.findFirst({
        where: {
          orgId: doc.orgId,
          action: `ack.reminder.day-${daysSince}`,
          entityType: 'OrgDocument',
          entityId: doc.id,
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // últimas 24h
        },
        select: { id: true },
      })
      if (alreadyReminded) {
        stats.skippedRecent++
        continue
      }

      // Re-notificar (forzando email)
      try {
        await notifyWorkersOfDocUpdate({
          orgId: doc.orgId,
          documentId: doc.id,
          forceEmail: true,
        })
        stats.remindersSent++

        await prisma.auditLog.create({
          data: {
            orgId: doc.orgId,
            action: `ack.reminder.day-${daysSince}`,
            entityType: 'OrgDocument',
            entityId: doc.id,
            metadataJson: {
              docTitle: doc.title,
              docVersion: doc.version,
              daysSinceFirstNotif: daysSince,
            },
          },
        })
      } catch (err) {
        console.error(`[ack-reminders] Failed to remind doc ${doc.id}:`, err)
      }

      // Escalación: si pasó el deadline, alertar al admin
      if (doc.acknowledgmentDeadlineDays && daysSince >= doc.acknowledgmentDeadlineDays) {
        const alreadyEscalated = await prisma.auditLog.findFirst({
          where: {
            orgId: doc.orgId,
            action: 'ack.deadline_exceeded',
            entityType: 'OrgDocument',
            entityId: doc.id,
            createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }, // 1/semana max
          },
          select: { id: true },
        })
        if (!alreadyEscalated) {
          try {
            const org = await prisma.organization.findUnique({
              where: { id: doc.orgId },
              select: { alertEmail: true, name: true, razonSocial: true },
            })
            if (org?.alertEmail) {
              await sendEmail({
                to: org.alertEmail,
                subject: `⚠️ Trabajadores no firmaron "${doc.title}" — plazo vencido`,
                html: buildEscalationEmailHtml({
                  orgName: org.razonSocial ?? org.name ?? 'tu empresa',
                  docTitle: doc.title,
                  docVersion: doc.version,
                  daysSinceFirstNotif: daysSince,
                }),
              })
              stats.adminEscalations++
              await prisma.auditLog.create({
                data: {
                  orgId: doc.orgId,
                  action: 'ack.deadline_exceeded',
                  entityType: 'OrgDocument',
                  entityId: doc.id,
                  metadataJson: { docTitle: doc.title, daysSinceFirstNotif: daysSince },
                },
              })
            }
          } catch (err) {
            console.error(`[ack-reminders] Escalation failed for doc ${doc.id}:`, err)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      timestamp: now.toISOString(),
    })
  } catch (err) {
    console.error('[ack-reminders] Fatal error:', err)
    return NextResponse.json(
      {
        error: 'Cron failed',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    )
  }
}

function buildEscalationEmailHtml(opts: {
  orgName: string
  docTitle: string
  docVersion: number
  daysSinceFirstNotif: number
}): string {
  return `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #b45309; font-size: 22px;">⚠️ Acuses pendientes de "${opts.docTitle}"</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Pasaron <strong>${opts.daysSinceFirstNotif} días</strong> desde que enviaste la notificación
        del documento <strong>"${opts.docTitle}"</strong> (v${opts.docVersion}) y aún hay trabajadores
        que no han firmado el acuse.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        <strong>Riesgo legal:</strong> sin acuse documentado, ante una inspección SUNAFIL no podrás
        demostrar que esos trabajadores conocen el contenido del documento.
      </p>
      <h2 style="color: #1f2937; font-size: 16px; margin-top: 24px;">Acciones sugeridas</h2>
      <ol style="color: #374151; font-size: 15px; line-height: 1.8;">
        <li>Entra al dashboard y revisa quién falta firmar</li>
        <li>Considera contactarlos directamente por teléfono/WhatsApp</li>
        <li>Si alguno ya no labora, márcalo como cesado</li>
      </ol>
      <p style="margin-top: 24px;">
        <a href="https://comply360.pe/dashboard/documentos-firma"
           style="background: #b45309; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Ver pendientes
        </a>
      </p>
    </div>
  `
}
