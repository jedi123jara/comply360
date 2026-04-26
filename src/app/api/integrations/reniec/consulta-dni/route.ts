/**
 * GET /api/integrations/reniec/consulta-dni?dni=12345678
 *
 * Consulta RENIEC para auto-fill de datos personales en form de trabajador.
 *
 * - Auth: requiere MEMBER+ (cualquier user del dashboard puede consultar)
 * - Rate limit: 10/min por org (RENIEC es público pero apis.net.pe nos limita)
 * - Cache: 30 días por DNI (transparente al cliente — el lib gestiona)
 * - AuditLog: cada consulta queda registrada con orgId + dni hasheado (no PII)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { consultarDNI, validarDNI, ReniecError } from '@/lib/integrations/reniec'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const reniecLimiter = rateLimit({ interval: 60_000, limit: 10 })

function hashDni(dni: string): string {
  return crypto.createHash('sha256').update(dni).digest('hex').slice(0, 16)
}

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  // Rate limit por org
  const limit = await reniecLimiter.check(req, `reniec:${ctx.orgId}`)
  if (!limit.success) {
    return NextResponse.json(
      {
        error: 'Demasiadas consultas RENIEC. Espera 1 minuto.',
        code: 'RATE_LIMIT',
        resetIn: Math.ceil((limit.reset - Date.now()) / 1000),
      },
      { status: 429 },
    )
  }

  const { searchParams } = new URL(req.url)
  const dni = (searchParams.get('dni') ?? '').trim()

  if (!validarDNI(dni)) {
    return NextResponse.json(
      { error: 'Formato de DNI inválido (debe ser 8 dígitos)', code: 'INVALID_DNI' },
      { status: 400 },
    )
  }

  try {
    const data = await consultarDNI(dni)

    // AuditLog: registramos consulta sin guardar el DNI plano (solo hash)
    void prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'reniec.consulta_dni',
          entityType: 'reniec',
          entityId: hashDni(dni),
          metadataJson: { source: data.source, cached: data.source === 'cache' },
        },
      })
      .catch(() => { /* best-effort */ })

    return NextResponse.json({
      success: true,
      data: {
        dni: data.dni,
        nombres: data.nombres,
        apellidoPaterno: data.apellidoPaterno,
        apellidoMaterno: data.apellidoMaterno,
        nombreCompleto: data.nombreCompleto,
        fechaNacimiento: data.fechaNacimiento,
        sexo: data.sexo,
      },
      source: data.source,
    })
  } catch (err) {
    if (err instanceof ReniecError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      )
    }
    return NextResponse.json(
      { error: 'Error inesperado consultando RENIEC', code: 'UNKNOWN' },
      { status: 500 },
    )
  }
})
