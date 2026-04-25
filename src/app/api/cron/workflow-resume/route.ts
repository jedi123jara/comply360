/**
 * GET /api/cron/workflow-resume
 *
 * Cron cada 5 minutos que busca `WorkflowRun` en estado `RUNNING` o `PENDING`
 * que llevan más de 5 minutos sin actualizarse y los marca como `FAILED`
 * con razón `stale: server crashed before completion`.
 *
 * Por qué: los workflows se ejecutan in-process del request HTTP que disparó
 * el evento. Si el container muere a mitad de ejecución (cold-start kill,
 * deploy, OOM), el run queda colgado en RUNNING para siempre, bloqueando la
 * UI ("se está ejecutando...") y la idempotencia (mismo trigger no entra
 * porque el placeholder existe pero nunca termina).
 *
 * Marcar como FAILED libera el slot para que un nuevo evento pueda intentar.
 *
 * Protegido por CRON_SECRET. Devuelve conteo de runs limpiados.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { claimCronRun, completeCronRun, failCronRun } from '@/lib/cron/idempotency'

export const runtime = 'nodejs'
export const maxDuration = 60

const STALE_AFTER_MS = 5 * 60 * 1000 // 5 min

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[workflow-resume] CRON_SECRET no configurado')
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Idempotencia: bucket de 5 min coincide con la cadencia del cron
  const claim = await claimCronRun('workflow-resume', { bucketMinutes: 5 })
  if (!claim.acquired) {
    return NextResponse.json({ ok: true, duplicate: true, reason: claim.reason, bucket: claim.bucket })
  }

  const cutoff = new Date(Date.now() - STALE_AFTER_MS)

  // Buscar runs colgados: estado activo + startedAt anterior al cutoff +
  // sin completedAt seteado.
  try {
    const stale = await prisma.workflowRun.findMany({
      where: {
        status: { in: ['PENDING', 'RUNNING'] },
        startedAt: { lt: cutoff },
        completedAt: null,
      },
      select: { id: true, workflowId: true, orgId: true, startedAt: true, status: true },
      take: 200,
    })

    if (stale.length === 0) {
      await completeCronRun(claim.runId, { cleaned: 0 })
      return NextResponse.json({ ok: true, cleaned: 0 })
    }

    const result = await prisma.workflowRun.updateMany({
      where: { id: { in: stale.map((r) => r.id) } },
      data: {
        status: 'FAILED',
        error: 'stale: server crashed before completion (auto-cleaned by workflow-resume cron)',
        completedAt: new Date(),
      },
    })

    console.log(
      `[workflow-resume] limpió ${result.count} workflow runs colgados (cutoff=${cutoff.toISOString()})`,
    )

    await completeCronRun(claim.runId, { cleaned: result.count })

    return NextResponse.json({
      ok: true,
      cleaned: result.count,
      cutoff: cutoff.toISOString(),
      runs: stale.map((r) => ({
        id: r.id,
        workflowId: r.workflowId,
        orgId: r.orgId,
        startedAt: r.startedAt.toISOString(),
        previousStatus: r.status,
      })),
    })
  } catch (err) {
    await failCronRun(claim.runId, err)
    throw err
  }
}
