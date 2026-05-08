/**
 * GET /api/cron/drip-emails
 *
 * Cron diario 11am UTC = 6am PET.
 * Procesa la secuencia de nurturing para los `Lead` del diagnóstico gratuito.
 *
 * Para cada lead no convertido:
 *   1. Mira AuditLog de las acciones `lead.drip.sent.dayN` ya enviadas
 *   2. Calcula qué stage corresponde hoy según `DRIP_STAGES`
 *   3. Si aplica y no se envió → manda email + registra AuditLog
 *
 * Idempotente: re-ejecutar el mismo día no duplica envíos.
 * Per-lead isolation: fallos individuales no tumban el batch.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/client'
import { DRIP_STAGES, nextStageForLead } from '@/lib/email/drip-sequence'
import { claimCronRun, completeCronRun, failCronRun } from '@/lib/cron/idempotency'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[drip-emails] CRON_SECRET no configurado')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // FIX #5.A: idempotencia diaria.
  const claim = await claimCronRun('drip-emails', { bucketMinutes: 1440 })
  if (!claim.acquired) {
    return NextResponse.json({ ok: true, duplicate: true, bucket: claim.bucket })
  }

  try {
  const now = new Date()
  // Procesamos leads de los últimos 15 días (stage 5 es día 10, margen seguridad)
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - 15)

  const leads = await prisma.lead.findMany({
    where: {
      createdAt: { gte: cutoff },
      convertedAt: null, // solo los que no convirtieron a cuenta
      email: { not: { equals: '' } },
    },
    select: {
      id: true,
      email: true,
      companyName: true,
      companySize: true,
      sector: true,
      phone: true,
      source: true,
      scoreGlobal: true,
      multaEstimada: true,
      scoreByArea: true,
      convertedAt: true,
      convertedOrgId: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 500, // safety cap
  })

  // Una sola query para cargar todos los AuditLog de drip de estos leads
  const leadIds = leads.map((l) => l.id)
  const priorSends = leadIds.length > 0
    ? await prisma.auditLog.findMany({
        where: {
          entityType: 'Lead',
          entityId: { in: leadIds },
          action: { in: DRIP_STAGES.map((s) => s.auditAction) },
        },
        select: { entityId: true, action: true },
      })
    : []

  // Build map: leadId → stages ya enviados
  const sentByLead = new Map<string, number[]>()
  for (const log of priorSends) {
    if (!log.entityId) continue
    const stageNum = DRIP_STAGES.find((s) => s.auditAction === log.action)?.stage
    if (!stageNum) continue
    const arr = sentByLead.get(log.entityId) ?? []
    arr.push(stageNum)
    sentByLead.set(log.entityId, arr)
  }

  let processed = 0
  let sent = 0
  let skipped = 0
  let failed = 0

  for (const lead of leads) {
    processed++
    const sentStages = sentByLead.get(lead.id) ?? []
    const stage = nextStageForLead(lead, sentStages, now)

    if (!stage) {
      skipped++
      continue
    }

    try {
      const result = await sendEmail({
        to: lead.email,
        subject: stage.subject(lead),
        html: stage.html(lead),
      })

      // AuditLog — idempotencia. Sin orgId porque Lead no pertenece a una org
      // todavía. Usamos 'leads' como orgId sentinel.
      await prisma.auditLog.create({
        data: {
          orgId: 'leads',
          action: stage.auditAction,
          entityType: 'Lead',
          entityId: lead.id,
          metadataJson: {
            email: lead.email,
            stage: stage.stage,
            sentAt: now.toISOString(),
            emailResult: Boolean(result),
          },
        },
      })

      if (result) sent++
      else failed++
    } catch (err) {
      failed++
      console.error(`[drip-emails] lead ${lead.id} failed`, err)
    }
  }

  const payload = {
    ok: true,
    summary: {
      totalLeads: leads.length,
      processed,
      sent,
      skipped,
      failed,
    },
  }
    await completeCronRun(claim.runId, payload)
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[drip-emails] cron error', err)
    await failCronRun(claim.runId, err)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
