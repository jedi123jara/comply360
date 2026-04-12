import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { NormCategory, NormSource, ImpactLevel, RegimenLaboral } from '@/generated/prisma/client'
import { NORM_UPDATES_SEED } from '@/lib/crawler/norm-seed'
import { withAuth } from '@/lib/api-auth'

// GET /api/norm-updates — List norm updates
export const GET = withAuth(async (req, ctx) => {
  const searchParams = req.nextUrl.searchParams
  const category = searchParams.get('category') as NormCategory | null
  const impactLevel = searchParams.get('impactLevel') as ImpactLevel | null
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (impactLevel) where.impactLevel = impactLevel

    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const [updates, stats, latestNorm] = await Promise.all([
      prisma.normUpdate.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: limit,
      }),
      Promise.all([
        prisma.normUpdate.count(),
        prisma.normUpdate.count({ where: { impactLevel: 'CRITICAL' } }),
        prisma.normUpdate.count({ where: { impactLevel: 'HIGH' } }),
        prisma.normUpdate.count({ where: { actionDeadline: { gte: new Date() } } }),
        prisma.normUpdate.count({ where: { publishedAt: { gte: oneMonthAgo } } }),
        prisma.normUpdate.count({ where: { affectedModules: { isEmpty: false } } }),
      ]),
      prisma.normUpdate.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    ])

    const [total, critical, high, withDeadline, updatesThisMonth, impactingNormas] = stats

    return NextResponse.json({
      updates,
      stats: { total, critical, high, withDeadline },
      // Top-level fields consumed by the normas dashboard page
      totalNormas: total,
      totalCritical: critical,
      totalImpacted: high + critical,
      lastUpdated: latestNorm?.updatedAt ?? null,
      updatesThisMonth,
      impactingNormas,
      complianceScore: total > 0 ? Math.max(60, Math.round(100 - (critical / total) * 40)) : 100,
    })
  } catch (error) {
    console.error('Norm updates GET error:', error)
    return NextResponse.json({ error: 'Error al obtener actualizaciones' }, { status: 500 })
  }
})

// POST /api/norm-updates — Seed norm updates or add manual entry
export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'seed') {
      let created = 0
      for (const norm of NORM_UPDATES_SEED) {
        const existing = await prisma.normUpdate.findUnique({ where: { externalId: norm.externalId } })
        if (existing) continue

        await prisma.normUpdate.create({
          data: {
            externalId: norm.externalId,
            normCode: norm.normCode,
            title: norm.title,
            summary: norm.summary,
            category: norm.category as NormCategory,
            source: norm.source as NormSource,
            publishedAt: new Date(norm.publishedAt),
            effectiveAt: norm.effectiveAt ? new Date(norm.effectiveAt) : null,
            sourceUrl: norm.sourceUrl,
            impactAnalysis: norm.impactAnalysis,
            impactLevel: norm.impactLevel as ImpactLevel,
            affectedModules: norm.affectedModules,
            affectedRegimens: norm.affectedRegimens as RegimenLaboral[],
            actionRequired: norm.actionRequired,
            actionDeadline: norm.actionDeadline ? new Date(norm.actionDeadline) : null,
            isProcessed: true,
          },
        })
        created++
      }
      return NextResponse.json({ message: `${created} normas cargadas`, total: NORM_UPDATES_SEED.length })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (error) {
    console.error('Norm updates POST error:', error)
    return NextResponse.json({ error: 'Error en operacion' }, { status: 500 })
  }
})
