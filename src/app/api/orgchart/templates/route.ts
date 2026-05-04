import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import {
  applyOrgTemplate,
  OrgTemplateNotFoundError,
  previewOrgTemplate,
  recommendOrgTemplates,
} from '@/lib/orgchart/templates'
import { requestIp } from '@/lib/orgchart/change-log'
import { takeSnapshot } from '@/lib/orgchart/snapshot-service'

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  const templateId = req.nextUrl.searchParams.get('templateId')
  if (!templateId) {
    const templates = await recommendOrgTemplates(ctx.orgId)
    return NextResponse.json({ templates })
  }

  try {
    const preview = await previewOrgTemplate(ctx.orgId, templateId)
    return NextResponse.json(preview)
  } catch (error) {
    if (error instanceof OrgTemplateNotFoundError) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }
    throw error
  }
})

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const templateId = typeof body?.templateId === 'string' ? body.templateId : null
  if (!templateId) {
    return NextResponse.json({ error: 'templateId es requerido' }, { status: 400 })
  }

  try {
    const result = await applyOrgTemplate(ctx.orgId, templateId, {
      userId: ctx.userId,
      ipAddress: requestIp(req.headers),
    })

    await takeSnapshot(ctx.orgId, {
      label: `Plantilla organizacional - ${result.template.name}`.slice(0, 120),
      reason: 'Snapshot automático posterior a aplicación de plantilla organizacional',
      takenById: ctx.userId,
      isAuto: true,
    }).catch(() => {})

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof OrgTemplateNotFoundError) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }
    throw error
  }
})
