/**
 * Cron: Risk Sweep
 *
 * Ejecuta el agente Monitor de Riesgo Proactivo para todas las organizaciones
 * activas. Pensado para Vercel cron (semanal o diario).
 *
 * Llamado desde vercel.json:
 *   { "crons": [{ "path": "/api/cron/risk-sweep", "schedule": "0 7 * * 1" }] }
 *
 * Protección: requiere header `Authorization: Bearer ${CRON_SECRET}`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runAgent } from '@/lib/agents/runtime'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let orgs: Array<{ id: string }> = []
  try {
    orgs = await prisma.organization.findMany({
      select: { id: true },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error cargando orgs' },
      { status: 500 }
    )
  }

  const summary: Array<{ orgId: string; findings: number; exposicion: number }> = []
  for (const org of orgs) {
    try {
      const result = await runAgent(
        'risk-monitor',
        { type: 'json' },
        { orgId: org.id, userId: 'system-cron' }
      )
      const data = result.data as { findings?: unknown[]; exposicionTotalSoles?: number } | null
      summary.push({
        orgId: org.id,
        findings: Array.isArray(data?.findings) ? data!.findings!.length : 0,
        exposicion: data?.exposicionTotalSoles ?? 0,
      })
    } catch (e) {
      summary.push({
        orgId: org.id,
        findings: -1,
        exposicion: 0,
      })
      console.error(`[risk-sweep] error org ${org.id}`, e)
    }
  }

  return NextResponse.json({
    success: true,
    organizationsScanned: orgs.length,
    summary,
    runAt: new Date().toISOString(),
  })
}
