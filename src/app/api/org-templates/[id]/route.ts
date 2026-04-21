/**
 * GET    /api/org-templates/[id]   Obtiene un template con su contenido y mappings.
 * PATCH  /api/org-templates/[id]   Actualiza contenido/mappings (crea nueva versión).
 * DELETE /api/org-templates/[id]   Elimina el template.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams, withRoleParams } from '@/lib/api-auth'
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
export const GET = withAuthParams<{ id: string }>(async (
  _req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  const gate = await assertPlanAccess(ctx.orgId)
  if (!gate.ok) return gate.response

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
export const PATCH = withAuthParams<{ id: string }>(async (
  req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  const gate = await assertPlanAccess(ctx.orgId)
  if (!gate.ok) return gate.response

  const doc = await prisma.orgDocument.findUnique({
    where: { id: params.id },
  })

  if (!doc || doc.orgId !== ctx.orgId || !isOrgTemplate(doc)) {
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  }

  const meta = parseTemplate(doc.description) as OrgTemplateMeta

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
    updateData.version = (doc.version ?? 1) + 1
  }

  const updated = await prisma.orgDocument.update({
    where: { id: params.id },
    data: updateData,
  })

  return NextResponse.json({
    data: {
      id: updated.id,
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
  const doc = await prisma.orgDocument.findUnique({
    where: { id: params.id },
  })

  if (!doc || doc.orgId !== ctx.orgId || !isOrgTemplate(doc)) {
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  }

  await prisma.orgDocument.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
})
