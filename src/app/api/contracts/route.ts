import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { syncComplianceScore } from '@/lib/compliance/sync-score'
import { recalculateLegajoScore } from '@/lib/compliance/legajo-config'

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
    const { templateId, type, title, formData, contentHtml, contentJson } = body

    if (!type || !title) {
      return NextResponse.json(
        { error: 'type and title are required' },
        { status: 400 }
      )
    }

    const normalizedType = VALID_CONTRACT_TYPES.has(String(type))
      ? (String(type) as PrismaContractType)
      : ('CUSTOM' as PrismaContractType)

    const orgId = ctx.orgId
    let userId = ctx.userId

    // Verificar que el userId efectivamente existe en la tabla users (evita FK violation)
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!userExists) {
      const fallbackUser = await prisma.user.findFirst({
        where: { orgId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
      if (!fallbackUser) {
        return NextResponse.json(
          { error: 'Usuario no encontrado. Vuelve a iniciar sesión.' },
          { status: 401 }
        )
      }
      userId = fallbackUser.id
    }

    const contract = await prisma.contract.create({
      data: {
        orgId,
        createdById: userId,
        templateId: templateId || null,
        type: normalizedType,
        status: 'DRAFT',
        title,
        formData: formData || null,
        contentHtml: typeof contentHtml === 'string' ? contentHtml : null,
        contentJson: contentJson ?? null,
      },
    })

    // ──────────────────────────────────────────────────────────
    // Auto-create Worker from contract formData when the contract
    // is a labor type and has DNI + name in formData.
    // Silently skips if worker already exists (unique [orgId, dni]).
    // ──────────────────────────────────────────────────────────
    const LABOR_TYPES = new Set([
      'LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO', 'LABORAL_TIEMPO_PARCIAL',
      'CONVENIO_PRACTICAS',
    ])

    if (LABOR_TYPES.has(normalizedType) && formData && typeof formData === 'object') {
      const fd = formData as Record<string, unknown>
      const dniRaw = String(fd.trabajador_dni ?? '').trim().replace(/\D/g, '')
      const nombreRaw = String(fd.trabajador_nombre ?? '').trim()

      if (dniRaw.length >= 8 && nombreRaw.length > 0) {
        try {
          // Parse nombre → firstName / lastName
          // Supports "APELLIDO APELLIDO, NOMBRE NOMBRE" or "NOMBRE APELLIDO"
          let firstName = ''
          let lastName = ''
          if (nombreRaw.includes(',')) {
            const [last, first] = nombreRaw.split(',').map(s => s.trim())
            lastName = last
            firstName = first
          } else {
            const parts = nombreRaw.split(' ')
            firstName = parts[0] ?? ''
            lastName = parts.slice(1).join(' ') || parts[0]
          }

          // Detect regimenLaboral from contract type
          const regimen =
            normalizedType === 'CONVENIO_PRACTICAS' ? ('MODALIDAD_FORMATIVA' as const)
            : ('GENERAL' as const)

          // Map contract type to tipoContrato
          const tipoContrato =
            normalizedType === 'LABORAL_PLAZO_FIJO' ? ('PLAZO_FIJO' as const)
            : normalizedType === 'LABORAL_TIEMPO_PARCIAL' ? ('TIEMPO_PARCIAL' as const)
            : normalizedType === 'CONVENIO_PRACTICAS' ? ('OBRA_DETERMINADA' as const)
            : ('INDEFINIDO' as const)

          const fechaIngreso = fd.fecha_inicio
            ? new Date(String(fd.fecha_inicio))
            : new Date()
          const sueldoBruto = fd.remuneracion ? Number(fd.remuneracion) : 0

          // Upsert worker — if same DNI already exists in org, update position/salary
          const worker = await prisma.worker.upsert({
            where: { orgId_dni: { orgId, dni: dniRaw } },
            create: {
              orgId,
              dni: dniRaw,
              firstName,
              lastName,
              position: fd.cargo ? String(fd.cargo) : null,
              regimenLaboral: regimen,
              tipoContrato,
              fechaIngreso,
              sueldoBruto,
              status: 'ACTIVE',
              legajoScore: 0,
            },
            update: {
              // Update position/salary if they changed
              ...(fd.cargo ? { position: String(fd.cargo) } : {}),
              ...(fd.remuneracion ? { sueldoBruto } : {}),
            },
            select: { id: true },
          })

          // Link contract to worker (idempotent)
          await prisma.workerContract.upsert({
            where: { workerId_contractId: { workerId: worker.id, contractId: contract.id } },
            create: { workerId: worker.id, contractId: contract.id },
            update: {},
          })

          // Upsert WorkerDocument contrato_trabajo → VERIFIED
          const existingDoc = await prisma.workerDocument.findFirst({
            where: { workerId: worker.id, documentType: 'contrato_trabajo' },
            select: { id: true },
          })
          if (!existingDoc) {
            await prisma.workerDocument.create({
              data: {
                workerId: worker.id,
                category: 'INGRESO',
                documentType: 'contrato_trabajo',
                title,
                isRequired: true,
                status: 'VERIFIED',
                verifiedAt: new Date(),
                verifiedBy: userId,
              },
            })
          }

          // Recalculate legajoScore using shared utility
          await recalculateLegajoScore(worker.id)

        } catch (workerErr) {
          // Non-fatal — contract was already saved, just log
          console.warn('[POST /api/contracts] Auto-worker creation failed (non-fatal):', workerErr)
        }
      }
    }

    // Fire-and-forget compliance score recalculation
    syncComplianceScore(orgId).catch(() => {})

    // Auto-trigger AI review for labor contracts with content
    const AI_LABOR_TYPES = ['LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO', 'LABORAL_TIEMPO_PARCIAL']
    if (AI_LABOR_TYPES.includes(normalizedType) && contentHtml) {
      import('@/lib/ai/contract-review').then(async ({ reviewContract }) => {
        try {
          const review = await reviewContract({ contractHtml: contentHtml, contractType: normalizedType })
          await prisma.contract.update({
            where: { id: contract.id },
            data: { aiRiskScore: review.overallScore },
          })
        } catch (err) {
          console.warn('[AI Review] Auto-trigger failed:', err)
        }
      }).catch(() => {})
    }

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
