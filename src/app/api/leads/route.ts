import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRecaptcha } from '@/lib/recaptcha'

// Rate limiter: 5 leads per IP per hour
const ipCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = ipCounts.get(ip)
  if (!record || now > record.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }
  if (record.count >= 5) return false
  record.count++
  return true
}

// =============================================
// POST /api/leads — Capture lead from public pages
// No auth required (public endpoint)
// =============================================
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intente mas tarde.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { email, companyName, companySize, sector, phone, source, scoreGlobal, multaEstimada, scoreByArea, recaptchaToken } = body

    // Validate email
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalido' }, { status: 400 })
    }

    // FIX #5.B: reCAPTCHA en endpoint público de captura de leads.
    // Bypass automático en dev sin RECAPTCHA_SECRET_KEY (helper).
    if (process.env.RECAPTCHA_SECRET_KEY) {
      const recaptcha = await verifyRecaptcha(recaptchaToken ?? '', { threshold: 0.3 })
      if (!recaptcha.success) {
        return NextResponse.json(
          { error: 'Validación anti-bot falló. Recarga la página e intenta de nuevo.' },
          { status: 403 }
        )
      }
    }

    // ── Persistencia resiliente ──────────────────────────────────────────
    // Estrategia:
    //  1. Intentar findFirst por email (más robusto que upsert con where:id='placeholder')
    //  2. Si existe → update; si no → create
    //  3. Si la tabla Lead no existe aún (migración pendiente) o cualquier
    //     otro error de DB → log + retornar 200 de todos modos para NO romper
    //     el funnel de conversión marketing. Los leads se pueden recuperar
    //     de los logs del cron/monitoring.
    try {
      const normalizedEmail = email.toLowerCase().trim()
      const existing = await prisma.lead.findFirst({
        where: { email: normalizedEmail },
      })

      const lead = existing
        ? await prisma.lead.update({
            where: { id: existing.id },
            data: {
              companyName: companyName || existing.companyName,
              companySize: companySize || existing.companySize,
              sector: sector || existing.sector,
              phone: phone || existing.phone,
              scoreGlobal:
                scoreGlobal != null ? Math.round(scoreGlobal) : existing.scoreGlobal,
              multaEstimada:
                multaEstimada != null ? multaEstimada : existing.multaEstimada,
              scoreByArea: scoreByArea || existing.scoreByArea,
            },
          })
        : await prisma.lead.create({
            data: {
              email: normalizedEmail,
              companyName: companyName || null,
              companySize: companySize || null,
              sector: sector || null,
              phone: phone || null,
              source: source || 'DIAGNOSTICO_GRATIS',
              scoreGlobal: scoreGlobal != null ? Math.round(scoreGlobal) : null,
              multaEstimada: multaEstimada != null ? multaEstimada : null,
              scoreByArea: scoreByArea || null,
            },
          })

      return NextResponse.json({ success: true, id: lead.id })
    } catch (dbErr) {
      // No rompas el funnel. Log para que ops pueda recuperar el lead.
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
      console.error('[leads] DB persist failed — returning 200 anyway', {
        email: email.toLowerCase().trim(),
        source: source || 'DIAGNOSTICO_GRATIS',
        scoreGlobal,
        multaEstimada,
        error: msg,
        hint: msg.includes('does not exist')
          ? 'Run `npx prisma migrate deploy` to create the leads table.'
          : undefined,
      })
      return NextResponse.json({
        success: true,
        persisted: false,
        message: 'Lead recibido (persistencia diferida)',
      })
    }
  } catch (error) {
    console.error('Lead capture error:', error)
    return NextResponse.json({ error: 'Error al guardar datos' }, { status: 500 })
  }
}
