/**
 * GET  /api/org-templates        Lista los templates de la empresa.
 * POST /api/org-templates        Crea un nuevo template de contrato/documento.
 *
 * Persistencia primaria: `OrgTemplate`.
 * Compatibilidad: seguimos leyendo templates legacy guardados en
 * `OrgDocument.description` con schema `contract_template_v1`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { planHasFeature } from '@/lib/plan-gate'
import {
  detectPlaceholders,
  isOrgTemplate,
  parseTemplate,
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
export const GET = withPlanGate('ia_contratos', async (req: NextRequest, ctx: AuthContext) => {
  const gate = await assertPlanAccess(ctx.orgId)
  if (!gate.ok) return gate.response

  const url = new URL(req.url)
  const documentType = url.searchParams.get('type') as OrgTemplateType | null

  const [rows, legacyDocs] = await Promise.all([
    prisma.orgTemplate.findMany({
      where: {
        orgId: ctx.orgId,
        active: true,
        ...(documentType ? { documentType } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.orgDocument.findMany({
      where: { orgId: ctx.orgId, type: 'OTRO' },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        version: true,
        validUntil: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ])

  const templates = [
    ...rows.map((t) => {
      const placeholders = jsonStringArray(t.placeholders)
      const mappings = jsonStringRecord(t.mappings)
      return {
        id: t.id,
        storage: 'orgTemplate' as const,
        title: t.title,
        documentType: t.documentType,
        documentTypeLabel: TEMPLATE_TYPE_LABEL[t.documentType as OrgTemplateType] ?? t.documentType,
        contractType: t.contractType ?? null,
        placeholders,
        placeholderCount: placeholders.length,
        mappingCount: Object.keys(mappings).length,
        unmapped: placeholders.filter((p) => !mappings[p]),
        usageCount: t.usageCount,
        notes: t.notes ?? null,
        version: t.version,
        validUntil: null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }
    }),
    ...legacyDocs
    .filter((d) => isOrgTemplate(d))
    .map((d) => {
      const meta = parseTemplate(d.description) as OrgTemplateMeta
      return {
        id: d.id,
        storage: 'legacyOrgDocument' as const,
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
    }),
  ]
    .filter((t) => !documentType || t.documentType === documentType)

  return NextResponse.json({ data: templates, count: templates.length })
})

// =============================================
// POST /api/org-templates — Crear template
// =============================================
export const POST = withPlanGate('ia_contratos', async (req: NextRequest, ctx: AuthContext) => {
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

  const created = await prisma.orgTemplate.create({
    data: {
      orgId: ctx.orgId,
      title,
      documentType,
      contractType: body.contractType ?? null,
      content,
      placeholders,
      mappings,
      notes: body.notes?.trim().slice(0, 1000) || null,
      version: 1,
      active: true,
      createdById: ctx.userId,
    },
  })

  return NextResponse.json(
    {
      data: {
        id: created.id,
        title: created.title,
        storage: 'orgTemplate',
        documentType: created.documentType,
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

function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function jsonStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

