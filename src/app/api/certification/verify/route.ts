/**
 * GET /api/certification/verify?code=CC-XXXXXXXX
 *
 * Public endpoint — no auth required.
 * Verifies a COMPLY360 certification seal by verification code.
 *
 * This endpoint is used by:
 *  1. The public verify page (comply360.pe/verificar/[code])
 *  2. Third parties (clients, auditors, SUNAFIL) scanning QR codes on certificates
 *
 * Response when valid:
 *   { valid: true, orgName: string, issuedAt: string, validUntil: string, seal: string }
 *
 * Response when invalid/expired:
 *   { valid: false, reason: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code || !/^CC-[0-9A-F]{8}$/.test(code)) {
    return NextResponse.json(
      { valid: false, reason: 'Código de verificación inválido' },
      { status: 400 }
    )
  }

  // Look up the most recent CERTIFICATION_ISSUED audit log entry matching this code
  const entry = await prisma.auditLog.findFirst({
    where: {
      action: 'CERTIFICATION_ISSUED',
      metadataJson: {
        path: ['verificationCode'],
        equals: code,
      },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      orgId: true,
      metadataJson: true,
      organization: { select: { name: true } },
    },
  })

  if (!entry) {
    return NextResponse.json(
      { valid: false, reason: 'Certificado no encontrado en nuestros registros' },
      { status: 404 }
    )
  }

  const meta = entry.metadataJson as {
    score?: number
    seal?: string
    validUntil?: string
    verificationCode?: string
  }

  // Check validity period
  const validUntil = meta.validUntil ? new Date(meta.validUntil) : null
  const isExpired = validUntil && validUntil < new Date()

  if (isExpired) {
    return NextResponse.json({
      valid: false,
      reason: `Certificado vencido el ${validUntil?.toLocaleDateString('es-PE')}. La empresa debe renovar su certificación.`,
    })
  }

  return NextResponse.json({
    valid: true,
    orgName: entry.organization?.name ?? 'Empresa',
    orgId: entry.orgId,
    issuedAt: entry.createdAt.toISOString(),
    validUntil: meta.validUntil ?? null,
    seal: meta.seal ?? 'BRONZE',
    score: meta.score ?? null,
    verificationCode: code,
    certifiedBy: 'COMPLY360 — Plataforma de Compliance Laboral Perú',
    message: '✓ Este sello es auténtico y fue emitido por COMPLY360 tras verificar el cumplimiento laboral de la empresa.',
  })
}
