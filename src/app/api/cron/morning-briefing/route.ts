/**
 * GET /api/cron/morning-briefing
 *
 * Cron diario 7am PET (= 12:00 UTC) que envía un email al admin de cada org
 * con el briefing del día:
 *   • Qué pasó ayer (contratos firmados, docs subidos, alertas resueltas)
 *   • Qué hay para hoy (alertas críticas abiertas, vencimientos ≤7 días)
 *   • Multa evitada acumulada del mes
 *
 * Diseño:
 *   - Envía solo si hay contenido relevante (no spam de "cero novedades")
 *   - Por-org isolation (una org que falla no tumba las demás)
 *   - Solo orgs con plan ≥ STARTER (no FREE — es retention tool para pagos)
 *
 * Protegido por CRON_SECRET (header `Authorization: Bearer ${secret}`)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/client'
import { morningBriefingEmail } from '@/lib/email/templates'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[morning-briefing] CRON_SECRET no configurado')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const yesterdayEnd = new Date(yesterday)
  yesterdayEnd.setHours(23, 59, 59, 999)

  const in7Days = new Date(now)
  in7Days.setDate(in7Days.getDate() + 7)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Solo orgs pagadoras con alertEmail configurado
  const orgs = await prisma.organization.findMany({
    where: {
      plan: { in: ['STARTER', 'EMPRESA', 'PRO', 'ENTERPRISE'] },
      alertEmail: { not: null },
    },
    select: { id: true, name: true, alertEmail: true },
  })

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const org of orgs) {
    try {
      const [
        signedYesterday,
        docsUploadedYesterday,
        criticalAlertsOpen,
        upcomingDeadlines,
        multasEvitadasMes,
      ] = await Promise.all([
        prisma.contract.count({
          where: {
            orgId: org.id,
            signedAt: { gte: yesterday, lte: yesterdayEnd },
          },
        }),
        prisma.workerDocument.count({
          where: {
            worker: { orgId: org.id },
            createdAt: { gte: yesterday, lte: yesterdayEnd },
          },
        }),
        prisma.workerAlert.count({
          where: {
            orgId: org.id,
            severity: { in: ['CRITICAL', 'HIGH'] },
            resolvedAt: null,
          },
        }),
        prisma.contract.count({
          where: {
            orgId: org.id,
            status: { in: ['APPROVED', 'SIGNED'] },
            expiresAt: { gte: now, lte: in7Days },
          },
        }),
        prisma.workerAlert.aggregate({
          where: {
            orgId: org.id,
            resolvedAt: { gte: monthStart },
          },
          _sum: { multaEstimada: true },
        }),
      ])

      const hasContent =
        signedYesterday > 0 ||
        docsUploadedYesterday > 0 ||
        criticalAlertsOpen > 0 ||
        upcomingDeadlines > 0

      if (!hasContent) {
        skipped++
        continue // No spameamos con días sin novedades
      }

      if (!org.alertEmail) {
        skipped++
        continue
      }

      const multaEvitadaMesSoles = Number(multasEvitadasMes._sum.multaEstimada ?? 0)

      const html = morningBriefingEmail({
        orgName: org.name,
        signedYesterday,
        docsUploadedYesterday,
        criticalAlertsOpen,
        upcomingDeadlines,
        multaEvitadaMes: multaEvitadaMesSoles,
      })

      const result = await sendEmail({
        to: org.alertEmail,
        subject: `☀️ Tu briefing de hoy · ${new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}`,
        html,
      })

      if (result) sent++
      else failed++
    } catch (err) {
      failed++
      console.error(`[morning-briefing] org ${org.id} failed`, err)
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      totalOrgs: orgs.length,
      sent,
      skipped,
      failed,
    },
  })
}
