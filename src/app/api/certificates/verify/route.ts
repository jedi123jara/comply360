/**
 * GET /api/certificates/verify?code=CERT-2026-00042
 *
 * Endpoint público (sin auth) — valida un certificado de E-Learning
 * emitido por la plataforma. Lo consumen:
 *  1. La página pública `/verify/[code]` (humanos escaneando el QR)
 *  2. Terceros que quieran validar programáticamente (SUNAFIL, RRHH externo)
 *
 * Devuelve los datos mínimos para identificar el certificado sin exponer
 * información sensible del worker (el DNI viene enmascarado).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

// FIX auditoría (SEG-08): rate limit anti-enumeración. Los códigos son
// secuenciales (CERT-2026-00001…) y el endpoint es público; sin límite se
// podía barrer todo el espacio y cosechar los datos de cada certificado.
const certVerifyLimiter = rateLimit({ interval: 60_000, limit: 5 })

const CODE_RE = /^CERT-\d{4}-\d{5}$/

function maskDni(dni: string): string {
  if (dni.length < 4) return '****'
  return dni.slice(0, 2) + '*'.repeat(dni.length - 4) + dni.slice(-2)
}

export const GET = async (req: NextRequest) => {
  const rl = await certVerifyLimiter.check(req)
  if (!rl.success) return rl.response!

  const code = new URL(req.url).searchParams.get('code')?.trim() ?? ''

  if (!code || !CODE_RE.test(code)) {
    return NextResponse.json(
      { valid: false, reason: 'Código de verificación inválido' },
      { status: 400 },
    )
  }

  const cert = await prisma.certificate.findUnique({
    where: { code },
    select: {
      code: true,
      orgId: true,
      workerName: true,
      workerDni: true,
      courseTitle: true,
      courseCategory: true,
      score: true,
      issuedAt: true,
      expiresAt: true,
    },
  })

  if (!cert) {
    return NextResponse.json(
      { valid: false, reason: 'Certificado no encontrado' },
      { status: 404 },
    )
  }

  const org = await prisma.organization.findUnique({
    where: { id: cert.orgId },
    select: { name: true },
  })

  const now = new Date()
  const expired = cert.expiresAt !== null && cert.expiresAt < now

  return NextResponse.json({
    valid: !expired,
    expired,
    code: cert.code,
    workerName: cert.workerName,
    workerDniMasked: cert.workerDni ? maskDni(cert.workerDni) : null,
    courseTitle: cert.courseTitle,
    courseCategory: cert.courseCategory,
    score: cert.score,
    issuedAt: cert.issuedAt.toISOString(),
    expiresAt: cert.expiresAt?.toISOString() ?? null,
    orgName: org?.name ?? null,
    issuer: 'COMPLY360 — Plataforma de Compliance Laboral Perú',
  })
}
