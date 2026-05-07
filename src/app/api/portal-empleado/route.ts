import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  portalEmpleadoLimiter,
  withRateLimitHeaders,
} from '@/lib/rate-limit'
import { verifyRecaptcha } from '@/lib/recaptcha'

// ---------------------------------------------------------------------------
// Abuse tracking — in-memory failed-attempt counter per IP
// ---------------------------------------------------------------------------

const failedAttempts = new Map<string, { count: number; firstAt: number }>()
const ABUSE_WINDOW_MS = 10 * 60_000 // 10-minute window
const ABUSE_THRESHOLD = 10

function trackFailedAttempt(ip: string): void {
  const now = Date.now()
  const entry = failedAttempts.get(ip)

  if (!entry || now - entry.firstAt > ABUSE_WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, firstAt: now })
    return
  }

  entry.count += 1

  if (entry.count === ABUSE_THRESHOLD) {
    console.warn(
      `[portal-empleado] ABUSE WARNING: IP ${ip} has made ${entry.count} failed lookup attempts in the last 10 minutes`
    )
  } else if (entry.count > ABUSE_THRESHOLD && entry.count % 10 === 0) {
    console.warn(
      `[portal-empleado] ABUSE WARNING: IP ${ip} has made ${entry.count} failed lookup attempts in the last 10 minutes`
    )
  }
}

// Periodic cleanup of stale abuse entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [ip, entry] of failedAttempts) {
      if (now - entry.firstAt > ABUSE_WINDOW_MS) {
        failedAttempts.delete(ip)
      }
    }
  }, 5 * 60_000)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/** Random delay between 100-500ms to prevent timing attacks */
function randomDelay(): Promise<void> {
  const ms = 100 + Math.floor(Math.random() * 400)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Generic error message — intentionally vague to avoid leaking info
const GENERIC_NOT_FOUND_MSG = 'No se encontraron datos para los criterios proporcionados'

// ---------------------------------------------------------------------------
// POST /api/portal-empleado
// Public endpoint — no auth required.
// Employees look up their own data with DNI + company code (orgId).
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  try {
    // 1. Rate limiting — 3 requests/min per IP
    const rateLimitResult = await portalEmpleadoLimiter.check(req, `portal-empleado:${ip}`)
    if (!rateLimitResult.success) {
      return rateLimitResult.response!
    }

    const body = await req.json()
    const { dni, companyCode, recaptchaToken } = body as {
      dni?: string
      companyCode?: string
      recaptchaToken?: string
    }

    // FIX #5.B: reCAPTCHA en endpoint público de lookup por DNI.
    // Previene enumeración masiva de DNIs (attacker que prueba miles de
    // combinaciones DNI+orgSlug para descubrir trabajadores).
    if (process.env.RECAPTCHA_SECRET_KEY) {
      const recaptcha = await verifyRecaptcha(recaptchaToken ?? '', { threshold: 0.4 })
      if (!recaptcha.success) {
        return withRateLimitHeaders(
          NextResponse.json(
            { error: 'Validación anti-bot falló. Recarga la página e intenta de nuevo.' },
            { status: 403 }
          ),
          rateLimitResult
        )
      }
    }

    // 2. Input validation
    if (!dni || !companyCode) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'DNI y codigo de empresa son requeridos' },
          { status: 400 }
        ),
        rateLimitResult
      )
    }

    // DNI must be exactly 8 digits
    if (!/^\d{8}$/.test(dni)) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'Formato de DNI invalido' },
          { status: 400 }
        ),
        rateLimitResult
      )
    }

    // companyCode must be a non-empty trimmed string
    const trimmedCompanyCode = companyCode.trim()
    if (trimmedCompanyCode.length === 0) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'DNI y codigo de empresa son requeridos' },
          { status: 400 }
        ),
        rateLimitResult
      )
    }

    // 3. Find worker by DNI and orgId
    const worker = await prisma.worker.findFirst({
      where: {
        dni,
        orgId: trimmedCompanyCode,
        status: { not: 'TERMINATED' },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dni: true,
        position: true,
        department: true,
        fechaIngreso: true,
        regimenLaboral: true,
        tipoContrato: true,
        status: true,
        sueldoBruto: true,
        asignacionFamiliar: true,
        tipoAporte: true,
        afpNombre: true,
        jornadaSemanal: true,
        documents: {
          select: {
            id: true,
            title: true,
            documentType: true,
            category: true,
            status: true,
            expiresAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        vacations: {
          select: {
            id: true,
            periodoInicio: true,
            periodoFin: true,
            diasCorresponden: true,
            diasGozados: true,
            diasPendientes: true,
          },
          orderBy: { periodoInicio: 'desc' },
          take: 3,
        },
      },
    })

    // 4. Apply random delay to prevent timing-based enumeration
    await randomDelay()

    if (!worker) {
      // Track failed attempt for abuse detection
      trackFailedAttempt(ip)

      // Generic message — don't reveal whether DNI or company code was wrong
      return withRateLimitHeaders(
        NextResponse.json(
          { error: GENERIC_NOT_FOUND_MSG },
          { status: 404 }
        ),
        rateLimitResult
      )
    }

    // Sanitize — don't expose raw salary, just benefits estimates
    const sueldoBruto = worker.sueldoBruto ? Number(worker.sueldoBruto) : 0
    const remuneracionComputable = sueldoBruto +
      (worker.asignacionFamiliar ? 113.0 : 0)

    return withRateLimitHeaders(
      NextResponse.json({
        profile: {
          firstName: worker.firstName,
          lastName: worker.lastName,
          dni: worker.dni,
          position: worker.position,
          department: worker.department,
          fechaIngreso: worker.fechaIngreso,
          regimenLaboral: worker.regimenLaboral,
          tipoContrato: worker.tipoContrato,
          status: worker.status,
          tipoAporte: worker.tipoAporte,
          afpNombre: worker.afpNombre,
          jornadaSemanal: worker.jornadaSemanal,
        },
        benefits: {
          remuneracionComputable,
          asignacionFamiliar: worker.asignacionFamiliar,
        },
        documents: worker.documents,
        vacations: worker.vacations,
      }),
      rateLimitResult
    )
  } catch (error) {
    console.error('[portal-empleado] Error:', error)

    // Apply random delay even on errors to avoid leaking info via timing
    await randomDelay()

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
