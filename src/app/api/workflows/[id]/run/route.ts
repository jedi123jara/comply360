/**
 * POST /api/workflows/[id]/run
 *
 * Dispara manualmente la ejecución de un workflow. Útil para:
 *  - Testing durante el armado
 *  - Disparos ad-hoc (ej: correr el reporte de CTS fuera del cron)
 *
 * Body (opcional): `{ triggerData: {...} }` — se pasa al engine como
 * contexto inicial (las variables se referencian en las condiciones).
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { runWorkflow } from '@/lib/workflows/persistence'

export const POST = withAuthParams<{ id: string }>(async (
  req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  let triggerData: Record<string, unknown> = {}
  try {
    const text = await req.text()
    if (text) {
      const body = JSON.parse(text) as { triggerData?: Record<string, unknown> }
      triggerData = body.triggerData ?? {}
    }
  } catch {
    // body opcional, ignorar parse error
  }

  try {
    const { execution, runId } = await runWorkflow({
      orgId: ctx.orgId,
      workflowId: params.id,
      triggerData,
      triggeredBy: ctx.email,
    })
    return NextResponse.json({ runId, execution })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al ejecutar el workflow'
    const status = message.includes('no encontrado') ? 404 : message.includes('desactivado') ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
})
