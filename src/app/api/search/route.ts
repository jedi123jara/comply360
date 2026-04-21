import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

/**
 * GET /api/search?q=...&limit=12
 *
 * Unified full-text-ish search across the three entities the Command Palette
 * can open: workers, contracts, documents. Returns a flat array with enough
 * info for the palette to render + navigate.
 *
 * Scope: always filtered by `ctx.orgId` (multi-tenant safe).
 * Ranking: simple — workers first, then contracts, then documents.
 * Matches are case-insensitive substring on the most relevant columns.
 */

type Hit = {
  id: string
  kind: 'worker' | 'contract' | 'document'
  label: string
  sublabel?: string
  href: string
}

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  const limit = Math.min(24, Math.max(1, parseInt(searchParams.get('limit') ?? '12', 10)))

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const orgId = ctx.orgId

  // Split limit across the three entity types. Workers are the primary target
  // so they get the largest slice; documents the smallest.
  const workerLimit = Math.ceil(limit * 0.5)
  const contractLimit = Math.ceil(limit * 0.3)
  const documentLimit = Math.max(1, limit - workerLimit - contractLimit)

  const [workers, contracts, documents] = await Promise.all([
    prisma.worker.findMany({
      where: {
        orgId,
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { dni: { contains: q } },
          { position: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: workerLimit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dni: true,
        position: true,
        status: true,
      },
    }),
    prisma.contract.findMany({
      where: {
        orgId,
        title: { contains: q, mode: 'insensitive' },
      },
      take: contractLimit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
      },
    }),
    prisma.orgDocument.findMany({
      where: {
        orgId,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: documentLimit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
      },
    }),
  ])

  const results: Hit[] = [
    ...workers.map<Hit>((w) => ({
      id: w.id,
      kind: 'worker',
      label:
        `${w.lastName ?? ''} ${w.firstName ?? ''}`.trim() ||
        `DNI ${w.dni}`,
      sublabel: [w.dni, w.position ?? undefined].filter(Boolean).join(' · '),
      href: `/dashboard/trabajadores/${w.id}`,
    })),
    ...contracts.map<Hit>((c) => ({
      id: c.id,
      kind: 'contract',
      label: c.title,
      sublabel: [c.type, c.status].filter(Boolean).join(' · '),
      href: `/dashboard/contratos/${c.id}`,
    })),
    ...documents.map<Hit>((d) => ({
      id: d.id,
      kind: 'document',
      label: d.title ?? 'Documento',
      sublabel: d.type ?? undefined,
      href: `/dashboard/documentos/${d.id}`,
    })),
  ]

  return NextResponse.json({ results })
})
