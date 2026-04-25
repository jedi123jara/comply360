/**
 * GET    /api/workflows/[id]   — Detalle del workflow + últimos runs.
 * PATCH  /api/workflows/[id]   — Activa/desactiva o renombra.
 * DELETE /api/workflows/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
  listRuns,
} from '@/lib/workflows/persistence'

export const GET = withAuthParams<{ id: string }>(async (
  _req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  const workflow = await getWorkflow(ctx.orgId, params.id)
  if (!workflow) {
    return NextResponse.json({ error: 'Workflow no encontrado' }, { status: 404 })
  }
  const runs = await listRuns(ctx.orgId, { workflowId: params.id, limit: 20 })
  return NextResponse.json({ workflow, runs })
})

export const PATCH = withAuthParams<{ id: string }>(async (
  req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  let body: { name?: string; description?: string; active?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const updated = await updateWorkflow(ctx.orgId, params.id, {
    name: body.name,
    description: body.description,
    active: body.active,
  })
  if (!updated) {
    return NextResponse.json({ error: 'Workflow no encontrado' }, { status: 404 })
  }
  return NextResponse.json({ workflow: updated })
})

export const DELETE = withAuthParams<{ id: string }>(async (
  _req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  const ok = await deleteWorkflow(ctx.orgId, params.id)
  if (!ok) {
    return NextResponse.json({ error: 'Workflow no encontrado' }, { status: 404 })
  }
  return NextResponse.json({ success: true })
})
