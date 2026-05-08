/**
 * POST /api/capacitaciones/solicitar
 *
 * Recibe la solicitud de capacitación a medida del CTA en /dashboard/capacitaciones.
 * Persiste como AuditLog con action `TRAINING_REQUEST_SUBMITTED` (sin nueva
 * tabla en Prisma — el campo metadataJson guarda los detalles del form).
 *
 * Pendiente para Fase 5+: enviar email a soporte/ventas + crear ticket en CRM
 * cuando se decida el destino comercial. Por ahora se queda en AuditLog
 * consultable desde /admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { auditLog, AuditActions } from '@/lib/audit'

export const runtime = 'nodejs'

const SolicitarSchema = z.object({
  tema: z.string().min(3).max(200),
  modalidad: z.enum(['presencial', 'virtual', 'mixta']),
  fechaTentativa: z.string().optional().nullable(),
  cantidadTrabajadores: z.number().int().positive().lte(10000),
  objetivoLegal: z.string().max(500).optional().nullable(),
  contactoNombre: z.string().min(1).max(100),
  contactoEmail: z.string().email(),
  contactoTelefono: z.string().max(30).optional().nullable(),
  notasAdicionales: z.string().max(1000).optional().nullable(),
})

// Acción nueva — no romper enum AuditActions existente, usar literal
const TRAINING_REQUEST_ACTION = 'TRAINING_REQUEST_SUBMITTED'

// Mantener referencia explícita a AuditActions para que TypeScript no se queje
// del import sin uso (estaría disponible para extender el catálogo en futuro).
void AuditActions

export const POST = withPlanGate('workers', async (req: NextRequest, ctx: AuthContext) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const parsed = SolicitarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  await auditLog({
    action: TRAINING_REQUEST_ACTION,
    orgId: ctx.orgId,
    userId: ctx.userId,
    resourceType: 'TrainingRequest',
    details: {
      ...parsed.data,
      receivedAt: new Date().toISOString(),
    },
    ipAddress: req.headers.get('x-forwarded-for'),
  })

  return NextResponse.json(
    {
      data: {
        message:
          'Tu solicitud fue recibida. Nuestro equipo te contactará al email indicado en menos de 48 horas hábiles.',
      },
    },
    { status: 201 },
  )
})

