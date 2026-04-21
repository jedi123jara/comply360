/**
 * POST /api/workers/[id]/onboarding-cascade
 *
 * Dispara manualmente la cascada de onboarding para un trabajador.
 * Útil cuando:
 *   - El contrato se firmó antes de que el worker fuera registrado aquí
 *   - Se agregaron nuevos OrgDocuments después del alta y hay que re-notificar
 *   - El email inicial no llegó y el admin quiere re-enviarlo
 *
 * Body (opcional):
 *   {
 *     force?: boolean         // Re-ejecutar aunque ya se haya corrido
 *     requestLegajo?: boolean // Default true
 *     sendEmail?: boolean     // Default true
 *   }
 *
 * Respuesta: `CascadeResult` del módulo @/lib/onboarding/cascade
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { runOnboardingCascade } from '@/lib/onboarding/cascade'

export const runtime = 'nodejs'

export const POST = withRoleParams<{ id: string }>('ADMIN', async (
  req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  // Verificar que el worker pertenezca a la org del admin
  const worker = await prisma.worker.findUnique({
    where: { id: params.id },
    select: { id: true, orgId: true, status: true, email: true },
  })

  if (!worker || worker.orgId !== ctx.orgId) {
    return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
  }

  let body: { force?: boolean; requestLegajo?: boolean; sendEmail?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    // body vacío es válido — todas opcionales
  }

  const result = await runOnboardingCascade(params.id, {
    force: body.force === true,
    requestLegajo: body.requestLegajo !== false,
    sendEmail: body.sendEmail !== false,
    triggeredBy: ctx.userId,
  })

  if (result.skipped) {
    return NextResponse.json(
      {
        data: result,
        message: result.skipReason,
      },
      { status: 200 },
    )
  }

  if (!result.success) {
    return NextResponse.json(
      { error: result.skipReason ?? 'Error al ejecutar cascade', data: result },
      { status: 500 },
    )
  }

  return NextResponse.json({
    data: result,
    message: `Cascade ejecutada. ${result.requestsCreated} solicitud(es) creada(s). ${
      result.emailSent ? 'Email enviado.' : worker.email ? 'Email no pudo enviarse.' : 'Trabajador sin email.'
    }`,
  })
})
