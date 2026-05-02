import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getTree } from '@/lib/orgchart/tree-service'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const asOfStr = searchParams.get('asOf')
  const asOf = asOfStr ? new Date(asOfStr) : null
  if (asOfStr && isNaN(asOf!.getTime())) {
    return NextResponse.json({ error: 'asOf inválido' }, { status: 400 })
  }
  const tree = await getTree(ctx.orgId, asOf)
  return NextResponse.json(tree)
})
