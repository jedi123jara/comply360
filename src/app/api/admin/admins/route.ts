/**
 * GET    /api/admin/admins           — lista admins (con título del último promote)
 *                                      + invites pendientes (sin cuenta aún)
 * POST   /api/admin/admins           — promueve a SUPER_ADMIN por email
 *                                      body: { email: string; title?: string }
 *                                      → si ya existe: promote inmediato + log
 *                                      → si no existe: pending + email Resend
 * DELETE /api/admin/admins?email=    — revoca SUPER_ADMIN (baja a OWNER)
 *                                      o borra invite pendiente
 *
 * Protegido: solo SUPER_ADMIN.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/client'

const VALID_TITLES = [
  'Founder',
  'Admin',
  'Developer',
  'Marketing',
  'Diseño',
  'Ventas',
  'Otro',
] as const
type AdminTitle = (typeof VALID_TITLES)[number]

// Normaliza un email para uso como llave (lowercase + trim).
function normEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const e = raw.trim().toLowerCase()
  if (!e.includes('@') || e.length > 255) return null
  return e
}

// Busca el último título asignado a un user vía AuditLog.
async function titleForEmail(email: string): Promise<AdminTitle | null> {
  const log = await prisma.auditLog.findFirst({
    where: {
      action: { in: ['ADMIN_PROMOTED', 'ADMIN_PENDING'] },
      entityType: 'User',
    },
    orderBy: { createdAt: 'desc' },
    select: { metadataJson: true, entityId: true },
    // Buscamos por email contenido en metadataJson o en entityId (para pending)
    // pero Prisma no permite where sobre Json fácilmente: traemos N recientes
    // y filtramos manualmente en el caller.
  })
  const meta = (log?.metadataJson as Record<string, unknown>) ?? {}
  const t = typeof meta.title === 'string' ? meta.title : null
  return (VALID_TITLES as readonly string[]).includes(t ?? '') ? (t as AdminTitle) : null
}

export const GET = withSuperAdmin(async () => {
  // 1. Usuarios con rol SUPER_ADMIN
  const admins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      orgId: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // 2. Buscar título del último ADMIN_PROMOTED por cada admin (join en memoria)
  const promotedLogs = await prisma.auditLog.findMany({
    where: {
      action: 'ADMIN_PROMOTED',
      entityType: 'User',
      entityId: { in: admins.map((a) => a.id) },
    },
    orderBy: { createdAt: 'desc' },
    select: { entityId: true, metadataJson: true },
  })
  const titleByUserId = new Map<string, string>()
  for (const log of promotedLogs) {
    if (!log.entityId || titleByUserId.has(log.entityId)) continue
    const meta = (log.metadataJson as Record<string, unknown>) ?? {}
    if (typeof meta.title === 'string') titleByUserId.set(log.entityId, meta.title)
  }
  const enrichedAdmins = admins.map((a) => ({
    ...a,
    title: titleByUserId.get(a.id) ?? 'Admin',
  }))

  // 3. Invites pendientes (sin user real todavía)
  const pendingLogs = await prisma.auditLog.findMany({
    where: {
      action: 'ADMIN_PENDING',
      entityType: 'User',
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, entityId: true, metadataJson: true, createdAt: true },
    take: 100,
  })
  // Filtramos pending que ya tengan user (significa que ya se registraron)
  const existingEmails = new Set(admins.map((a) => a.email.toLowerCase()))
  const seenEmails = new Set<string>()
  const pending = [] as Array<{
    email: string
    title: string
    invitedAt: string
    logId: string
  }>
  for (const log of pendingLogs) {
    const email = log.entityId?.toLowerCase() ?? ''
    if (!email || existingEmails.has(email) || seenEmails.has(email)) continue
    seenEmails.add(email)
    const meta = (log.metadataJson as Record<string, unknown>) ?? {}
    pending.push({
      email,
      title: typeof meta.title === 'string' ? meta.title : 'Admin',
      invitedAt: log.createdAt.toISOString(),
      logId: log.id,
    })
  }

  return NextResponse.json({ admins: enrichedAdmins, pending })
})

export const POST = withSuperAdmin(async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const email = normEmail(body?.email)
  if (!email) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })

  const rawTitle = typeof body?.title === 'string' ? body.title.trim() : 'Admin'
  const title: AdminTitle = (VALID_TITLES as readonly string[]).includes(rawTitle)
    ? (rawTitle as AdminTitle)
    : 'Admin'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://comply360.pe'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    if (existing.role === 'SUPER_ADMIN') {
      // Ya es admin, solo actualiza el título (nuevo log con el título)
      await prisma.auditLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'ADMIN_PROMOTED',
          entityType: 'User',
          entityId: existing.id,
          metadataJson: { email, title, alreadyAdmin: true },
        },
      })
      return NextResponse.json({
        ok: true,
        alreadyAdmin: true,
        message: `${email} ya es SUPER_ADMIN, actualicé su título a ${title}`,
        title,
      })
    }

    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    })
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'ADMIN_PROMOTED',
        entityType: 'User',
        entityId: updated.id,
        metadataJson: { email, title, previousRole: existing.role },
      },
    })

    // Email de "ahora sos admin"
    try {
      await sendEmail({
        to: email,
        subject: 'Ahora sos administrador en COMPLY360',
        html: adminPromotedEmail({
          name: updated.firstName ?? email,
          title,
          adminUrl: `${appUrl}/admin`,
        }),
      })
    } catch (e) {
      console.error('[admins] email promote send failed:', e)
    }

    return NextResponse.json({ ok: true, user: updated, title })
  }

  // Usuario no existe: guardamos pending + mandamos invitación
  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'ADMIN_PENDING',
      entityType: 'User',
      entityId: email,
      metadataJson: { email, title, invitedAt: new Date().toISOString() },
    },
  })

  try {
    await sendEmail({
      to: email,
      subject: 'Te invitaron a COMPLY360 como administrador',
      html: adminInvitedEmail({
        title,
        signupUrl: `${appUrl}/sign-up`,
      }),
    })
  } catch (e) {
    console.error('[admins] email invite send failed:', e)
  }

  return NextResponse.json({
    ok: true,
    pending: true,
    email,
    title,
    message: `Invité a ${email} como ${title}. Cuando se registre en comply360.pe, se convierte automáticamente en administrador.`,
  })
})

export const DELETE = withSuperAdmin(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const target = normEmail(searchParams.get('email'))
  if (!target) return NextResponse.json({ error: 'Falta ?email=' }, { status: 400 })

  if (ctx.email && target === ctx.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'No podés revocarte administrador a vos mismo.' },
      { status: 400 },
    )
  }

  const existing = await prisma.user.findUnique({ where: { email: target } })

  // Caso 1: usuario existe y es SUPER_ADMIN → revocamos
  if (existing && existing.role === 'SUPER_ADMIN') {
    await prisma.user.update({
      where: { email: target },
      data: { role: 'OWNER' },
    })
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'ADMIN_REVOKED',
        entityType: 'User',
        entityId: existing.id,
        metadataJson: { email: target },
      },
    })
    return NextResponse.json({ ok: true, revoked: 'user' })
  }

  // Caso 2: pending sin cuenta → borra todos los PENDING logs con ese email
  const deleted = await prisma.auditLog.deleteMany({
    where: {
      action: 'ADMIN_PENDING',
      entityType: 'User',
      entityId: target,
    },
  })
  if (deleted.count === 0 && !existing) {
    return NextResponse.json(
      { error: 'No encontré admin ni invitación con ese email.' },
      { status: 404 },
    )
  }
  if (existing && existing.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: `El usuario existe pero no es SUPER_ADMIN (role: ${existing.role}).` },
      { status: 400 },
    )
  }

  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'ADMIN_INVITE_CANCELLED',
      entityType: 'User',
      entityId: target,
      metadataJson: { email: target, cancelledCount: deleted.count },
    },
  })
  return NextResponse.json({ ok: true, revoked: 'pending', count: deleted.count })
})

// ─── Email templates (inline) ───────────────────────────────────────

function adminInvitedEmail({
  title,
  signupUrl,
}: {
  title: string
  signupUrl: string
}): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, Inter, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #00d084 0%, #059669 100%); padding: 16px 24px; border-radius: 12px; color: white; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">
          COMPLY 360
        </div>
      </div>
      <h1 style="font-size: 22px; color: #0a0a0f; margin: 0 0 12px; font-weight: 600;">
        Te invitaron a unirte como <span style="color: #00a86b;">${title}</span>
      </h1>
      <p style="font-size: 15px; color: #525252; line-height: 1.6; margin: 0 0 24px;">
        Alguien del equipo de COMPLY360 te invitó como administrador de la plataforma.
        Tendrás acceso al panel de administración global, métricas, empresas, billing y más.
      </p>
      <p style="font-size: 15px; color: #525252; line-height: 1.6; margin: 0 0 24px;">
        Para activar tu acceso, solo tenés que registrarte con este mismo email:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${signupUrl}" style="display: inline-block; background: #00d084; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Crear mi cuenta en COMPLY360
        </a>
      </div>
      <p style="font-size: 13px; color: #a0a0a0; margin-top: 32px; text-align: center;">
        Si no esperabas esta invitación, podés ignorar este email.
      </p>
    </div>
  `
}

function adminPromotedEmail({
  name,
  title,
  adminUrl,
}: {
  name: string
  title: string
  adminUrl: string
}): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, Inter, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #00d084 0%, #059669 100%); padding: 16px 24px; border-radius: 12px; color: white; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">
          COMPLY 360
        </div>
      </div>
      <h1 style="font-size: 22px; color: #0a0a0f; margin: 0 0 12px; font-weight: 600;">
        Hola ${name} — ahora sos <span style="color: #00a86b;">${title}</span> 🎉
      </h1>
      <p style="font-size: 15px; color: #525252; line-height: 1.6; margin: 0 0 24px;">
        Un administrador te promovió al panel de COMPLY360. Ya podés entrar:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${adminUrl}" style="display: inline-block; background: #00d084; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Abrir Panel de Administración
        </a>
      </div>
    </div>
  `
}
