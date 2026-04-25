/**
 * GET  /api/workflows          — Lista workflows de la org + templates disponibles.
 * POST /api/workflows          — Crea un workflow desde un template (body:
 *                                { templateId, params }) o custom (body:
 *                                { name, description, triggerId, steps }).
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { listWorkflows, createWorkflow } from '@/lib/workflows/persistence'
import { WORKFLOW_TEMPLATES, findTemplate } from '@/lib/workflows/templates'

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const workflows = await listWorkflows(ctx.orgId)
  return NextResponse.json({
    workflows,
    templates: WORKFLOW_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      params: t.params,
    })),
  })
})

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: {
    templateId?: string
    params?: Record<string, string | number>
    name?: string
    description?: string
    triggerId?: string
    steps?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  // ── Creación desde template ──
  if (body.templateId) {
    const template = findTemplate(body.templateId)
    if (!template) {
      return NextResponse.json({ error: `Template no encontrado: ${body.templateId}` }, { status: 404 })
    }

    const values = body.params ?? {}
    // Validar params requeridos
    const missing = template.params.filter((p) => p.required && !values[p.key])
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Parámetros requeridos faltantes: ${missing.map((p) => p.key).join(', ')}` },
        { status: 400 },
      )
    }

    const steps = template.buildSteps(values)
    const created = await createWorkflow(ctx.orgId, {
      name: template.name,
      description: template.description,
      triggerId: template.triggerId,
      steps,
      metadata: { templateId: template.id, params: values },
      createdBy: ctx.email,
    })
    return NextResponse.json({ workflow: created }, { status: 201 })
  }

  // ── Creación custom (para uso futuro / admin) ──
  if (!body.name || !body.triggerId || !Array.isArray(body.steps)) {
    return NextResponse.json(
      { error: 'Se requiere templateId, o bien (name + triggerId + steps[])' },
      { status: 400 },
    )
  }

  const created = await createWorkflow(ctx.orgId, {
    name: body.name,
    description: body.description,
    triggerId: body.triggerId,
    steps: body.steps as never,
    createdBy: ctx.email,
  })
  return NextResponse.json({ workflow: created }, { status: 201 })
})
