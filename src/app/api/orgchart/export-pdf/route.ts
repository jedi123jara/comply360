import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { exportOrgChartPdf } from '@/lib/orgchart/export-pdf'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  const asOfStr = req.nextUrl.searchParams.get('asOf')
  const asOf = asOfStr ? new Date(asOfStr) : null
  if (asOfStr && Number.isNaN(asOf!.getTime())) {
    return NextResponse.json({ error: 'asOf inválido' }, { status: 400 })
  }

  const result = await exportOrgChartPdf(ctx.orgId, asOf)

  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'orgchart.export_pdf',
      metadataJson: { fileName: result.fileName, asOf: asOf?.toISOString() ?? null } as object,
    },
  }).catch(() => {})

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
})
