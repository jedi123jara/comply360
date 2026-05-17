/**
 * /mi-portal/registrarse — Worker self-serve registration.
 *
 * Página PÚBLICA (sin auth) donde cualquier trabajador peruano puede crear
 * su cuenta SIN necesidad de que una empresa lo invite.
 *
 * Flow:
 *   1. Worker llena form (Clerk SignUp con unsafeMetadata.signupAs='WORKER')
 *   2. Clerk crea la cuenta + email verification
 *   3. JIT en auth.ts detecta unsafeMetadata.signupAs y crea User con
 *      role=WORKER + orgId=null (sin empresa)
 *   4. Redirect a /mi-portal/bienvenida (landing first-time)
 *   5. Worker completa su perfil (foto, datos, CV inicial)
 *   6. Cuando una empresa lo agregue después con el mismo DNI/email, se
 *      auto-vincula via /api/workers POST que detecta User existente.
 *
 * Estratégico para Sprint 7+:
 *   - CV builder gratuito → lock-in soft sin costo
 *   - Capacitaciones gratis → lead gen para empresas
 *   - Bolsa de trabajo entre empresas Comply360 + workers libres
 *   - Foundation para app móvil nativa (cuando 5,000+ workers activos)
 */

import Link from 'next/link'
import { ArrowRight, FileText, GraduationCap, Briefcase, ShieldCheck } from 'lucide-react'
import { WorkerRegistrationCard } from '@/components/mi-portal/worker-registration-card'

export const metadata = {
  title: 'Crea tu cuenta gratis | Trabajadores Comply360',
  description:
    'Tu CV, capacitaciones laborales y postulaciones a empresas en un solo lugar. Sin costo. Para trabajadores peruanos.',
  // No queremos que esta página sea indexada por SEO competing con
  // /sign-up del dashboard. Worker registration es organic-traffic-driven.
  robots: { index: false },
}

export default function RegistrarseWorkerPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background:
            'linear-gradient(rgba(148,163,184,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.055) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(80% 60% at 50% 35%, #000 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(80% 60% at 50% 35%, #000 0%, transparent 75%)',
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_520px] lg:items-center">
          {/* Hero / Beneficios — Lado izquierdo */}
          <div className="space-y-8 order-2 lg:order-1">
            <div>
              <Link
                href="/"
                className="mb-6 inline-flex items-center gap-3 text-sm font-bold text-emerald-300 hover:text-emerald-200"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <span>COMPLY360</span>
              </Link>

              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                100% gratis para trabajadores
              </div>

              <h1
                className="text-4xl font-semibold tracking-tight leading-tight sm:text-5xl"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
              >
                Tu carrera laboral en{' '}
                <span className="text-emerald-300 italic">un solo lugar</span>.
              </h1>

              <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
                Crea tu cuenta de trabajador y empieza a construir tu CV, completar
                capacitaciones obligatorias y postular a empresas peruanas registradas en Comply360.
              </p>
            </div>

            {/* Beneficios */}
            <div className="space-y-4">
              <Beneficio
                icon={<FileText className="w-5 h-5" />}
                title="CV profesional gratis"
                body="Crea tu CV con plantillas modernas. Auto-llenado con tus datos. Exportá PDF y compartí con quien quieras."
              />
              <Beneficio
                icon={<GraduationCap className="w-5 h-5" />}
                title="Capacitaciones obligatorias"
                body="Hostigamiento, SST, primeros auxilios, etc. Certificado con QR válido SUNAFIL al terminar."
              />
              <Beneficio
                icon={<Briefcase className="w-5 h-5" />}
                title="Bolsa de trabajo"
                body="Empresas peruanas que usan Comply360 buscan trabajadores como tú. Postula con un click."
              />
              <Beneficio
                icon={<ShieldCheck className="w-5 h-5" />}
                title="Tus datos son tuyos"
                body="Si tu empresa actual te invita, vinculamos automáticamente. Si cambias de trabajo, tu historial te acompaña."
              />
            </div>

            {/* Trust strip */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
              <p className="mb-1 font-semibold text-white">¿Tu empresa ya te invitó?</p>
              <p className="text-xs leading-5">
                Revisa tu bandeja de entrada — debería haberte llegado un link directo. Si no
                encuentras el correo, créate la cuenta acá con el mismo email y se vincula
                automáticamente.{' '}
                <Link href="/mi-portal/ingresar" className="font-semibold text-emerald-300 underline">
                  ¿Ya tienes cuenta? Ingresa como trabajador
                </Link>
              </p>
            </div>
          </div>

          {/* Form Clerk — Lado derecho */}
          <div className="order-1 lg:order-2">
            <div className="rounded-[32px] border border-emerald-400/30 bg-slate-900/80 p-4 shadow-2xl shadow-emerald-950/40 sm:p-6">
              <WorkerRegistrationCard />
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              Al registrarte aceptas nuestros{' '}
              <Link href="/terminos" className="underline hover:text-slate-200">
                Términos
              </Link>{' '}
              y{' '}
              <Link href="/privacidad" className="underline hover:text-slate-200">
                Política de Privacidad
              </Link>
              .
            </p>

            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
              >
                ¿Eres empleador?{' '}
                <span className="font-semibold text-emerald-300">
                  Crea cuenta empresarial <ArrowRight className="inline w-3 h-3" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Beneficio({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{body}</p>
      </div>
    </div>
  )
}
