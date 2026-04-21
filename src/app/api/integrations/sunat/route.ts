/**
 * API Route: SUNAT Integration
 *
 * GET /api/integrations/sunat?ruc=20XXXXXXXXX — Query RUC info from SUNAT
 * GET /api/integrations/sunat?dni=XXXXXXXX    — Query DNI info from RENIEC
 *
 * Protected: requires ADMIN role or higher
 * Rate limited: 10 requests per minute per organization
 */

import { NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { rateLimit, withRateLimitHeaders } from '@/lib/rate-limit'
import { consultarRUC, consultarDNI, validarRUC, validarDNI } from '@/lib/integrations/sunat'

// ---------------------------------------------------------------------------
// Rate limiter: 10 SUNAT queries per minute per org
// ---------------------------------------------------------------------------

const sunatLimiter = rateLimit({ interval: 60_000, limit: 10 })

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export const GET = withRole('MEMBER', async (req, ctx) => {
  // Rate limit check
  const rateLimitResult = await sunatLimiter.check(req, `sunat:${ctx.orgId}`)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }

  const { searchParams } = new URL(req.url)
  const ruc = searchParams.get('ruc')?.trim()
  const dni = searchParams.get('dni')?.trim()

  // Must provide exactly one parameter
  if (!ruc && !dni) {
    return NextResponse.json(
      { error: 'Debe proporcionar un parametro: ?ruc=XXXXXXXXXXX o ?dni=XXXXXXXX' },
      { status: 400 }
    )
  }

  if (ruc && dni) {
    return NextResponse.json(
      { error: 'Proporcione solo un parametro: ruc o dni, no ambos.' },
      { status: 400 }
    )
  }

  try {
    // --- RUC query ---
    if (ruc) {
      // Quick format validation before hitting the API
      if (!validarRUC(ruc)) {
        return NextResponse.json(
          {
            error: `RUC "${ruc}" no es valido. Debe tener 11 digitos con un digito verificador correcto.`,
            code: 'INVALID_RUC',
          },
          { status: 400 }
        )
      }

      const result = await consultarRUC(ruc)

      if (result.error) {
        const statusMap: Record<string, number> = {
          INVALID_RUC: 400,
          NOT_FOUND: 404,
          RATE_LIMITED: 429,
          API_ERROR: 502,
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
        NextResponse.json({
          type: 'ruc',
          data: result.data,
        }),
        rateLimitResult
      )
    }

    // --- DNI query ---
    if (dni) {
      if (!validarDNI(dni)) {
        return NextResponse.json(
          {
            error: `DNI "${dni}" no es valido. Debe tener exactamente 8 digitos.`,
            code: 'INVALID_DNI',
          },
          { status: 400 }
        )
      }

      const result = await consultarDNI(dni)

      if (result.error) {
        const statusMap: Record<string, number> = {
          INVALID_DNI: 400,
          NOT_FOUND: 404,
          RATE_LIMITED: 429,
          API_ERROR: 502,
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
        NextResponse.json({
          type: 'dni',
          data: result.data,
        }),
        rateLimitResult
      )
    }

    // Should never reach here due to the guard above, but just in case
    return NextResponse.json(
      { error: 'Parametro no reconocido.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[API /integrations/sunat] Error inesperado:', error)
    return withRateLimitHeaders(
      NextResponse.json(
        { error: 'Error interno al consultar SUNAT.' },
        { status: 500 }
      ),
      rateLimitResult
    )
  }
})
