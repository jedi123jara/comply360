/**
 * GET  /api/org-templates        Lista los templates de la empresa.
 * POST /api/org-templates        Crea un nuevo template de contrato/documento.
 *
 * Persistencia: reutilizamos `OrgDocument` con `type = OTRO` y metadata JSON
 * serializada en `description` (schema `contract_template_v1`) para evitar
 * una migración.  El engine en `@/lib/templates/org-template-engine` maneja
 * serialización, parsing y detección de placeholders.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { planHasFeature } from '@/lib/plan-gate'
import {
  detectPlaceholders,
  isOrgTemplate,
  parseTemplate,
  serializeTemplate,
  TEMPLATE_TYPE_LABEL,
  type OrgTemplateMeta,
  type OrgTemplateType,
} from '@/lib/templates/org-template-engine'

export const runtime = 'nodejs'

// =============================================
// Helper: plan gate (EMPRESA+ requerido)
// =============================================
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
// GET /api/org-templates — Lista templates
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const gate = await assertPlanAccess(ctx.orgId)
  if (!gate.ok) return gate.response

  const url = new URL(req.url)
  const documentType = url.searchParams.get('type') as OrgTemplateType | null

  // Traemos todos los OrgDocument tipo OTRO y filtramos los que tengan metadata válida.
  const docs = await prisma.orgDocument.findMany({
    where: { orgId: ctx.orgId, type: 'OTRO' },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      version: true,
      isPublishedToWorkers: true,
      validUntil: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const templates = docs
    .filter((d) => isOrgTemplate(d))
    .map((d) => {
      const meta = parseTemplate(d.description) as OrgTemplateMeta
      return {
        id: d.id,
        title: d.title,
        documentType: meta.documentType,
        documentTypeLabel: TEMPLATE_TYPE_LABEL[meta.documentType] ?? meta.documentType,
        contractType: meta.contractType ?? null,
        placeholders: meta.placeholders,
        placeholderCount: meta.placeholders.length,
        mappingCount: Object.keys(meta.mappings ?? {}).length,
        unmapped: meta.placeholders.filter((p) => !meta.mappings?.[p]),
        usageCount: meta.usageCount ?? 0,
        notes: meta.notes ?? null,
        version: d.version,
        validUntil: d.validUntil?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      }
    })
    .filter((t) => !documentType || t.documentType === documentType)

  return NextResponse.json({ data: templates, count: templates.length })
})

// =============================================
// POST /api/org-templates — Crear template
// =============================================
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const gate = await assertPlanAccess(ctx.orgId)
  if (!gate.ok) return gate.response

  let body: {
    title?: string
    documentType?: OrgTemplateType
    contractType?: string
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

  const title = (body.title ?? '').trim()
  const documentType = body.documentType
  const content = (body.content ?? '').trim()

  if (!title || title.length < 3 || title.length > 200) {
    return NextResponse.json(
      { error: 'title requerido (3–200 caracteres)' },
      { status: 400 },
    )
  }
  if (!documentType || !(documentType in TEMPLATE_TYPE_LABEL)) {
    return NextResponse.json(
      {
        error: 'documentType inválido',
        validTypes: Object.keys(TEMPLATE_TYPE_LABEL),
      },
      { status: 400 },
    )
  }
  if (!content || content.length < 30) {
    return NextResponse.json(
      { error: 'content requerido (mínimo 30 caracteres)' },
      { status: 400 },
    )
  }
  if (content.length > 100_000) {
    return NextResponse.json(
      { error: 'content demasiado extenso (máximo 100k caracteres)' },
      { status: 400 },
    )
  }

  // Auto-detectar placeholders del contenido
  const placeholders = detectPlaceholders(content)

  // Validar mappings — si hay placeholders, deben mapearse a paths razonables
  const mappings: Record<string, string> = {}
  if (body.mappings && typeof body.mappings === 'object') {
    for (const [key, val] of Object.entries(body.mappings)) {
      if (typeof key !== 'string' || typeof val !== 'string') continue
      if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) continue
      if (val.length > 200) continue
      mappings[key] = val.trim()
    }
  }

  const meta: OrgTemplateMeta = {
    _schema: 'contract_template_v1',
    documentType,
    contractType: body.contractType as OrgTemplateMeta['contractType'],
    content,
    placeholders,
    mappings,
    notes: body.notes?.trim().slice(0, 1000) || undefined,
    usageCount: 0,
  }

  const created = await prisma.orgDocument.create({
    data: {
      orgId: ctx.orgId,
      type: 'OTRO',
      title,
      description: serializeTemplate(meta),
      version: 1,
      uploadedById: ctx.userId,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      publishedAt: null,
    },
  })

  return NextResponse.json(
    {
      data: {
        id: created.id,
        title: created.title,
        documentType: meta.documentType,
        documentTypeLabel: TEMPLATE_TYPE_LABEL[documentType],
        placeholders,
        mappings,
        version: created.version,
        createdAt: created.createdAt.toISOString(),
      },
    },
    { status: 201 },
  )
})
