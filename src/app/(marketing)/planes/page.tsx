import Link from 'next/link'
import { Check, Sparkles, ArrowRight, Building2, Zap, Rocket, Star } from 'lucide-react'
import { PLANS } from '@/lib/constants'

type PlanKey = 'FREE' | 'STARTER' | 'EMPRESA' | 'PRO' | 'ENTERPRISE'

const ORDER: PlanKey[] = ['STARTER', 'EMPRESA', 'PRO', 'ENTERPRISE']

const PLAN_META: Record<PlanKey, { icon: typeof Building2; tagline: string; color: string }> = {
  FREE: { icon: Star, tagline: 'Probá las calculadoras', color: 'slate' },
  STARTER: {
    icon: Building2,
    tagline: 'Ideal para MYPE de hasta 20 trabajadores',
    color: 'slate',
  },
  EMPRESA: {
    icon: Zap,
    tagline: 'El plan más elegido — compliance completo',
    color: 'emerald',
  },
  PRO: { icon: Rocket, tagline: 'Para empresas que escalan con IA', color: 'indigo' },
  ENTERPRISE: {
    icon: Sparkles,
    tagline: 'Para estudios contables y grupos empresariales',
    color: 'amber',
  },
}

export const metadata = {
  title: 'Planes y precios | COMPLY360',
  description:
    'Elegí el plan ideal para tu empresa. Desde S/ 129/mes. Cancela cuando quieras. Trial 14 días en Starter y Empresa.',
}

export default function PlanesPage() {
  return (
    <>
      <section className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium ring-1 ring-emerald-200 mb-5">
          <Sparkles className="w-3 h-3" />
          Precios en soles peruanos · IGV incluido · cancelás cuando quieras
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
          Un precio simple. <span className="text-emerald-600">Pagás lo que usás.</span>
        </h1>
        <p className="mt-5 text-lg text-slate-600">
          Un abogado laboralista te cobra S/ 3,000–8,000 por llevarte la planilla mensual. Nosotros
          cubrimos lo mismo (y más) por una fracción del costo, 24/7, con IA.
        </p>
      </section>

      <section className="grid lg:grid-cols-2 xl:grid-cols-4 gap-5">
        {ORDER.map((key) => {
          const plan = PLANS[key]
          const meta = PLAN_META[key]
          const Icon = meta.icon
          const highlighted = key === 'EMPRESA'
          return (
            <div
              key={key}
              className={`rounded-2xl p-6 sm:p-7 flex flex-col ${
                highlighted
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-xl shadow-emerald-200 ring-1 ring-emerald-500 relative'
                  : 'bg-white ring-1 ring-slate-200 shadow-sm'
              }`}
            >
              {highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ring-2 ring-white">
                  Más popular
                </span>
              )}

              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                  highlighted ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex items-baseline gap-1 mb-1">
                <span
                  className={`text-3xl font-bold tracking-tight ${
                    highlighted ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {plan.price === 0 ? 'A medida' : `S/ ${plan.price.toLocaleString('es-PE')}`}
                </span>
                {plan.price !== 0 && (
                  <span
                    className={`text-sm ${highlighted ? 'text-emerald-100' : 'text-slate-500'}`}
                  >
                    /mes
                  </span>
                )}
              </div>

              <h3
                className={`text-lg font-semibold mb-0.5 ${
                  highlighted ? 'text-white' : 'text-slate-900'
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`text-xs mb-5 ${highlighted ? 'text-emerald-100' : 'text-slate-500'}`}
              >
                {meta.tagline}
              </p>

              <ul className="space-y-2.5 text-sm flex-1 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check
                      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        highlighted ? 'text-emerald-200' : 'text-emerald-600'
                      }`}
                    />
                    <span className={highlighted ? 'text-emerald-50' : 'text-slate-700'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={key === 'ENTERPRISE' ? 'mailto:contacto@comply360.pe' : '/sign-up'}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold text-sm px-5 py-3 transition-colors ${
                  highlighted
                    ? 'bg-white text-emerald-700 hover:bg-emerald-50'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {key === 'ENTERPRISE' ? 'Hablar con ventas' : 'Empezar prueba gratuita'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )
        })}
      </section>

      <section className="mt-16 grid md:grid-cols-3 gap-4">
        {[
          {
            title: '14 días de prueba sin tarjeta',
            body:
              'Los planes Starter y Empresa arrancan con 14 días gratis. Sin poner tu tarjeta. Cancelás con un click si no te sirve.',
          },
          {
            title: 'Migración gratuita',
            body:
              '¿Ya estás en Buk, Ofisis o un Excel? Te importamos tus trabajadores, contratos y legajo en menos de 24 hs sin costo.',
          },
          {
            title: 'Acreditación SUNAFIL',
            body:
              'Nuestros generadores de política SST, IPERC y reglamento interno están actualizados a la ley peruana 2026 y firmados por abogados laboralistas.',
          },
        ].map((item, i) => (
          <div key={i} className="rounded-xl bg-white ring-1 ring-slate-200 p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-1.5">{item.title}</h4>
            <p className="text-sm text-slate-600">{item.body}</p>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
          Preguntas frecuentes
        </h2>
        <div className="space-y-3">
          {[
            {
              q: '¿Puedo cambiar de plan más adelante?',
              a: 'Sí. Podés subir o bajar de plan con un click desde tu dashboard. El cambio se aplica al próximo ciclo y se prorratea el saldo.',
            },
            {
              q: '¿Incluye IGV?',
              a: 'Sí, los precios mostrados ya incluyen el 18% de IGV. Recibís factura electrónica formal mensual.',
            },
            {
              q: '¿Puedo llevar las planillas de mis clientes si soy contador?',
              a: 'Sí — el plan Enterprise permite multi-cuenta para estudios contables. Gestionás 10, 50 o 200 empresas desde una sola cuenta con un dashboard consolidado.',
            },
            {
              q: '¿Qué pasa con mis datos si cancelo?',
              a: 'Podés exportar todos tus datos en Excel/PDF en cualquier momento. Al cancelar, retenemos tu info 90 días por si querés volver; luego la borramos salvo que pidas retención extendida.',
            },
            {
              q: '¿Necesito instalar algo?',
              a: 'No. Comply360 corre 100% en el navegador. Funciona en cualquier compu y también tenemos app móvil (PWA) para trabajadores.',
            },
            {
              q: '¿La IA realmente funciona para derecho peruano?',
              a: 'Sí. Entrenamos nuestro copilot con +75 normas peruanas vigentes (D.Leg. 728, Ley 29783, Ley 32353, etc.), resoluciones del TFL y jurisprudencia SUNAFIL. No inventa artículos.',
            },
          ].map((item, i) => (
            <details
              key={i}
              className="group rounded-xl bg-white ring-1 ring-slate-200 p-5 open:shadow-sm"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-medium text-slate-900">{item.q}</span>
                <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-3xl bg-slate-900 p-8 sm:p-12 text-center text-white">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">
          ¿Todavía no sabés si tu empresa necesita compliance?
        </h2>
        <p className="text-slate-300 max-w-xl mx-auto mb-6">
          Hacé nuestro diagnóstico express gratis (2 min, 20 preguntas) y obtené un estimado de
          cuánta multa SUNAFIL podrías evitar al año.
        </p>
        <Link
          href="/diagnostico-gratis"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-6 py-3 transition-colors"
        >
          Hacer diagnóstico gratis <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </>
  )
}
