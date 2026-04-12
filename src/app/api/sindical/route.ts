import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import type { SindicalRecordType } from '@/generated/prisma/client'

// =============================================
// GET /api/sindical - List sindical records
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') as SindicalRecordType | null

  const where = {
    orgId,
    ...(type ? { type } : {}),
  }

  const records = await prisma.sindicalRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  // Compute stats
  const total = records.length
  const byStype = records.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const hasUnion = records.some((r) => r.type === 'SINDICATO' && r.status === 'ACTIVE')
  const activeConvenio = records.find((r) => r.type === 'CONVENIO_COLECTIVO' && r.status === 'ACTIVE')
  const activePliegos = records.filter((r) => r.type === 'PLIEGO_RECLAMOS' && r.status === 'ACTIVE')
  const fueroWorkers = records.filter((r) => r.type === 'FUERO_SINDICAL' && r.status === 'ACTIVE')
  const activeHuelgas = records.filter((r) => r.type === 'HUELGA' && r.status === 'ACTIVE')

  return NextResponse.json({
    data: {
      stats: {
        total,
        byStype,
        hasUnion,
        activeConvenio: activeConvenio
          ? { title: activeConvenio.title, endDate: activeConvenio.endDate }
          : null,
        activePliegos: activePliegos.length,
        fueroWorkers: fueroWorkers.length,
        activeHuelgas: activeHuelgas.length,
      },
      records: records.map((r) => ({
        ...r,
        startDate: r.startDate?.toISOString() || null,
        endDate: r.endDate?.toISOString() || null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      baseLegal: {
        sindicato: 'D.S. 010-2003-TR — TUO LRCT',
        convenio: 'D.S. 010-2003-TR, Art. 41 — Convenio Colectivo',
        negociacion: 'D.S. 010-2003-TR, Art. 51 — Negociacion Colectiva',
        fuero: 'D.S. 010-2003-TR, Art. 31 — Fuero Sindical',
        huelga: 'D.S. 010-2003-TR, Art. 72 — Huelga',
      },
    },
  })
})

// =============================================
// POST /api/sindical - Create a sindical record
// =============================================
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const body = await req.json()

  const { type, title, description, data, startDate, endDate, status } = body

  if (!type || !title) {
    return NextResponse.json({ error: 'type and title are required' }, { status: 400 })
  }

  const VALID_TYPES: SindicalRecordType[] = [
    'SINDICATO',
    'CONVENIO_COLECTIVO',
    'NEGOCIACION',
    'PLIEGO_RECLAMOS',
    'FUERO_SINDICAL',
    'HUELGA',
  ]

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const record = await prisma.sindicalRecord.create({
    data: {
      orgId,
      type: type as SindicalRecordType,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      data: data || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: status || 'ACTIVE',
    },
  })

  return NextResponse.json(
    {
      data: {
        ...record,
        startDate: record.startDate?.toISOString() || null,
        endDate: record.endDate?.toISOString() || null,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    },
    { status: 201 }
  )
})
