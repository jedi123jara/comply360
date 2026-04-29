/**
 * /api/attendance/fences — CRUD de geofences (Fase 4).
 *
 *   GET    → lista de geofences activas de la org (cacheada 30s)
 *   POST   → crea geofence (CIRCLE o POLYGON). ADMIN+
 *   PATCH  → actualiza geofence existente (?id=). ADMIN+
 *   DELETE → elimina geofence (?id=). ADMIN+
 *
 * Antes vivía en memoria; ahora persistente en Postgres.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, hasMinRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  addFence, listFences, removeFence, updateFence, type Geofence,
} from '@/lib/attendance/geofence'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const fences = await listFences(ctx.orgId)
  return NextResponse.json({ fences })
})

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  if (!hasMinRole(ctx.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Se requiere rol ADMIN o superior' }, { status: 403 })
  }
  let body: Partial<Geofence>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (!body.name || !body.type) {
    return NextResponse.json({ error: 'name y type son requeridos' }, { status: 400 })
  }
  let fence: Geofence
  if (body.type === 'circle') {
    if (!body.center || !body.radiusMeters) {
      return NextResponse.json(
        { error: 'center y radiusMeters son requeridos para círculo' },
        { status: 400 }
      )
    }
    if (body.radiusMeters < 5 || body.radiusMeters > 50000) {
      return NextResponse.json(
        { error: 'radiusMeters debe estar entre 5 y 50000' },
        { status: 400 }
      )
    }
    fence = {
      id: randomUUID(),
      name: body.name,
      type: 'circle',
      center: body.center,
      radiusMeters: body.radiusMeters,
      ...(body.locationId ? { locationId: body.locationId } : {}),
    }
  } else if (body.type === 'polygon') {
    if (!body.vertices || body.vertices.length < 3) {
      return NextResponse.json(
        { error: 'Polígono requiere al menos 3 vertices' },
        { status: 400 }
      )
    }
    fence = {
      id: randomUUID(),
      name: body.name,
      type: 'polygon',
      vertices: body.vertices,
      ...(body.locationId ? { locationId: body.locationId } : {}),
    }
  } else {
    return NextResponse.json({ error: 'type debe ser "circle" o "polygon"' }, { status: 400 })
  }
  const created = await addFence(ctx.orgId, fence)
  return NextResponse.json({ fence: created }, { status: 201 })
})

export const PATCH = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  if (!hasMinRole(ctx.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Se requiere rol ADMIN o superior' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  let body: Partial<Geofence> & { isActive?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const ok = await updateFence(ctx.orgId, id, body)
  if (!ok) return NextResponse.json({ error: 'Geofence no encontrada' }, { status: 404 })
  return NextResponse.json({ updated: true })
})

export const DELETE = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  if (!hasMinRole(ctx.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Se requiere rol ADMIN o superior' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  const ok = await removeFence(ctx.orgId, id)
  return NextResponse.json({ deleted: ok })
})
