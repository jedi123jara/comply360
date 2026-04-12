import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { listTemplates, getTemplate, type IndustrySlug } from '@/lib/agents/templates'

export const runtime = 'nodejs'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const agentSlug = searchParams.get('agentSlug') || undefined
  const slug = searchParams.get('slug') as IndustrySlug | null

  if (slug) {
    const template = getTemplate(slug)
    if (!template) {
      return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 })
    }
    return NextResponse.json({ template })
  }

  return NextResponse.json({ templates: listTemplates(agentSlug) })
})
