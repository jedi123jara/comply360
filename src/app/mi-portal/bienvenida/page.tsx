/**
 * /mi-portal/bienvenida — Landing first-time del worker self-serve.
 *
 * Después del signup vía /mi-portal/registrarse, el worker llega aquí.
 * Le explicamos qué puede hacer en su cuenta libre y le ofrecemos
 * acciones inmediatas para mejorar engagement:
 *
 *   1. Completar perfil (foto, dirección, teléfono) — habilita CV
 *   2. Crear su primer CV (Sprint 8+)
 *   3. Empezar capacitaciones gratis (Sprint 9+)
 *   4. Ver bolsa de trabajo (Sprint 10+)
 *
 * Si el worker fue invitado por una empresa pero se registró desde acá
 * (mismo email), el endpoint /api/mi-portal/check-empresa-link detecta
 * el match por email y lo vincula automáticamente — entonces verá
 * además "Tu empresa [NOMBRE] te está esperando" con CTA al portal.
 *
 * Server Component para auth + lookup de vinculación automática.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ArrowRight, User, FileText, GraduationCap, Briefcase, Building2, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Bienvenido a Comply360 | Mi Portal',
  description: 'Completa tu perfil y empieza a usar tu cuenta de trabajador',
  robots: { index: false },
}

export default async function BienvenidaPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/sign-in')
  if (ctx.role !== 'WORKER') redirect('/post-login')

  // Detectar si el worker tiene Worker entry vinculada a alguna empresa
  // (el JIT puede haber creado la User pero el Worker se crea cuando una
  // empresa lo agrega — buscamos por email para auto-link).
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { firstName: true, lastName: true, email: true, worker: { select: { id: true, orgId: true, organization: { select: { name: true, razonSocial: true } } } } },
  })

  // Si no encontramos worker entry pero el email coincide con un Worker
  // creado por una empresa, hacer auto-link.
  let linkedEmpresa: { name: string; orgId: string } | null = null
  if (!user?.worker && user?.email) {
    const orphanWorker = await prisma.worker.findFirst({
      where: { email: user.email, userId: null },
      select: { id: true, orgId: true, organization: { select: { name: true, razonSocial: true } } },
    })
    if (orphanWorker) {
      // Vincular!
      await prisma.worker.update({
        where: { id: orphanWorker.id },
        data: { userId: ctx.userId },
      })
      // Update User.orgId también para que ctx tenga su empresa
      await prisma.user.update({
        where: { id: ctx.userId },
        data: { orgId: orphanWorker.orgId },
      })
      linkedEmpresa = {
        name: orphanWorker.organization?.razonSocial ?? orphanWorker.organization?.name ?? 'tu empresa',
        orgId: orphanWorker.orgId,
      }

      // AuditLog para tracking
      await prisma.auditLog
        .create({
          data: {
            orgId: orphanWorker.orgId,
            userId: ctx.userId,
            action: 'WORKER_AUTO_LINKED',
            entityType: 'Worker',
            entityId: orphanWorker.id,
            metadataJson: { method: 'email_match_self_signup' },
          },
        })
        .catch(() => null)
    }
  } else if (user?.worker?.organization) {
    linkedEmpresa = {
      name: user.worker.organization.razonSocial ?? user.worker.organization.name ?? 'tu empresa',
      orgId: user.worker.orgId,
    }
  }

  const firstName = user?.firstName ?? 'trabajador'

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero bienvenida */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white mb-4 shadow-lg shadow-emerald-200">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-slate-900"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
          >
            ¡Bienvenido, <span className="text-emerald-600 italic">{firstName}</span>!
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-xl mx-auto">
            Tu cuenta de trabajador está activa. Empieza a construir tu carrera laboral desde acá.
          </p>
        </div>

        {/* Auto-link banner — si se vinculó con una empresa */}
        {linkedEmpresa ? (
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 ring-1 ring-emerald-200 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-emerald-900 text-base">
                  ✓ Te vinculamos con <strong>{linkedEmpresa.name}</strong>
                </h3>
                <p className="text-sm text-emerald-800 mt-1 leading-relaxed">
                  Tu empleador ya te tenía registrado. Ahora puedes ver tus boletas, firmar
                  contratos, gestionar vacaciones y recibir notificaciones de tu trabajo.
                </p>
                <Link
                  href="/mi-portal"
                  className="inline-flex items-center gap-1.5 mt-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2"
                >
                  Ir a mi portal de trabajador
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 text-base">Aún no estás vinculado a una empresa</h3>
                <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                  Cuando una empresa peruana que use Comply360 te agregue a su planilla con tu
                  email <strong>{user?.email ?? ''}</strong>, te vincularemos automáticamente.
                  Mientras tanto, aprovecha las herramientas gratis de abajo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4 acciones para construir el perfil */}
        <h2 className="text-xl font-bold text-slate-900 mb-4">Empieza por aquí</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <ActionCard
            icon={<User className="w-5 h-5" />}
            title="Completa tu perfil"
            body="Foto, dirección, teléfono. Datos básicos para que las empresas te conozcan."
            href="/mi-portal/perfil"
            ctaLabel="Configurar perfil"
            primary
          />
          <ActionCard
            icon={<FileText className="w-5 h-5" />}
            title="Crea tu CV gratis"
            body="Plantillas modernas. Auto-llenado con tus datos. Exporta PDF cuando quieras."
            href="#"
            ctaLabel="Próximamente"
            disabled
            badge="Sprint 8"
          />
          <ActionCard
            icon={<GraduationCap className="w-5 h-5" />}
            title="Capacitaciones gratis"
            body="Hostigamiento, SST, primeros auxilios. Certificado QR válido SUNAFIL."
            href="#"
            ctaLabel="Próximamente"
            disabled
            badge="Sprint 9"
          />
          <ActionCard
            icon={<Briefcase className="w-5 h-5" />}
            title="Bolsa de trabajo"
            body="Empresas peruanas buscan trabajadores como tú. Postula con un click."
            href="#"
            ctaLabel="Próximamente"
            disabled
            badge="Sprint 10"
          />
        </div>

        {/* Footer note */}
        <div className="mt-12 text-center">
          <Link
            href="/mi-portal"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            Saltar al portal completo
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function ActionCard({
  icon,
  title,
  body,
  href,
  ctaLabel,
  primary,
  disabled,
  badge,
}: {
  icon: React.ReactNode
  title: string
  body: string
  href: string
  ctaLabel: string
  primary?: boolean
  disabled?: boolean
  badge?: string
}) {
  const inner = (
    <div
      className={
        disabled
          ? 'rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-5 opacity-70 cursor-not-allowed'
          : 'rounded-2xl bg-white ring-1 ring-slate-200 hover:ring-emerald-300 hover:shadow-md p-5 transition-all'
      }
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className={
            primary
              ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md'
              : 'flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700'
          }
        >
          {icon}
        </div>
        {badge ? (
          <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ring-1 ring-amber-200">
            {badge}
          </span>
        ) : null}
      </div>
      <h3 className="font-semibold text-slate-900 text-base">{title}</h3>
      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{body}</p>
      <p
        className={
          disabled
            ? 'mt-3 text-xs font-semibold text-slate-400'
            : primary
              ? 'mt-3 text-xs font-semibold text-emerald-700'
              : 'mt-3 text-xs font-semibold text-slate-700'
        }
      >
        {ctaLabel} {!disabled && <ArrowRight className="inline w-3 h-3" />}
      </p>
    </div>
  )

  if (disabled) return <div>{inner}</div>
  return <Link href={href}>{inner}</Link>
}
