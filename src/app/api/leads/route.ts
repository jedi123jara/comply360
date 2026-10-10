import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { sendEmail } from '@/lib/email'
import { BRAND } from '@/lib/brand'

// Valores del enum LeadSource. Las calculadoras mandan `source` libres
// ("calc-cts"...): antes fallaba el create y el lead se perdía en silencio.
const LEAD_SOURCES = ['DIAGNOSTICO_GRATIS', 'LANDING_PAGE', 'REFERRAL', 'WEBINAR', 'MANUAL'] as const
type LeadSourceValue = (typeof LEAD_SOURCES)[number]

function normalizeSource(raw: unknown): LeadSourceValue {
  if (typeof raw === 'string' && (LEAD_SOURCES as readonly string[]).includes(raw)) {
    return raw as LeadSourceValue
  }
  return raw ? 'LANDING_PAGE' : 'DIAGNOSTICO_GRATIS'
}

function clip(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Aviso interno de una consulta del sitio. No bloquea la respuesta. */
async function notifyContact(data: Record<string, string | null>): Promise<void> {
  const to = process.env.LEADS_NOTIFY_EMAIL || BRAND.supportEmail
  const rows = Object.entries(data)
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#475569">${escapeHtml(k)}</td><td style="padding:4px 0;color:#0B1B36">${escapeHtml(v as string)}</td></tr>`,
    )
    .join('')
  await sendEmail({
    to,
    subject: `Nueva consulta en comply360.pe: ${data.Interés ?? 'contacto'}`,
    html: `<h2 style="font-family:sans-serif;color:#0B1B36">Nueva consulta desde la web</h2><table style="font-family:sans-serif;font-size:14px">${rows}</table>`,
  })
}

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
    const { email, sector, scoreGlobal, multaEstimada, recaptchaToken } = body
    const companyName = clip(body.companyName, 160)
    const companySize = clip(body.companySize, 40)
    const phone = clip(body.phone, 30)
    const source = normalizeSource(body.source)

    // Campos del formulario de contacto del sitio (opcionales).
    const contactName = clip(body.name, 120)
    const contactMessage = clip(body.message, 2000)
    const contactInterest = clip(body.interest, 60)
    const origin = clip(body.origen, 60) ?? clip(body.source, 60)
    const isContact = Boolean(contactName || contactMessage || contactInterest)

    // Campo trampa: si viene lleno es un bot. Respondemos 200 sin guardar.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return NextResponse.json({ success: true })
    }

    // Validate email
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Correo inválido' }, { status: 400 })
    }

    // El esquema no tiene columnas de contacto: los datos del formulario viajan
    // en el JSON `scoreByArea` (solo si el diagnóstico no lo usa).
    const scoreByArea =
      body.scoreByArea ??
      (isContact || origin
        ? {
            ...(isContact
              ? { contacto: { nombre: contactName, interes: contactInterest, mensaje: contactMessage } }
              : {}),
            ...(origin ? { origen: origin } : {}),
          }
        : null)

    if (isContact) {
      notifyContact({
        Nombre: contactName,
        Correo: email.toLowerCase().trim(),
        Empresa: companyName,
        Teléfono: phone,
        Trabajadores: companySize,
        Interés: contactInterest,
        Mensaje: contactMessage,
        Origen: origin,
      }).catch((err) => console.error('[leads] aviso por correo falló', err))
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
              source,
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
        source,
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
