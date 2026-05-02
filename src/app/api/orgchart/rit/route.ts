import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { generateOrgChartRitDocx, RitOrganizationNotFoundError } from '@/lib/orgchart/rit-docx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  const asOfStr = req.nextUrl.searchParams.get('asOf')
  const asOf = asOfStr ? new Date(asOfStr) : null
  if (asOfStr && Number.isNaN(asOf!.getTime())) {
    return NextResponse.json({ error: 'asOf invalido' }, { status: 400 })
  }

  try {
    const doc = await generateOrgChartRitDocx(ctx.orgId, asOf)

    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'orgchart.rit_downloaded',
        entityType: 'OrgChart',
        metadataJson: { fileName: doc.fileName, asOf: doc.asOf } as object,
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
    if (error instanceof RitOrganizationNotFoundError) {
      return NextResponse.json({ error: 'Organizacion no encontrada' }, { status: 404 })
    }
    throw error
  }
})
