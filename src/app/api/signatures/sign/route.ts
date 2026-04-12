import { NextRequest, NextResponse } from 'next/server'
import { SignatureService } from '@/lib/signature'
import { z } from 'zod'

// =============================================
// POST /api/signatures/sign - Public signing endpoint
// No auth required - uses token for verification
// =============================================

const signSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  signatureData: z.string().min(1, 'Datos de firma requeridos'),
  acceptedTerms: z.boolean().refine((v) => v === true, {
    message: 'Debe aceptar los terminos legales para firmar',
  }),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = signSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { token, signatureData, acceptedTerms } = parsed.data

    // Verify the token
    const payload = SignatureService.verifySignature(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'El enlace de firma es invalido o ha expirado. Solicite uno nuevo.' },
        { status: 401 }
      )
    }

    // Get IP and user agent
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '0.0.0.0'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Record the signature
    const result = SignatureService.completeSignature(
      payload.requestId,
      payload.signerEmail,
      {
        signatureData,
        ipAddress,
        userAgent,
        acceptedTerms,
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Return success without exposing sensitive data
    const signer = result.request!.signers.find((s) => s.email === payload.signerEmail)

    return NextResponse.json({
      data: {
        status: 'SIGNED',
        signedAt: signer?.signedAt,
        signatureHash: signer?.signatureHash,
        requestStatus: result.request!.status,
        totalSigners: result.request!.signers.length,
        signedCount: result.request!.signers.filter((s) => s.status === 'SIGNED').length,
      },
      message: 'Firma registrada exitosamente',
    })
  } catch (error) {
    console.error('Error processing signature:', error)
    return NextResponse.json(
      { error: 'Error al procesar la firma' },
      { status: 500 }
    )
  }
}

// =============================================
// GET /api/signatures/sign?token=xxx - Verify token & get signing data
// Public endpoint
// =============================================

export async function GET(req: NextRequest) {
  try {
    const token = new URL(req.url).searchParams.get('token')
    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      )
    }

    const payload = SignatureService.verifySignature(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'El enlace de firma es invalido o ha expirado.' },
        { status: 401 }
      )
    }

    const signingData = SignatureService.getSigningPageData(
      payload.requestId,
      payload.signerEmail
    )
    if (!signingData) {
      return NextResponse.json(
        { error: 'Datos de firma no encontrados' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: {
        ...signingData,
        signerEmail: payload.signerEmail,
      },
    })
  } catch (error) {
    console.error('Error verifying signature token:', error)
    return NextResponse.json(
      { error: 'Error al verificar el token de firma' },
      { status: 500 }
    )
  }
}
