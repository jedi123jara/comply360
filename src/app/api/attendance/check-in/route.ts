/**
 * POST /api/attendance/check-in
 *
 * Valida un marcado de asistencia contra las geofences configuradas.
 * Body: { lat, lng, accuracyMeters, photoHash? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { checkAttendance, listFences } from '@/lib/attendance/geofence'

export const runtime = 'nodejs'

export const POST = withPlanGate('attendance_selfie', async (req: NextRequest, ctx: AuthContext) => {
  let body: { lat?: number; lng?: number; accuracyMeters?: number; photoHash?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return NextResponse.json({ error: 'lat y lng son requeridos (number)' }, { status: 400 })
  }

  const fences = await listFences(ctx.orgId)
  const result = checkAttendance(fences, {
    point: { lat: body.lat, lng: body.lng },
    accuracyMeters: body.accuracyMeters,
    photoHash: body.photoHash,
    timestamp: new Date().toISOString(),
  })

  return NextResponse.json({
    ...result,
    fencesConfigured: fences.length,
    checkedAt: new Date().toISOString(),
  })
})
