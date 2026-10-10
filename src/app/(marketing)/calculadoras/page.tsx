import Link from 'next/link'
import { Wallet, Gift, ShieldAlert, ShieldCheck, ArrowRight, Sparkles, Check } from 'lucide-react'
import { PublicHero } from '@/components/marketing/public-hero'
import { pub } from '@/components/marketing/public-theme'
import { cn } from '@/lib/utils'

const CALCS = [
  {
    slug: 'cts',
    icon: Wallet,
    title: 'CTS — Compensación por Tiempo de Servicios',
    description:
      'Calcula el depósito semestral de mayo o noviembre con la remuneración computable actualizada.',
    usage: 'D.S. 001-97-TR',
    popular: true,
  },
  {
    slug: 'gratificacion',
    icon: Gift,
    title: 'Gratificación',
    description:
      'Gratificación de julio o diciembre + bonificación extraordinaria del 9% (Ley 29351).',
    usage: 'Ley 27735',
    popular: true,
  },
  {
    slug: 'multa-sunafil',
    icon: ShieldAlert,
    title: 'Multa SUNAFIL',
    description:
      '¿Cuánto cuesta una infracción? Calcula la multa con descuento por subsanación voluntaria.',
    usage: 'D.S. 019-2006-TR',
    popular: true,
  },
  {
    slug: 'iperc',
    icon: ShieldCheck,
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
      <PublicHero
        eyebrow={
          <>
            <Sparkles aria-hidden className="h-3.5 w-3.5" />
            Gratis, sin registro, Perú 2026
          </>
        }
        title={
          <>
            Calculadoras <span className={pub.highlightOnNavy}>laborales</span>
          </>
        }
        description={
          <>
            Las mismas calculadoras que usamos en Comply360 para las planillas de +50 empresas peruanas —
            disponibles gratis para ti. Actualizadas con RMV S/ 1,130 y UIT S/ 5,500 (2026).
          </>
        }
      />

      <div className={cn(pub.container, pub.section)}>
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CALCS.map((c) => {
            const Icon = c.icon
            return (
              <Link
                key={c.slug}
                href={`/calculadoras/${c.slug}`}
                className={cn(pub.card, pub.cardHover, 'group flex flex-col p-6')}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className={cn(pub.iconBox, 'h-12 w-12')}>
                    <Icon aria-hidden className="h-5 w-5" />
                  </div>
                  {c.popular && (
                    <span className="rounded-full border border-[#F5B301]/45 bg-[#FFF8E6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#92400E]">
                      Popular
                    </span>
                  )}
                </div>
                <h2 className={cn(pub.h3, 'mb-1.5')}>{c.title}</h2>
                <p className={cn(pub.body, 'flex-1')}>{c.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-[#E5EAF2] pt-4 text-xs">
                  <span className="font-mono text-[#5A6A80]">{c.usage}</span>
                  <span className={pub.linkMore}>
                    Calcular <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </section>

        <section className={cn(pub.band, 'mt-16 p-8 sm:p-12')}>
          <div aria-hidden className={pub.heroGrid} />
          <div className="relative max-w-2xl">
            <h2 className={cn(pub.h2OnNavy, 'mb-3 sm:text-4xl')}>
              Un cálculo es <span className={pub.highlightOnNavy}>una parte</span> del cumplimiento
            </h2>
            <p className={cn(pub.leadOnNavy, 'mb-6')}>Comply360 se encarga del resto:</p>
            <ul className="mb-8 space-y-2">
              {[
                'Diagnóstico de cumplimiento con la multa estimada de cada brecha',
                'Implementación de SST, hostigamiento sexual y documentos laborales',
                'Iguala mensual con alertas de vencimientos y consultas',
                'Capacitaciones obligatorias con especialistas y evidencia para SUNAFIL',
                'Acompañamiento si llega una inspección',
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm sm:text-base">
                  <Check aria-hidden className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#F5B301]" />
                  <span className="text-[#CBD5E1]">{f}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/diagnostico-gratis" className={pub.btnPrimary}>
                Diagnóstico gratis <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link href="/servicios" className={pub.btnSecondaryOnNavy}>
                Ver servicios
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
