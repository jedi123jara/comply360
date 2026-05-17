import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Building2, ShieldCheck, UserRound } from 'lucide-react'
import { getAuthContext } from '@/lib/auth'
import { resolveWorkerForAuth } from '@/lib/worker-auth'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Elegir acceso | Comply360',
  robots: { index: false },
}

export default async function ElegirAccesoPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/sign-in')

  const worker = await resolveWorkerForAuth(ctx, { includeProfile: true })

  if (ctx.role === 'WORKER') redirect('/mi-portal')
  if (!worker) redirect(ctx.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard')

  const businessHref = ctx.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'
  const workerName = `${worker.firstName ?? ''} ${worker.lastName ?? ''}`.trim()

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">Comply360</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
              Acceso dual
            </p>
          </div>
        </div>

        <section className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
            Hola de nuevo
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            Esta cuenta tiene acceso empresarial y portal trabajador.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Elige con qué modo quieres continuar. Separarlos evita que un trabajador
            termine en el dashboard por accidente y mantiene ambos mundos ordenados.
          </p>
        </section>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <AccessCard
            href={businessHref}
            icon={<Building2 className="h-5 w-5" />}
            eyebrow="Empresa"
            title="Panel de gestión"
            body="Alertas, trabajadores, contratos, planilla, SST y configuración de la empresa."
            action="Entrar al panel"
          />
          <AccessCard
            href="/mi-portal"
            icon={<UserRound className="h-5 w-5" />}
            eyebrow="Trabajador"
            title={workerName ? `Portal de ${workerName}` : 'Mi portal trabajador'}
            body="Boletas, asistencia, solicitudes, documentos, contratos, capacitaciones y perfil personal."
            action="Entrar a mi portal"
            featured
          />
        </div>
      </div>
    </main>
  )
}

function AccessCard({
  href,
  icon,
  eyebrow,
  title,
  body,
  action,
  featured,
}: {
  href: string
  icon: React.ReactNode
  eyebrow: string
  title: string
  body: string
  action: string
  featured?: boolean
}) {
  return (
    <Link
      href={href}
      className={
        featured
          ? 'group rounded-2xl border border-emerald-400/60 bg-emerald-400/10 p-5 shadow-2xl shadow-emerald-950/30 transition hover:border-emerald-300 hover:bg-emerald-400/15'
          : 'group rounded-2xl border border-slate-700 bg-slate-900/70 p-5 transition hover:border-slate-500 hover:bg-slate-900'
      }
    >
      <div
        className={
          featured
            ? 'flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400 text-slate-950'
            : 'flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-200'
        }
      >
        {icon}
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-400">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
        {action}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
