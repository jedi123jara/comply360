/**
 * POST /api/attendance/alerts/scan
 *
 * Dispara manualmente el scan de patrones de asistencia (tardanzas crónicas,
 * ausentismo crónico) para la org del usuario autenticado. ADMIN+.
 *
 * Devuelve un resumen del scan: workers escaneados, alertas creadas, detalles
 * por trabajador.
 *
 * Para ejecución programada, este endpoint puede llamarse desde un cron de
 * Vercel (vercel.json) — pendiente de configurar en Fase 4.
 */

import { NextRequest, NextResponse } from 'next/server'
import { hasMinRole } from '@/lib/api-auth'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { scanAttendancePatterns } from '@/lib/alerts/attendance-patterns'

export const POST = withPlanGate('attendance_selfie', async (_req: NextRequest, ctx: AuthContext) => {
  if (!hasMinRole(ctx.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Se requiere rol ADMIN o superior' }, { status: 403 })
  }
  try {
    const result = await scanAttendancePatterns(ctx.orgId)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[attendance/alerts/scan] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error en scan' },
      { status: 500 },
    )
  }
})
