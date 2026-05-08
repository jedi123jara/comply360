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

import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { ArrowRight, FileText, GraduationCap, Briefcase, ShieldCheck } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero / Beneficios — Lado izquierdo */}
          <div className="space-y-8 order-2 lg:order-1">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 mb-6"
              >
                <span className="text-2xl">🛡️</span>
                <span>COMPLY360</span>
              </Link>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold ring-1 ring-emerald-200 mb-4">
                <ShieldCheck className="w-3 h-3" />
                100% gratis para trabajadores
              </div>

              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
              >
                Tu carrera laboral en{' '}
                <span className="text-emerald-600 italic">un solo lugar</span>.
              </h1>

              <p className="mt-4 text-base sm:text-lg text-slate-700 leading-relaxed">
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
            <div className="rounded-xl bg-white/70 backdrop-blur ring-1 ring-slate-200 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900 mb-1">¿Tu empresa ya te invitó?</p>
              <p className="text-xs">
                Revisa tu bandeja de entrada — debería haberte llegado un link directo. Si no
                encuentras el correo, créate la cuenta acá con el mismo email y se vincula
                automáticamente.{' '}
                <Link href="/sign-in" className="text-emerald-700 font-semibold underline">
                  ¿Ya tienes cuenta? Inicia sesión
                </Link>
              </p>
            </div>
          </div>

          {/* Form Clerk — Lado derecho */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-2xl shadow-2xl shadow-emerald-100 ring-1 ring-emerald-100 p-2 sm:p-4">
              <SignUp
                forceRedirectUrl="/mi-portal/bienvenida"
                fallbackRedirectUrl="/mi-portal/bienvenida"
                signInUrl="/sign-in"
                /* unsafeMetadata se persiste en el Clerk User y JIT lo lee
                   para crear el User como WORKER sin organization. */
                unsafeMetadata={{ signupAs: 'WORKER' }}
                appearance={{
                  variables: {
                    colorPrimary: '#2563eb',
                    colorText: '#0f172a',
                    colorTextSecondary: '#64748b',
                    colorBackground: '#ffffff',
                    colorInputBackground: '#ffffff',
                    colorInputText: '#0f172a',
                    borderRadius: '12px',
                    fontFamily: 'var(--font-jakarta), var(--font-geist-sans), sans-serif',
                  },
                  elements: {
                    rootBox: 'mx-auto w-full',
                    card: 'shadow-none border-none',
                    headerTitle: 'text-emerald-700 text-xl',
                    headerSubtitle: 'text-slate-600 text-sm',
                    formButtonPrimary:
                      'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md',
                    footerAction: 'text-emerald-700',
                    identityPreviewEditButton: 'text-emerald-700',
                    formFieldInput:
                      'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20',
                    socialButtonsBlockButton: 'border-slate-200 hover:bg-slate-50',
                  },
                }}
              />
            </div>

            <p className="mt-4 text-center text-xs text-slate-500">
              Al registrarte aceptas nuestros{' '}
              <Link href="/terminos" className="underline hover:text-slate-700">
                Términos
              </Link>{' '}
              y{' '}
              <Link href="/privacidad" className="underline hover:text-slate-700">
                Política de Privacidad
              </Link>
              .
            </p>

            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                ¿Eres empleador?{' '}
                <span className="text-emerald-700 font-semibold">
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-slate-900">{title}</h3>
        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}
