import Link from 'next/link'
import { Wallet, Gift, ShieldAlert, ShieldCheck, ArrowRight, Sparkles, Check } from 'lucide-react'

const CALCS = [
  {
    slug: 'cts',
    icon: Wallet,
    color: 'from-emerald-500 to-emerald-600',
    title: 'CTS — Compensación por Tiempo de Servicios',
    description:
      'Calcula el depósito semestral de mayo o noviembre con la remuneración computable actualizada.',
    usage: 'D.S. 001-97-TR',
    popular: true,
  },
  {
    slug: 'gratificacion',
    icon: Gift,
    color: 'from-blue-500 to-blue-600',
    title: 'Gratificación',
    description:
      'Gratificación de julio o diciembre + bonificación extraordinaria del 9% (Ley 29351).',
    usage: 'Ley 27735',
    popular: true,
  },
  {
    slug: 'multa-sunafil',
    icon: ShieldAlert,
    color: 'from-red-500 to-red-600',
    title: 'Multa SUNAFIL',
    description:
      '¿Cuánto cuesta una infracción? Calcula la multa con descuento por subsanación voluntaria.',
    usage: 'D.S. 019-2006-TR',
    popular: true,
  },
  {
    slug: 'iperc',
    icon: ShieldCheck,
    color: 'from-amber-500 to-amber-600',
    title: 'Matriz IPERC SST',
    description:
      'Calcula el Nivel de Riesgo (NR) de una tarea con la matriz oficial Probabilidad × Severidad. La función pura que usamos en producción.',
    usage: 'R.M. 050-2013-TR',
    popular: true,
  },
]

export const metadata = {
  title: 'Calculadoras laborales gratuitas',
  description:
    'CTS, gratificación, liquidación, multas SUNAFIL. Calculadoras gratis actualizadas con la ley peruana 2026. Sin registro.',
}

export default function CalculadorasIndex() {
  return (
    <>
      <section className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium ring-1 ring-emerald-200 mb-5">
          <Sparkles className="w-3 h-3" />
          Gratis, sin registro, Perú 2026
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
          Calculadoras laborales
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Las mismas calculadoras que usamos en Comply360 para las planillas de +50 empresas peruanas —
          disponibles gratis para ti. Actualizadas con RMV S/ 1,130 y UIT S/ 5,500 (2026).
        </p>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CALCS.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.slug}
              href={`/calculadoras/${c.slug}`}
              className="group rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm hover:shadow-md hover:ring-emerald-300 transition-all p-6 flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white shadow-sm`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {c.popular && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 ring-1 ring-amber-200">
                    Popular
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">{c.title}</h3>
              <p className="text-sm text-slate-600 flex-1">{c.description}</p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500">{c.usage}</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-600 group-hover:gap-2 transition-all">
                  Calcular <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          )
        })}
      </section>

      <section className="mt-16 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-8 sm:p-12 text-white overflow-hidden relative">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
            Esto es solo el 5% de Comply360
          </h2>
          <p className="text-slate-300 text-base sm:text-lg mb-6">
            Registrate gratis y desbloqueá:
          </p>
          <ul className="space-y-2 mb-8">
            {[
              'Diagnóstico SUNAFIL de 135 preguntas con plan de acción',
              'Simulacro de inspección interactivo con Acta PDF',
              'Alertas automáticas de vencimientos (CTS, grati, vacaciones, contratos)',
              'Legajo digital por trabajador con auto-verificación IA',
              'Copilot laboral con RAG sobre +75 normas peruanas',
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm sm:text-base">
                <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-200">{f}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-5 py-3 transition-colors"
            >
              Crear cuenta gratis <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/planes"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 ring-1 ring-white/30 text-white font-semibold text-sm px-5 py-3 transition-colors"
            >
              Ver planes
            </Link>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
      </section>
    </>
  )
}
