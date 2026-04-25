/**
 * GET /api/seals/[slug]
 *
 * Endpoint público de verificación del sello Compliance-Ready. Devuelve
 * info de la org + score + validUntil. Sin autenticación: cualquiera puede
 * validar un badge embebido en la web del cliente.
 *
 * 404 si el slug no existe o el sello fue revocado.
 * 410 (Gone) si el sello expiró.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const seal = await prisma.orgComplianceSeal.findUnique({
    where: { slug },
  })

  if (!seal || seal.revokedAt) {
    return NextResponse.json(
      { valid: false, reason: 'not_found_or_revoked' },
      { status: 404 },
    )
  }

  if (seal.validUntil < new Date()) {
    return NextResponse.json(
      {
        valid: false,
        reason: 'expired',
        expiredAt: seal.validUntil.toISOString(),
      },
      { status: 410 },
    )
  }

  // Info de la org. Solo razonSocial pública — NO ruc ni datos sensibles.
  const org = await prisma.organization.findUnique({
    where: { id: seal.orgId },
    select: { razonSocial: true, name: true, sector: true, sizeRange: true },
  })

  return NextResponse.json({
    valid: true,
    seal: {
      tier: seal.tier,
      issuedAt: seal.issuedAt.toISOString(),
      validUntil: seal.validUntil.toISOString(),
      score: seal.scoreAtIssue,
      scoreAvg90d: seal.scoreAvg90d,
    },
    organization: {
      name: org?.razonSocial ?? org?.name ?? 'Empresa verificada',
      sector: org?.sector ?? null,
      sizeRange: org?.sizeRange ?? null,
    },
  })
}
