import { NextResponse } from 'next/server'
import { withRoleParams } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { generatePositionMofDocx, MofPositionNotFoundError } from '@/lib/orgchart/mof-docx'

export const runtime = 'nodejs'

export const GET = withRoleParams<{ id: string }>('MEMBER', async (_req, ctx, params) => {
  try {
    const doc = await generatePositionMofDocx(ctx.orgId, params.id)

    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'orgchart.position.mof_downloaded',
        entityType: 'OrgPosition',
        entityId: doc.positionId,
        metadataJson: { title: doc.title } as object,
      },
    }).catch(() => {})

    return new NextResponse(new Uint8Array(doc.buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${doc.fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof MofPositionNotFoundError) {
      return NextResponse.json({ error: 'Cargo no encontrado' }, { status: 404 })
    }
    throw error
  }
})
