import Link from 'next/link'
import { SignIn } from '@clerk/nextjs'
import { ArrowRight, Briefcase, Clock, FileSignature, Receipt, ShieldCheck } from 'lucide-react'
import { workerAuthAppearance } from '@/components/mi-portal/worker-auth-appearance'

export const metadata = {
  title: 'Ingreso trabajador | Mi Portal Comply360',
  description: 'Accede a boletas, asistencia, documentos, contratos y solicitudes desde tu portal trabajador.',
  robots: { index: false },
}

export default function WorkerSignInPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
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
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_520px]">
        <section className="max-w-xl">
          <Link href="/" className="inline-flex items-center gap-3 text-sm font-bold text-emerald-300">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
              <ShieldCheck className="h-5 w-5" />
            </span>
            COMPLY360
          </Link>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Acceso exclusivo para trabajadores
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Entra a tu portal laboral sin pasar por el panel empresa.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Este ingreso te lleva directo a boletas, asistencia, documentos,
            contratos, solicitudes y capacitaciones. Si también eres dueño o socio,
            podrás elegir el modo correcto al iniciar sesión.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <WorkerFeature icon={<Clock className="h-4 w-4" />} label="Asistencia diaria" />
            <WorkerFeature icon={<Receipt className="h-4 w-4" />} label="Boletas de pago" />
            <WorkerFeature icon={<FileSignature className="h-4 w-4" />} label="Contratos y firmas" />
            <WorkerFeature icon={<Briefcase className="h-4 w-4" />} label="Solicitudes y legajo" />
          </div>

          <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
            ¿Eres empleador o administrador?{' '}
            <Link href="/sign-in" className="font-bold text-emerald-300 hover:text-emerald-200">
              Ingresa al panel empresa <ArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <section className="rounded-[32px] border border-emerald-400/30 bg-slate-900/80 p-4 shadow-2xl shadow-emerald-950/40 sm:p-6">
          <div className="rounded-[28px] bg-white p-5 text-slate-950 shadow-2xl sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                Ingreso trabajador
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">Mi portal personal</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Usa el mismo correo donde recibiste la invitación de tu empresa.
              </p>
            </div>
            <SignIn
              forceRedirectUrl="/post-login?intent=worker"
              fallbackRedirectUrl="/post-login?intent=worker"
              signUpUrl="/mi-portal/registrarse"
              appearance={workerAuthAppearance}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function WorkerFeature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 text-sm font-semibold text-slate-200">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
        {icon}
      </span>
      {label}
    </div>
  )
}
