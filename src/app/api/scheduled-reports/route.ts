/**
 * GET  /api/scheduled-reports  — Lista los reportes programados de la org + catálogo disponible.
 * POST /api/scheduled-reports  — Crea uno nuevo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import type { AuthContext } from '@/lib/auth'
import type { Prisma } from '@/generated/prisma/client'

const VALID_REPORT_TYPES = [
  'compliance-ejecutivo',
  'sst-anual',
  'workers',
  'contracts',
  'alerts',
] as const
type ReportType = (typeof VALID_REPORT_TYPES)[number]

const VALID_FORMATS = ['PDF', 'XLSX', 'BOTH'] as const
type Format = (typeof VALID_FORMATS)[number]

const REPORT_CATALOG = [
  { id: 'compliance-ejecutivo', label: 'Reporte Ejecutivo de Compliance', formats: ['PDF', 'XLSX', 'BOTH'] as Format[] },
  { id: 'sst-anual', label: 'Informe Anual de SST', formats: ['PDF', 'XLSX', 'BOTH'] as Format[] },
  { id: 'workers', label: 'Trabajadores por régimen', formats: ['XLSX'] as Format[] },
  { id: 'contracts', label: 'Contratos vigentes', formats: ['XLSX'] as Format[] },
  { id: 'alerts', label: 'Alertas activas', formats: ['XLSX'] as Format[] },
]

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const reports = await prisma.scheduledReport.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ reports, catalog: REPORT_CATALOG })
})

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: {
    reportType?: string
    cronExpression?: string
    recipients?: string[]
    format?: string
    params?: Record<string, unknown>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const reportType = body.reportType
  const cronExpression = body.cronExpression?.trim() ?? ''
  const recipients = Array.isArray(body.recipients) ? body.recipients.filter((r) => typeof r === 'string' && r.includes('@')) : []
  const format = body.format

  if (!reportType || !VALID_REPORT_TYPES.includes(reportType as ReportType)) {
    return NextResponse.json(
      { error: `reportType inválido. Válidos: ${VALID_REPORT_TYPES.join(', ')}` },
      { status: 400 },
    )
  }
  if (!cronExpression || cronExpression.split(/\s+/).length !== 5) {
    return NextResponse.json({ error: 'cronExpression inválida (esperado: "m h d M dow")' }, { status: 400 })
  }
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Al menos un email destinatario requerido' }, { status: 400 })
  }
  if (!format || !VALID_FORMATS.includes(format as Format)) {
    return NextResponse.json(
      { error: `format inválido. Válidos: ${VALID_FORMATS.join(', ')}` },
      { status: 400 },
    )
  }

  const created = await prisma.scheduledReport.create({
    data: {
      orgId: ctx.orgId,
      reportType,
      cronExpression,
      recipients,
      format,
      params: (body.params as Prisma.InputJsonValue | undefined) ?? undefined,
      createdBy: ctx.email,
    },
  })

  return NextResponse.json({ report: created }, { status: 201 })
})
