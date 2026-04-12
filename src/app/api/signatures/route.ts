import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { SignatureService } from '@/lib/signature'
import { z } from 'zod'

// =============================================
// Validation schemas
// =============================================

const signerSchema = z.object({
  email: z.string().email('Email invalido'),
  name: z.string().min(1, 'Nombre requerido'),
  role: z.string().min(1, 'Rol requerido'),
  order: z.number().int().min(0),
})

const createRequestSchema = z.object({
  contractId: z.string().min(1, 'ID de contrato requerido'),
  signers: z.array(signerSchema).min(1, 'Se requiere al menos un firmante'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// =============================================
// POST /api/signatures - Create signature request
// Requires ADMIN+ role
// =============================================

export const POST = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const parsed = createRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { contractId, signers, metadata } = parsed.data

    const request = SignatureService.createSignatureRequest(
      contractId,
      ctx.orgId,
      signers,
      metadata
    )

    // Generate tokens for each signer
    const signerTokens = signers.map((signer) => ({
      email: signer.email,
      name: signer.name,
      token: SignatureService.generateSignatureToken(request.id, signer.email),
      signingUrl: `/firmar/${SignatureService.generateSignatureToken(request.id, signer.email)}`,
    }))

    return NextResponse.json({
      data: {
        ...request,
        signerTokens,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating signature request:', error)
    return NextResponse.json(
      { error: 'Error al crear la solicitud de firma' },
      { status: 500 }
    )
  }
})

// =============================================
// GET /api/signatures - List signature requests for org
// =============================================

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const requests = SignatureService.getSignatureRequestsByOrg(ctx.orgId)

    // Strip signature image data from listing for performance
    const sanitized = requests.map((r) => ({
      ...r,
      signers: r.signers.map((s) => ({
        ...s,
        signatureData: s.signatureData ? '[FIRMA]' : null,
      })),
    }))

    return NextResponse.json({
      data: sanitized,
      total: sanitized.length,
    })
  } catch (error) {
    console.error('Error listing signature requests:', error)
    return NextResponse.json(
      { error: 'Error al listar las solicitudes de firma' },
      { status: 500 }
    )
  }
})
