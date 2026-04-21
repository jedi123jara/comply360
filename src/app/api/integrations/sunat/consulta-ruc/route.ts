/**
 * API Route: SUNAT Consulta RUC Avanzada
 *
 * GET /api/integrations/sunat/consulta-ruc?ruc=20XXXXXXXXX&tipo=deuda|representantes|trabajadores|establecimientos
 *
 * Consulta datos avanzados del portal público SUNAT:
 * - deuda: Deudas coactivas pendientes
 * - representantes: Representantes legales
 * - trabajadores: Cantidad de trabajadores por período
 * - establecimientos: Sucursales y locales
 *
 * Protected: requires MEMBER role
 * Rate limited: 6 requests per minute per organization
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { rateLimit, withRateLimitHeaders } from '@/lib/rate-limit'
import { validarRUC } from '@/lib/integrations/sunat'
import {
  consultarDeudaCoactiva,
  consultarRepresentantesLegales,
  consultarCantidadTrabajadores,
  consultarEstablecimientos,
  consultarRucCompleto,
  type ConsultaTipo,
  type ConsultaRucError,
} from '@/lib/integrations/sunat-consultaruc'

// ---------------------------------------------------------------------------
// Rate limiter: 6 queries per minute per org (stricter — hits SUNAT directly)
// ---------------------------------------------------------------------------

const consultaRucLimiter = rateLimit({ interval: 60_000, limit: 6 })

// ---------------------------------------------------------------------------
// Valid query types
// ---------------------------------------------------------------------------

const VALID_TIPOS: ConsultaTipo[] = ['deuda', 'representantes', 'trabajadores', 'establecimientos']

function isValidTipo(tipo: string): tipo is ConsultaTipo {
  return VALID_TIPOS.includes(tipo as ConsultaTipo)
}

// ---------------------------------------------------------------------------
// Query functions map
// ---------------------------------------------------------------------------

const QUERY_FNS: Record<ConsultaTipo, (ruc: string) => Promise<{ data: unknown; error: ConsultaRucError | null }>> = {
  deuda: consultarDeudaCoactiva,
  representantes: consultarRepresentantesLegales,
  trabajadores: consultarCantidadTrabajadores,
  establecimientos: consultarEstablecimientos,
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  // Rate limit
  const rateLimitResult = await consultaRucLimiter.check(req, `sunat-consulta:${ctx.orgId}`)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }

  const { searchParams } = new URL(req.url)
  const ruc = searchParams.get('ruc')?.trim()
  const tipo = searchParams.get('tipo')?.trim()

  // Validate RUC
  if (!ruc) {
    return NextResponse.json(
      { error: 'Parámetro requerido: ?ruc=20XXXXXXXXX' },
      { status: 400 }
    )
  }

  if (!validarRUC(ruc)) {
    return NextResponse.json(
      { error: `RUC "${ruc}" no es válido. Debe tener 11 dígitos con dígito verificador correcto.`, code: 'INVALID_RUC' },
      { status: 400 }
    )
  }

  try {
    // If tipo=all or no tipo specified, return all data
    if (!tipo || tipo === 'all') {
      const result = await consultarRucCompleto(ruc)
      return withRateLimitHeaders(
        NextResponse.json({ type: 'all', data: result }),
        rateLimitResult
      )
    }

    // Validate tipo
    if (!isValidTipo(tipo)) {
      return NextResponse.json(
        { error: `Tipo "${tipo}" no válido. Use: ${VALID_TIPOS.join(', ')} o all` },
        { status: 400 }
      )
    }

    // Execute specific query
    const queryFn = QUERY_FNS[tipo]
    const result = await queryFn(ruc)

    if (result.error) {
      const statusMap: Record<string, number> = {
        INVALID_RUC: 400,
        NOT_FOUND: 404,
        RATE_LIMITED: 429,
        SUNAT_OFFLINE: 502,
        PARSE_ERROR: 502,
      }
      const status = statusMap[result.error.code] || 500

      return withRateLimitHeaders(
        NextResponse.json(
          { error: result.error.message, code: result.error.code },
          { status }
        ),
        rateLimitResult
      )
    }

    return withRateLimitHeaders(
      NextResponse.json({ type: tipo, data: result.data }),
      rateLimitResult
    )
  } catch (error) {
    console.error('[API /integrations/sunat/consulta-ruc] Error:', error)
    return withRateLimitHeaders(
      NextResponse.json(
        { error: 'Error interno al consultar SUNAT.' },
        { status: 500 }
      ),
      rateLimitResult
    )
  }
})
