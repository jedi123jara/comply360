import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { exportLimiter } from '@/lib/rate-limit'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/reports/generate?type=ejecutivo&start=2026-01&end=2026-04
// Returns structured data for client-side PDF generation
// =============================================

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  // Rate limit: export tier — 5 req/min per orgId
  const rl = await exportLimiter.check(req, `org:${ctx.orgId}`)
  if (!rl.success) return rl.response!

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'ejecutivo'
  const startParam = searchParams.get('start') ?? ''
  const endParam = searchParams.get('end') ?? ''

  const orgId = ctx.orgId

  // Parse date range (YYYY-MM format) — validate before passing to Date constructor
  // to avoid silent NaN dates from malformed input
  const YYYY_MM = /^\d{4}-(0[1-9]|1[0-2])$/
  const startDate = (startParam && YYYY_MM.test(startParam))
    ? new Date(`${startParam}-01T00:00:00Z`)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const endDate = (endParam && YYYY_MM.test(endParam))
    ? new Date(`${endParam}-01T00:00:00Z`)
    : new Date()
  endDate.setMonth(endDate.getMonth() + 1) // include the end month fully

  // Fetch org info
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, razonSocial: true, ruc: true, sector: true, plan: true },
  })

  if (type === 'ejecutivo') {
    const [diagnostics, workers, contracts, complaints] = await Promise.all([
      prisma.complianceDiagnostic.findMany({
        where: { orgId, createdAt: { gte: startDate, lt: endDate } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, scoreGlobal: true, type: true, totalMultaRiesgo: true, createdAt: true },
      }),
      prisma.worker.count({ where: { orgId, status: 'ACTIVE' } }),
      prisma.contract.findMany({
        where: { orgId, createdAt: { gte: startDate, lt: endDate } },
        select: { status: true, type: true },
      }),
      prisma.complaint.findMany({
        where: { orgId, createdAt: { gte: startDate, lt: endDate } },
        select: { status: true, type: true },
      }),
    ])

    const latestDiag = diagnostics[0]
    const contractsByStatus = contracts.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      type,
      period: { start: startParam, end: endParam },
      org,
      data: {
        complianceScore: latestDiag?.scoreGlobal ?? null,
        multaPotencial: latestDiag?.totalMultaRiesgo ? Number(latestDiag.totalMultaRiesgo) : null,
        diagnosticHistory: diagnostics.map(d => ({
          date: d.createdAt.toISOString().split('T')[0],
          type: d.type,
          score: d.scoreGlobal,
          multa: d.totalMultaRiesgo ? Number(d.totalMultaRiesgo) : 0,
        })),
        activeWorkers: workers,
        contractsByStatus,
        complaints: {
          total: complaints.length,
          resolved: complaints.filter(c => c.status === 'RESOLVED').length,
          pending: complaints.filter(c => c.status !== 'RESOLVED').length,
        },
      },
    })
  }

  if (type === 'nomina') {
    const calculations = await prisma.calculation.findMany({
      where: { orgId, createdAt: { gte: startDate, lt: endDate } },
      select: {
        id: true,
        type: true,
        resultJson: true,
        totalAmount: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const byType = calculations.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      type,
      period: { start: startParam, end: endParam },
      org,
      data: {
        totalCalculations: calculations.length,
        byType,
        recentCalculations: calculations.slice(0, 50).map(c => ({
          id: c.id,
          type: c.type,
          workerName: (c.user?.firstName || c.user?.lastName)
            ? `${c.user.firstName ?? ''} ${c.user.lastName ?? ''}`.trim()
            : 'General',
          date: c.createdAt.toISOString().split('T')[0],
          total: c.totalAmount ? Number(c.totalAmount) : null,
        })),
      },
    })
  }

  if (type === 'contratos') {
    const contracts = await prisma.contract.findMany({
      where: { orgId, createdAt: { gte: startDate, lt: endDate } },
      select: {
        title: true,
        type: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const expiringSoon = contracts.filter(c => {
      if (!c.expiresAt) return false
      const daysUntil = (new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      return daysUntil > 0 && daysUntil <= 30
    })

    return NextResponse.json({
      type,
      period: { start: startParam, end: endParam },
      org,
      data: {
        total: contracts.length,
        expiringSoon: expiringSoon.length,
        contracts: contracts.map(c => ({
          title: c.title,
          type: c.type,
          status: c.status,
          expiresAt: c.expiresAt?.toISOString().split('T')[0] ?? null,
          createdAt: c.createdAt.toISOString().split('T')[0],
        })),
      },
    })
  }

  if (type === 'denuncias') {
    const complaints = await prisma.complaint.findMany({
      where: { orgId, createdAt: { gte: startDate, lt: endDate } },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const resolved = complaints.filter(c => c.resolvedAt)
    const avgResolutionDays = resolved.length > 0
      ? Math.round(resolved.reduce((sum, c) =>
          sum + (new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24),
          0) / resolved.length)
      : 0

    return NextResponse.json({
      type,
      period: { start: startParam, end: endParam },
      org,
      data: {
        total: complaints.length,
        resolved: resolved.length,
        pending: complaints.filter(c => c.status !== 'RESOLVED').length,
        avgResolutionDays,
        byType: complaints.reduce((acc, c) => {
          acc[c.type] = (acc[c.type] ?? 0) + 1
          return acc
        }, {} as Record<string, number>),
      },
    })
  }

  if (type === 'sst') {
    const [sstRecords, workers] = await Promise.all([
      prisma.sstRecord.findMany({
        where: { orgId, createdAt: { gte: startDate, lt: endDate } },
        select: { type: true, status: true, description: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.worker.count({ where: { orgId, status: 'ACTIVE' } }),
    ])

    return NextResponse.json({
      type,
      period: { start: startParam, end: endParam },
      org,
      data: {
        totalRecords: sstRecords.length,
        activeWorkers: workers,
        completed: sstRecords.filter(r => r.status === 'COMPLETED').length,
        pending: sstRecords.filter(r => r.status === 'PENDING').length,
        overdue: sstRecords.filter(r => r.status === 'OVERDUE').length,
        byType: sstRecords.reduce((acc, r) => {
          acc[r.type] = (acc[r.type] ?? 0) + 1
          return acc
        }, {} as Record<string, number>),
      },
    })
  }

  if (type === 'sunafil') {
    const workers = await prisma.worker.findMany({
      where: { orgId, status: 'ACTIVE' },
      select: {
        firstName: true,
        lastName: true,
        dni: true,
        position: true,
        tipoContrato: true,
        fechaIngreso: true,
        documents: { select: { id: true } },
      },
      orderBy: { lastName: 'asc' },
    })

    return NextResponse.json({
      type,
      period: { start: startParam, end: endParam },
      org,
      data: {
        totalWorkers: workers.length,
        workers: workers.map(w => ({
          name: `${w.firstName} ${w.lastName}`,
          dni: w.dni,
          cargo: w.position ?? '',
          tipoContrato: w.tipoContrato,
          fechaIngreso: w.fechaIngreso?.toISOString().split('T')[0] ?? null,
          documents: w.documents.length,
        })),
      },
    })
  }

  return NextResponse.json({ error: `Tipo de reporte no reconocido: ${type}` }, { status: 400 })
})
