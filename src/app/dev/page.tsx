import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  FlaskConical,
  ClipboardCheck,
  LayoutDashboard,
  Palette,
  PanelsTopLeft,
  ShieldCheck,
  Siren,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Vistas previas de diseño',
  robots: { index: false, follow: false },
}

interface PreviewLink {
  href: string
  title: string
  description: string
  icon: LucideIcon
  variants?: ReadonlyArray<{ href: string; label: string }>
}

const SHELL_PREVIEWS: readonly PreviewLink[] = [
  {
    href: '/dev/shell',
    title: 'Shell del dashboard',
    description:
      'Menú lateral, barra superior, paleta de comandos (Ctrl+K), asistente (Ctrl+I), cajón de calculadoras y aviso de mejora de plan.',
    icon: PanelsTopLeft,
    variants: [
      { href: '/dev/shell?plan=FREE', label: 'Plan gratuito' },
      { href: '/dev/shell?plan=STARTER', label: 'Plan Starter' },
      { href: '/dev/shell?trial=1', label: 'Prueba gratuita activa' },
    ],
  },
  {
    href: '/dev/cockpit',
    title: 'Panel principal',
    description:
      'El panel real que ve la empresa al entrar a /dashboard: resumen, KPIs, prioridades y próximo vencimiento.',
    icon: LayoutDashboard,
    variants: [
      { href: '/dev/cockpit?escenario=alerta', label: 'Con alerta crítica' },
      { href: '/dev/cockpit?escenario=vacio', label: 'Cuenta nueva' },
    ],
  },
  {
    href: '/dev/worker',
    title: 'Perfil del trabajador',
    description: 'Cabecera y pestañas del perfil con un trabajador ficticio y su legajo de ejemplo.',
    icon: UserRound,
  },
  {
    href: '/dev/diagnostico-resultado',
    title: 'Resultado del diagnóstico',
    description: 'Brechas, preguntas «Por verificar» (No sé) y un área que no aplica, con el motor real.',
    icon: ClipboardCheck,
  },
]

const STANDALONE_PREVIEWS: readonly PreviewLink[] = [
  {
    href: '/dev/ui',
    title: 'Sistema de diseño',
    description: 'Componentes base (botones, tarjetas, insignias, modales, pestañas) y sus variantes.',
    icon: Palette,
  },
  {
    href: '/dev/diagnostic-intro',
    title: 'Portada del diagnóstico',
    description: 'Propuesta tipo Typeform para el diagnóstico SUNAFIL: portada, preguntas y resultado.',
    icon: ShieldCheck,
  },
  {
    href: '/dev/simulacro-intro',
    title: 'Portada del simulacro',
    description: 'Propuesta inmersiva del simulacro SUNAFIL con inspector virtual y acta final.',
    icon: Siren,
  },
]

export default function DevIndexPage() {
  return (
    <main className="min-h-screen bg-[color:var(--bg-canvas)] px-4 py-10 text-[color:var(--text-primary)] sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <header className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
            Solo en desarrollo
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Vistas previas de diseño</h1>
          <p className="max-w-2xl text-base leading-relaxed text-[color:var(--text-secondary)]">
            Revisa la interfaz de Comply360 sin iniciar sesión y sin base de datos. Todo lo que ves aquí usa datos
            de ejemplo. En producción estas rutas devuelven 404.
          </p>
        </header>

        <PreviewGroup
          title="Dentro del shell del dashboard"
          description="Usan el menú lateral, la barra superior y los providers reales del dashboard, con el tema claro y una API simulada."
          items={SHELL_PREVIEWS}
        />

        <PreviewGroup
          title="Pantallas sueltas"
          description="Catálogo de componentes y propuestas de pantallas que se ven sin el shell."
          items={STANDALONE_PREVIEWS}
        />
      </div>
    </main>
  )
}

function PreviewGroup({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: readonly PreviewLink[]
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">{description}</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.href}>
            <PreviewCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function PreviewCard({ item }: { item: PreviewLink }) {
  const Icon = item.icon
  return (
    <article className="flex h-full flex-col rounded-2xl border border-[color:var(--border-default)] bg-white p-5 shadow-[var(--elevation-1)] transition hover:border-blue-300 hover:shadow-[var(--elevation-2)]">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold">
          <Link href={item.href} className="hover:text-blue-700 hover:underline underline-offset-2">
            {item.title}
          </Link>
        </h3>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-[color:var(--text-secondary)]">{item.description}</p>
      {item.variants?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.variants.map((variant) => (
            <Link
              key={variant.href}
              href={variant.href}
              className="rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-inset)] px-2.5 py-1 text-xs font-medium text-[color:var(--text-secondary)] transition-colors hover:border-blue-300 hover:text-blue-700"
            >
              {variant.label}
            </Link>
          ))}
        </div>
      ) : null}
      <Link
        href={item.href}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline underline-offset-2"
      >
        Abrir <span className="font-mono text-xs font-normal text-[color:var(--text-tertiary)]">{item.href}</span>
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </article>
  )
}
