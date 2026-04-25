/**
 * PATCH  /api/scheduled-reports/[id]  — Toggle active / update recipients / cron / format.
 * DELETE /api/scheduled-reports/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import type { AuthContext } from '@/lib/auth'
import type { Prisma } from '@/generated/prisma/client'

export const PATCH = withAuthParams<{ id: string }>(async (
  req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  const existing = await prisma.scheduledReport.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Reporte programado no encontrado' }, { status: 404 })
  }

  let body: {
    active?: boolean
    recipients?: string[]
    cronExpression?: string
    format?: string
    params?: Record<string, unknown>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const data: Prisma.ScheduledReportUpdateInput = {}
  if (typeof body.active === 'boolean') data.active = body.active
  if (Array.isArray(body.recipients)) {
    const filtered = body.recipients.filter((r) => typeof r === 'string' && r.includes('@'))
    if (filtered.length > 0) data.recipients = filtered
  }
  if (typeof body.cronExpression === 'string' && body.cronExpression.split(/\s+/).length === 5) {
    data.cronExpression = body.cronExpression
  }
  if (typeof body.format === 'string' && ['PDF', 'XLSX', 'BOTH'].includes(body.format)) {
    data.format = body.format
  }
  if (body.params !== undefined) {
    data.params = body.params as Prisma.InputJsonValue
  }

  const updated = await prisma.scheduledReport.update({
    where: { id: params.id },
    data,
  })
  return NextResponse.json({ report: updated })
})

export const DELETE = withAuthParams<{ id: string }>(async (
  _req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  const existing = await prisma.scheduledReport.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Reporte programado no encontrado' }, { status: 404 })
  }
  await prisma.scheduledReport.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
})
