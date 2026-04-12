import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { INTEGRATIONS, listStatuses, getIntegration, checkIntegrationStatus } from '@/lib/integrations/catalog'

export const runtime = 'nodejs'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (slug) {
    const def = getIntegration(slug)
    if (!def) return NextResponse.json({ error: 'Integración no encontrada' }, { status: 404 })
    return NextResponse.json({
      definition: def,
      status: checkIntegrationStatus(slug),
    })
  }
  return NextResponse.json({
    integrations: INTEGRATIONS,
    statuses: listStatuses(),
  })
})
