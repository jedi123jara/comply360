import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withWorkerAuth(async (_req, ctx) => {
  const docs = await prisma.orgDocument.findMany({
    where: {
      orgId: ctx.orgId,
      isPublishedToWorkers: true,
      OR: [
        { validUntil: null },
        { validUntil: { gte: new Date() } },
      ],
    },
    orderBy: [{ type: 'asc' }, { publishedAt: 'desc' }],
  })

  return NextResponse.json({
    documents: docs.map((d) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      description: d.description,
      fileUrl: d.fileUrl,
      version: d.version,
      publishedAt: d.publishedAt?.toISOString() || null,
      validUntil: d.validUntil?.toISOString() || null,
    })),
  })
})
