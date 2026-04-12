import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { SignatureService } from '@/lib/signature'
import { z } from 'zod'

type Params = { id: string }

// =============================================
// GET /api/signatures/[id] - Get signature request details
// =============================================

export const GET = withAuthParams<Params>(async (_req: NextRequest, ctx: AuthContext, params: Params) => {
  try {
    const request = SignatureService.getSignatureStatus(params.id)

    if (!request) {
      return NextResponse.json(
        { error: 'Solicitud de firma no encontrada' },
        { status: 404 }
      )
    }

    // Verify the request belongs to the user's org
    if (request.orgId !== ctx.orgId) {
      return NextResponse.json(
        { error: 'No autorizado para ver esta solicitud' },
        { status: 403 }
      )
    }

    return NextResponse.json({ data: request })
  } catch (error) {
    console.error('Error fetching signature request:', error)
    return NextResponse.json(
      { error: 'Error al obtener la solicitud de firma' },
      { status: 500 }
    )
  }
})

// =============================================
// PATCH /api/signatures/[id] - Update signature status
// Requires ADMIN+ role
// =============================================

const updateSchema = z.object({
  action: z.enum(['cancel', 'resend']),
  signerEmail: z.string().email().optional(), // Required for 'resend'
})

export const PATCH = withRoleParams<Params>('ADMIN', async (req: NextRequest, ctx: AuthContext, params: Params) => {
  try {
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const request = SignatureService.getSignatureStatus(params.id)
    if (!request) {
      return NextResponse.json(
        { error: 'Solicitud de firma no encontrada' },
        { status: 404 }
      )
    }

    if (request.orgId !== ctx.orgId) {
      return NextResponse.json(
        { error: 'No autorizado para modificar esta solicitud' },
        { status: 403 }
      )
    }

    const { action, signerEmail } = parsed.data

    if (action === 'cancel') {
      const cancelled = SignatureService.cancelRequest(params.id)
      if (!cancelled) {
        return NextResponse.json(
          { error: 'No se pudo cancelar la solicitud' },
          { status: 400 }
        )
      }
      return NextResponse.json({
        data: SignatureService.getSignatureStatus(params.id),
        message: 'Solicitud cancelada exitosamente',
      })
    }

    if (action === 'resend') {
      if (!signerEmail) {
        return NextResponse.json(
          { error: 'Email del firmante requerido para reenviar' },
          { status: 400 }
        )
      }

      const token = SignatureService.generateSignatureToken(params.id, signerEmail)
      if (!token) {
        return NextResponse.json(
          { error: 'No se pudo generar el enlace de firma. El firmante ya firmo o no existe.' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        data: {
          signerEmail,
          token,
          signingUrl: `/firmar/${token}`,
        },
        message: 'Enlace de firma regenerado exitosamente',
      })
    }

    return NextResponse.json({ error: 'Accion no soportada' }, { status: 400 })
  } catch (error) {
    console.error('Error updating signature request:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la solicitud de firma' },
      { status: 500 }
    )
  }
})
