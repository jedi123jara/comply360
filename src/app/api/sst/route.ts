import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { SstRecordType, SstStatus } from '@/generated/prisma/client'

// =============================================
// GET /api/sst — List SST records
// =============================================
export const GET = withAuth(async (req, ctx) => {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = ctx.orgId
    const type = searchParams.get('type') as SstRecordType | null
    const status = searchParams.get('status') as SstStatus | null

    const where: Record<string, unknown> = { orgId }
    if (type) where.type = type
    if (status) where.status = status

    const [records, counts] = await Promise.all([
      prisma.sstRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.sstRecord.groupBy({
        by: ['type'],
        where: { orgId },
        _count: true,
      }),
    ])

    // Stats
    const totalRecords = await prisma.sstRecord.count({ where: { orgId } })
    const completed = await prisma.sstRecord.count({ where: { orgId, status: 'COMPLETED' } })
    const overdue = await prisma.sstRecord.count({ where: { orgId, status: 'OVERDUE' } })
    const pending = await prisma.sstRecord.count({ where: { orgId, status: 'PENDING' } })

    return NextResponse.json({
      records,
      stats: { totalRecords, completed, overdue, pending },
      countsByType: counts.reduce((acc, c) => { acc[c.type] = c._count; return acc }, {} as Record<string, number>),
    })
  } catch (error) {
    console.error('SST GET error:', error)
    return NextResponse.json({ error: 'Failed to load SST records' }, { status: 500 })
  }
})

// =============================================
// POST /api/sst — Create SST record
// =============================================
export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json()
    const { type, title, description, data, responsibleId, dueDate } = body
    const orgId = ctx.orgId

    if (!type || !title) {
      return NextResponse.json({ error: 'type and title are required' }, { status: 400 })
    }

    const record = await prisma.sstRecord.create({
      data: {
        orgId,
        type: type as SstRecordType,
        title,
        description: description || null,
        data: data || null,
        responsibleId: responsibleId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'PENDING',
      },
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error('SST POST error:', error)
    return NextResponse.json({ error: 'Failed to create SST record' }, { status: 500 })
  }
})

// =============================================
// PUT /api/sst — Update SST record
// =============================================
export const PUT = withAuth(async (req, ctx) => {
  try {
    const body = await req.json()
    const { id, status, title, description, data, completedAt } = body
    const orgId = ctx.orgId

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Verify record belongs to this org before updating (prevents IDOR)
    const existing = await prisma.sstRecord.findFirst({ where: { id, orgId } })
    if (!existing) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status as SstStatus
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (data !== undefined) updateData.data = data
    // Set completedAt when status becomes COMPLETED, clear it otherwise
    if (status === 'COMPLETED') {
      updateData.completedAt = completedAt ? new Date(completedAt) : new Date()
    } else if (status && status !== 'COMPLETED') {
      updateData.completedAt = null
    }

    const record = await prisma.sstRecord.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error('SST PUT error:', error)
    return NextResponse.json({ error: 'Failed to update SST record' }, { status: 500 })
  }
})
