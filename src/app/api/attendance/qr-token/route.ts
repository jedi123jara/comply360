/**
 * GET /api/attendance/qr-token
 *
 * Emite un token JWT + short code para que el admin lo muestre como QR.
 * El token dura 5 min. El admin debería refrescarlo cada 4 min (rotación).
 *
 * Solo ADMIN / OWNER pueden solicitarlo.
 *
 * Query params (opcionales):
 *   - mode: 'in' | 'out' | 'both'  (default: 'both')
 *   - grace: minutos de tolerancia para marcar tardanza (default: 15)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  issueAttendanceToken,
  attendanceDeepLink,
  TOKEN_ROTATION_SECONDS,
} from '@/lib/attendance/qr-token'
import { persistAttendanceQrSession } from '@/lib/attendance/qr-session'

export const runtime = 'nodejs'

export const GET = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const url = new URL(req.url)
  const modeParam = url.searchParams.get('mode')
  const mode: 'in' | 'out' | 'both' =
    modeParam === 'in' || modeParam === 'out' || modeParam === 'both'
      ? modeParam
      : 'both'

  const graceParam = url.searchParams.get('grace')
  const graceMinutes = graceParam ? Math.max(0, Math.min(60, parseInt(graceParam, 10) || 15)) : 15

  const { token, shortCode, expiresAt } = issueAttendanceToken({
    orgId: ctx.orgId,
    mode,
    graceMinutes,
  })

  await persistAttendanceQrSession({
    orgId: ctx.orgId,
    shortCode,
    token,
    mode,
    graceMinutes,
    expiresAt,
    createdBy: ctx.userId,
  })

  const deepLink = attendanceDeepLink(token)

  return NextResponse.json({
    token,
    shortCode,
    deepLink,
    mode,
    graceMinutes,
    expiresAt,
    rotateAfterSeconds: TOKEN_ROTATION_SECONDS,
  })
})
