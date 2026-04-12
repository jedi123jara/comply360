import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { addFence, listFences, removeFence, type Geofence } from '@/lib/attendance/geofence'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  return NextResponse.json({ fences: listFences(ctx.orgId) })
})

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
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
    fence = {
      id: randomUUID(),
      name: body.name,
      type: 'circle',
      center: body.center,
      radiusMeters: body.radiusMeters,
      locationId: body.locationId,
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
      locationId: body.locationId,
    }
  } else {
    return NextResponse.json({ error: 'type debe ser "circle" o "polygon"' }, { status: 400 })
  }
  addFence(ctx.orgId, fence)
  return NextResponse.json({ fence }, { status: 201 })
})

export const DELETE = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  const ok = removeFence(ctx.orgId, id)
  return NextResponse.json({ deleted: ok })
})
