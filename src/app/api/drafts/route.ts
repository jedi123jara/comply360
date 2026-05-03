import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  if (!key) {
    return NextResponse.json({ error: 'Missing key param' }, { status: 400 })
  }

  const draft = await prisma.userDraft.findUnique({
    where: {
      userId_orgId_key: {
        userId: ctx.userId,
        orgId: ctx.orgId,
        key
      }
    }
  })

  if (!draft) {
    return NextResponse.json({ data: null })
  }

  if (draft.expiresAt < new Date()) {
    await prisma.userDraft.delete({ where: { id: draft.id } })
    return NextResponse.json({ data: null })
  }

  return NextResponse.json({ data: draft.data, savedAt: draft.updatedAt })
})

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json()
  const { key, data, ttlDays = 7 } = body

  if (!key) {
    return NextResponse.json({ error: 'Missing key param' }, { status: 400 })
  }

  if (data === null || data === undefined) {
    await prisma.userDraft.deleteMany({
      where: {
        userId: ctx.userId,
        orgId: ctx.orgId,
        key
      }
    })
    return NextResponse.json({ success: true })
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + ttlDays)

  const draft = await prisma.userDraft.upsert({
    where: {
      userId_orgId_key: {
        userId: ctx.userId,
        orgId: ctx.orgId,
        key
      }
    },
    update: {
      data,
      expiresAt
    },
    create: {
      userId: ctx.userId,
      orgId: ctx.orgId,
      key,
      data,
      expiresAt
    }
  })

  return NextResponse.json({ data: draft.data, savedAt: draft.updatedAt })
})
