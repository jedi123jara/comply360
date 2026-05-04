import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { createContractWithSideEffects } from '@/lib/contracts/create'

// =============================================
// GET /api/contracts - List contracts from DB
// Query params:
//   search, status, type        — filters
//   page, limit                 — pagination
//   stats=1                     — return org-wide aggregate stats
//   expiringSoonDays=N          — filter contracts expiring in next N days
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = ctx.orgId

    // ── Aggregate stats mode ──────────────────────────────────────
    if (searchParams.get('stats') === '1') {
      const now = new Date()
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const [statusGroups, typeGroups, expiringCount, withoutReviewCount] = await Promise.all([
        prisma.contract.groupBy({
          by: ['status'],
          where: { orgId },
          _count: { id: true },
        }),
        prisma.contract.groupBy({
          by: ['type'],
          where: { orgId, status: { not: 'ARCHIVED' } },
          _count: { id: true },
        }),
        prisma.contract.count({
          where: {
            orgId,
            status: { in: ['SIGNED', 'APPROVED', 'IN_REVIEW'] },
            expiresAt: { gte: now, lte: in30Days },
          },
        }),
        prisma.contract.count({
          where: { orgId, status: { not: 'ARCHIVED' }, aiRiskScore: null },
        }),
      ])

      const byStatus = Object.fromEntries(statusGroups.map(g => [g.status, g._count.id]))
      const byType = Object.fromEntries(typeGroups.map(g => [g.type, g._count.id]))

      return NextResponse.json({
        byStatus: {
          DRAFT: byStatus['DRAFT'] ?? 0,
          IN_REVIEW: byStatus['IN_REVIEW'] ?? 0,
          APPROVED: byStatus['APPROVED'] ?? 0,
          SIGNED: byStatus['SIGNED'] ?? 0,
          EXPIRED: byStatus['EXPIRED'] ?? 0,
          ARCHIVED: byStatus['ARCHIVED'] ?? 0,
        },
        byType,
        expiringIn30Days: expiringCount,
        withoutAiReview: withoutReviewCount,
        totalActive: (byStatus['DRAFT'] ?? 0) + (byStatus['IN_REVIEW'] ?? 0) +
          (byStatus['APPROVED'] ?? 0) + (byStatus['SIGNED'] ?? 0),
      })
    }

    // ── List mode ─────────────────────────────────────────────────
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const workerId = searchParams.get('workerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const expiringSoonDays = searchParams.get('expiringSoonDays')

    const now = new Date()
    const where = {
      orgId,
      ...(status ? { status: status as 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SIGNED' | 'EXPIRED' | 'ARCHIVED' } : {}),
      ...(type ? { type: type as 'LABORAL_INDEFINIDO' } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
      ...(workerId
        ? { workerContracts: { some: { workerId } } }
        : {}),
      ...(expiringSoonDays
        ? {
            expiresAt: {
              gte: now,
              lte: new Date(now.getTime() + parseInt(expiringSoonDays) * 24 * 60 * 60 * 1000),
            },
          }
        : {}),
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          status: true,
          title: true,
          aiRiskScore: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: { firstName: true, lastName: true },
          },
          // Include first linked worker for display
          workerContracts: {
            take: 1,
            select: {
              worker: {
                select: { id: true, firstName: true, lastName: true, dni: true, position: true },
              },
            },
          },
        },
      }),
      prisma.contract.count({ where }),
    ])

    return NextResponse.json({
      data: contracts.map(c => ({
        ...c,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        // Flatten first linked worker for easy consumption
        worker: c.workerContracts[0]?.worker ?? null,
        workerContracts: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
  }
})

// =============================================
// POST /api/contracts - Create contract
// =============================================
const VALID_CONTRACT_TYPES = new Set<string>([
  'LABORAL_INDEFINIDO',
  'LABORAL_PLAZO_FIJO',
  'LABORAL_TIEMPO_PARCIAL',
  'LOCACION_SERVICIOS',
  'CONFIDENCIALIDAD',
  'NO_COMPETENCIA',
  'POLITICA_HOSTIGAMIENTO',
  'POLITICA_SST',
  'REGLAMENTO_INTERNO',
  'ADDENDUM',
  'CONVENIO_PRACTICAS',
  'CUSTOM',
])

type PrismaContractType =
  | 'LABORAL_INDEFINIDO'
  | 'LABORAL_PLAZO_FIJO'
  | 'LABORAL_TIEMPO_PARCIAL'
  | 'LOCACION_SERVICIOS'
  | 'CONFIDENCIALIDAD'
  | 'NO_COMPETENCIA'
  | 'POLITICA_HOSTIGAMIENTO'
  | 'POLITICA_SST'
  | 'REGLAMENTO_INTERNO'
  | 'ADDENDUM'
  | 'CONVENIO_PRACTICAS'
  | 'CUSTOM'

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const { templateId, type, title, formData, contentHtml, contentJson, provenance, sourceKind, expiresAt } = body

    if (!type || !title) {
      return NextResponse.json(
        { error: 'type and title are required' },
        { status: 400 }
      )
    }

    if (!VALID_CONTRACT_TYPES.has(String(type))) {
      return NextResponse.json(
        { error: `Invalid contract type: ${type}`, validTypes: Array.from(VALID_CONTRACT_TYPES) },
        { status: 400 },
      )
    }
    const normalizedType = String(type) as PrismaContractType

    const { contract } = await createContractWithSideEffects({
      orgId: ctx.orgId,
      userId: ctx.userId,
      templateId: templateId || null,
      type: normalizedType,
      title,
      formData: formData && typeof formData === 'object' ? formData : null,
      contentHtml: typeof contentHtml === 'string' ? contentHtml : null,
      contentJson: contentJson ?? null,
      sourceKind,
      provenance,
      expiresAt: expiresAt ?? null,
    })

    return NextResponse.json({ data: contract }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/contracts] Error creating contract:', error)
    // En desarrollo, exponemos el mensaje real para facilitar el debug
    const message =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : 'Failed to create contract'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
