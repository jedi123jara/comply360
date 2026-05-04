import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { encryptMedical } from '@/lib/sst/medical-vault'
import { rateLimit } from '@/lib/rate-limit'

/**
 * POST /api/public/arco
 *
 * Endpoint PÚBLICO (sin auth) para que cualquier ciudadano ejerza sus
 * derechos ARCO sobre sus datos personales tratados por una organización
 * registrada en COMPLY360. Cumple Ley 29733 + D.S. 016-2024-JUS Art. 41.
 *
 * Cuerpo:
 *   {
 *     orgId: string             // ID de la organización
 *     solicitanteDni: string    // DNI del titular
 *     solicitanteName: string   // Nombre completo
 *     tipo: 'ACCESO' | 'RECTIFICACION' | 'CANCELACION' | 'OPOSICION' | 'PORTABILIDAD'
 *     detalle: string           // Descripción de qué se solicita
 *     contactoEmail?: string    // Para que la org responda
 *     contactoTelefono?: string
 *   }
 *
 * Retorna:
 *   { code: 'ARCO-XXXXXXXX', slaHasta: ISO, message: string }
 *
 * Seguridad:
 *   - Rate limit 3 req/min por IP (evita spam de DPO)
 *   - El detalle se cifra inmediatamente con MEDICAL_VAULT_KEY
 *   - El email/teléfono van en el detalle cifrado (también son datos personales)
 */

const arcoLimiter = rateLimit({ interval: 60_000, limit: 3 })

const publicArcoSchema = z.object({
  orgId: z.string().min(1),
  solicitanteDni: z
    .string()
    .min(8, 'DNI debe tener al menos 8 dígitos')
    .max(15)
    .regex(/^\d+$/, 'DNI debe ser numérico'),
  solicitanteName: z.string().min(3).max(150),
  tipo: z.enum(['ACCESO', 'RECTIFICACION', 'CANCELACION', 'OPOSICION', 'PORTABILIDAD']),
  detalle: z.string().min(20, 'Describe tu solicitud con al menos 20 caracteres').max(4000),
  contactoEmail: z.string().email().optional().or(z.literal('')),
  contactoTelefono: z.string().max(30).optional(),
})

function addBusinessDays(from: Date, days: number): Date {
  const r = new Date(from)
  let added = 0
  while (added < days) {
    r.setDate(r.getDate() + 1)
    const dow = r.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return r
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const rl = await arcoLimiter.check(req, `arco-public:${ip}`)
  if (!rl.success && rl.response) return rl.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const parsed = publicArcoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  // Verificar que la organización existe
  const org = await prisma.organization.findUnique({
    where: { id: data.orgId },
    select: { id: true, name: true, alertEmail: true },
  })
  if (!org) {
    return NextResponse.json(
      { error: 'Organización no encontrada' },
      { status: 404 },
    )
  }

  // Combinar detalle + contacto en un solo blob cifrado (todo es PII).
  const fullDetail = JSON.stringify({
    detalle: data.detalle,
    contactoEmail: data.contactoEmail || null,
    contactoTelefono: data.contactoTelefono || null,
    submittedAt: new Date().toISOString(),
    ip,
    userAgent: req.headers.get('user-agent') ?? null,
  })

  const detalleCifrado = await encryptMedical(prisma, fullDetail)
  const slaHasta = addBusinessDays(new Date(), 20) // 20 días hábiles Art. 41

  const solicitud = await prisma.solicitudARCO.create({
    data: {
      orgId: data.orgId,
      solicitanteDni: data.solicitanteDni,
      solicitanteName: data.solicitanteName,
      tipo: data.tipo,
      detalleCifrado,
      estado: 'RECIBIDA',
      slaHasta,
    },
    select: {
      id: true,
      tipo: true,
      slaHasta: true,
      createdAt: true,
    },
  })

  // Código humano (últimos 8 chars del cuid, uppercase)
  const code = `ARCO-${solicitud.id.slice(-8).toUpperCase()}`

  await prisma.auditLog
    .create({
      data: {
        orgId: data.orgId,
        action: 'sst.arco.created.public',
        entityType: 'SolicitudARCO',
        entityId: solicitud.id,
        metadataJson: {
          tipo: solicitud.tipo,
          slaHasta: solicitud.slaHasta.toISOString(),
          source: 'public-portal',
          ip,
        },
      },
    })
    .catch(() => undefined)

  return NextResponse.json(
    {
      code,
      slaHasta: solicitud.slaHasta.toISOString(),
      message:
        'Tu solicitud ha sido registrada. La organización debe responderte en máximo 20 días hábiles.',
    },
    { status: 201 },
  )
}
