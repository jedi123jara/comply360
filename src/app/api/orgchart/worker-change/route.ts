import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withRole } from '@/lib/api-auth'
import { applyWorkerChange, type WorkerChangeInput } from '@/lib/orgchart/apply-worker-change'

const schema = z.object({
  workerId: z.string().min(1),
  change: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('transfer'),
      newPositionId: z.string().min(1),
      capacityPct: z.number().min(1).max(100).optional(),
    }),
    z.object({
      kind: z.literal('promote'),
      newPositionId: z.string().min(1),
      newSalary: z.number().positive().optional(),
      capacityPct: z.number().min(1).max(100).optional(),
    }),
    z.object({ kind: z.literal('raise'), newSalary: z.number().positive() }),
    z.object({ kind: z.literal('suspend') }),
    z.object({ kind: z.literal('reactivate') }),
    z.object({
      kind: z.literal('cese'),
      fechaCese: z.string().min(1),
      motivo: z.string().max(500).optional(),
    }),
  ]),
})

/**
 * POST /api/orgchart/worker-change
 *
 * Punto único para cambios de ciclo de vida disparados desde el organigrama
 * (transferir, promover, aumentar, suspender, reactivar, cesar). Encadena la
 * propagación a Worker + OrgAssignment + alertas + score + historial.
 */
export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const result = await applyWorkerChange(
    ctx.orgId,
    parsed.data.workerId,
    parsed.data.change as WorkerChangeInput,
    ctx.userId,
  )
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
  }
  return NextResponse.json({ ok: true })
})
