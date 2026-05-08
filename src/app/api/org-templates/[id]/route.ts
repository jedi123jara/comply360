/**
 * GET    /api/org-templates/[id]   Obtiene un template con su contenido y mappings.
 * PATCH  /api/org-templates/[id]   Actualiza contenido/mappings (crea nueva versión).
 * DELETE /api/org-templates/[id]   Elimina el template.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRoleParams } from '@/lib/api-auth'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { planHasFeature } from '@/lib/plan-gate'
import {
  detectPlaceholders,
  isOrgTemplate,
  parseTemplate,
  serializeTemplate,
  TEMPLATE_TYPE_LABEL,
  type OrgTemplateMeta,
} from '@/lib/templates/org-template-engine'

export const runtime = 'nodejs'

async function assertPlanAccess(orgId: string): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, planExpiresAt: true },
  })
  if (!org) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Organización no encontrada', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      ),
    }
  }
  let effectivePlan = org.plan
  if (org.planExpiresAt && new Date(org.planExpiresAt) < new Date()) {
    effectivePlan = 'STARTER'
  }
  if (!planHasFeature(effectivePlan, 'ia_contratos')) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Las plantillas de contratos requieren el plan EMPRESA o superior.',
          code: 'PLAN_UPGRADE_REQUIRED',
          requiredPlan: 'EMPRESA',
          currentPlan: effectivePlan,
          upgradeUrl: '/dashboard/planes',
        },
        { status: 403 },
      ),
    }
  }
  return { ok: true }
}

// =============================================
// GET /api/org-templates/[id]
// =============================================
export const GET = withPlanGateParams<{ id: string }>('contratos', async (
  _req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  const gate = await assertPlanAccess(ctx.orgId)
  if (!gate.ok) return gate.response

  const template = await prisma.orgTemplate.findFirst({
    where: { id: params.id, orgId: ctx.orgId, active: true },
  })
  if (template) {
    const placeholders = jsonStringArray(template.placeholders)
    const mappings = jsonStringRecord(template.mappings)
    return NextResponse.json({
      data: {
        id: template.id,
        storage: 'orgTemplate',
        title: template.title,
        documentType: template.documentType,
        documentTypeLabel: TEMPLATE_TYPE_LABEL[template.documentType as keyof typeof TEMPLATE_TYPE_LABEL] ?? template.documentType,
        contractType: template.contractType ?? null,
        content: template.content,
        placeholders,
        mappings,
        notes: template.notes ?? null,
        usageCount: template.usageCount,
        version: template.version,
        validUntil: null,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    })
  }

  const doc = await prisma.orgDocument.findUnique({
    where: { id: params.id },
  })

  if (!doc || doc.orgId !== ctx.orgId || !isOrgTemplate(doc)) {
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  }

  const meta = parseTemplate(doc.description) as OrgTemplateMeta

  return NextResponse.json({
    data: {
      id: doc.id,
      storage: 'legacyOrgDocument',
      title: doc.title,
      documentType: meta.documentType,
      documentTypeLabel: TEMPLATE_TYPE_LABEL[meta.documentType] ?? meta.documentType,
      contractType: meta.contractType ?? null,
      content: meta.content,
      placeholders: meta.placeholders,
      mappings: meta.mappings ?? {},
      notes: meta.notes ?? null,
      usageCount: meta.usageCount ?? 0,
      version: doc.version,
      validUntil: doc.validUntil?.toISOString() ?? null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    },
  })
})

// =============================================
// PATCH /api/org-templates/[id]
// =============================================
export const PATCH = withPlanGateParams<{ id: string }>('contratos', async (
  req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  const gate = await assertPlanAccess(ctx.orgId)
  if (!gate.ok) return gate.response

  const template = await prisma.orgTemplate.findFirst({
    where: { id: params.id, orgId: ctx.orgId, active: true },
  })

  const doc = await prisma.orgDocument.findUnique({
    where: { id: params.id },
  })

  if (!template && (!doc || doc.orgId !== ctx.orgId || !isOrgTemplate(doc))) {
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  }

  let body: {
    title?: string
    content?: string
    mappings?: Record<string, string>
    notes?: string
    validUntil?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (template) {
    const currentContent = template.content
    let nextContent = currentContent
    let placeholders = jsonStringArray(template.placeholders)
    const updateData: {
      title?: string
      content?: string
      placeholders?: string[]
      mappings?: Record<string, string>
      notes?: string | null
      version?: number
    } = {}
    let contentChanged = false

    if (typeof body.title === 'string') {
      const title = body.title.trim()
      if (title.length < 3 || title.length > 200) {
        return NextResponse.json({ error: 'title inválido (3–200 caracteres)' }, { status: 400 })
      }
      updateData.title = title
    }

    if (typeof body.content === 'string') {
      const content = body.content.trim()
      if (content.length < 30 || content.length > 100_000) {
        return NextResponse.json(
          { error: 'content debe tener entre 30 y 100k caracteres' },
          { status: 400 },
        )
      }
      if (content !== currentContent) {
        nextContent = content
        placeholders = detectPlaceholders(content)
        updateData.content = nextContent
        updateData.placeholders = placeholders
        updateData.version = template.version + 1
        contentChanged = true
      }
    }

    if (body.mappings && typeof body.mappings === 'object') {
      updateData.mappings = sanitizeMappings(body.mappings)
    }

    if (typeof body.notes === 'string') {
      updateData.notes = body.notes.trim().slice(0, 1000) || null
    }

    const updated = await prisma.orgTemplate.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({
      data: {
        id: updated.id,
        storage: 'orgTemplate',
        title: updated.title,
        documentType: updated.documentType,
        placeholders,
        mappings: jsonStringRecord(updated.mappings),
        version: updated.version,
        contentChanged,
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  }

  const meta = parseTemplate(doc!.description) as OrgTemplateMeta

  // Construir metadata actualizada
  const nextMeta: OrgTemplateMeta = { ...meta }
  const updateData: Record<string, unknown> = {}
  let contentChanged = false

  if (typeof body.title === 'string') {
    const title = body.title.trim()
    if (title.length < 3 || title.length > 200) {
      return NextResponse.json({ error: 'title inválido (3–200 caracteres)' }, { status: 400 })
    }
    updateData.title = title
  }

  if (typeof body.content === 'string') {
    const content = body.content.trim()
    if (content.length < 30 || content.length > 100_000) {
      return NextResponse.json(
        { error: 'content debe tener entre 30 y 100k caracteres' },
        { status: 400 },
      )
    }
    if (content !== meta.content) {
      nextMeta.content = content
      nextMeta.placeholders = detectPlaceholders(content)
      contentChanged = true
    }
  }

  if (body.mappings && typeof body.mappings === 'object') {
    const mappings: Record<string, string> = {}
    for (const [key, val] of Object.entries(body.mappings)) {
      if (typeof key !== 'string' || typeof val !== 'string') continue
      if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) continue
      if (val.length > 200) continue
      mappings[key] = val.trim()
    }
    nextMeta.mappings = mappings
  }

  if (typeof body.notes === 'string') {
    nextMeta.notes = body.notes.trim().slice(0, 1000) || undefined
  }

  if ('validUntil' in body) {
    updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null
  }

  updateData.description = serializeTemplate(nextMeta)
  if (contentChanged) {
    updateData.version = (doc!.version ?? 1) + 1
  }

  const updated = await prisma.orgDocument.update({
    where: { id: params.id },
    data: updateData,
  })

  return NextResponse.json({
    data: {
      id: updated.id,
      storage: 'legacyOrgDocument',
      title: updated.title,
      documentType: nextMeta.documentType,
      placeholders: nextMeta.placeholders,
      mappings: nextMeta.mappings ?? {},
      version: updated.version,
      updatedAt: updated.updatedAt.toISOString(),
    },
  })
})

// =============================================
// DELETE /api/org-templates/[id]  (ADMIN+)
// =============================================
export const DELETE = withRoleParams<{ id: string }>('ADMIN', async (
  _req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  const template = await prisma.orgTemplate.findFirst({
    where: { id: params.id, orgId: ctx.orgId, active: true },
    select: { id: true },
  })
  if (template) {
    await prisma.orgTemplate.update({
      where: { id: params.id },
      data: { active: false },
    })
    return NextResponse.json({ success: true })
  }

  const doc = await prisma.orgDocument.findUnique({
    where: { id: params.id },
  })

  if (!doc || doc.orgId !== ctx.orgId || !isOrgTemplate(doc)) {
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  }

  await prisma.orgDocument.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
})

function sanitizeMappings(value: Record<string, string>): Record<string, string> {
  const mappings: Record<string, string> = {}
  for (const [key, val] of Object.entries(value)) {
    if (typeof key !== 'string' || typeof val !== 'string') continue
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) continue
    if (val.length > 200) continue
    mappings[key] = val.trim()
  }
  return mappings
}

function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function jsonStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

