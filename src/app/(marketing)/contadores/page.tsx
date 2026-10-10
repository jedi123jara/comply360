import type { Metadata } from 'next'
import { CheckCircle2, Handshake, Percent, ShieldCheck } from 'lucide-react'
import { PublicHero } from '@/components/marketing/public-hero'
import { pub } from '@/components/marketing/public-theme'
import { Breadcrumbs } from '@/components/sitio/breadcrumbs'
import { ContactForm } from '@/components/sitio/contact-form'
import { Faq } from '@/components/sitio/faq'
import { SectionHeader } from '@/components/sitio/section-header'
import { cn } from '@/lib/utils'
import { construirMetadata } from '@/lib/sitio/seo'

export const metadata: Metadata = construirMetadata({
  titulo: 'Programa para contadores: comisión por referidos',
  descripcion:
    'Deriva a tus clientes las obligaciones de SST, hostigamiento sexual y laborales que no te toca ver, y gana una comisión. Nosotros no hacemos contabilidad ni planillas.',
  ruta: '/contadores',
  keywords: ['programa de referidos para contadores', 'alianza contador SST', 'comisión contadores Perú', 'contadores Trujillo'],
})

const BENEFICIOS = [
  {
    icono: Percent,
    titulo: 'Ganas una comisión',
    texto: '10% del primer año de iguala o 15% del primer proyecto de cada cliente que nos derives.',
  },
  {
    icono: ShieldCheck,
    titulo: 'Tus clientes quedan protegidos',
    texto: 'Las faltas de SST y hostigamiento son de las más comunes en una inspección. Las resolvemos antes de que lleguen.',
  },
  {
    icono: Handshake,
    titulo: 'Tu relación no se toca',
    texto: 'No hacemos contabilidad, planillas ni tributario. Lo tributario que nos llegue, te lo derivamos a ti.',
  },
] as const

const PASOS = [
  'Te registras con el formulario de abajo y firmamos un convenio simple.',
  'Nos presentas al cliente; hacemos su diagnóstico gratis y una propuesta.',
  'Si contrata, recibes tu comisión cuando el cliente paga.',
] as const

const FAQS = [
  {
    pregunta: '¿Cuándo cobro la comisión?',
    respuesta: 'Cuando el cliente paga. En la iguala, sobre lo efectivamente pagado durante el primer año.',
  },
  {
    pregunta: '¿Comply360 puede ofrecerle servicios contables a mi cliente?',
    respuesta: 'No. No hacemos contabilidad ni planillas, y el convenio incluye no captación en ambos sentidos.',
  },
  {
    pregunta: '¿Qué tipo de clientes conviene derivar?',
    respuesta:
      'Sobre todo empresas con 20 o más trabajadores, que ya necesitan comité de SST, reglamento interno de SST y comité de hostigamiento sexual, o cualquier empresa con una inspección en curso.',
  },
]

export default function ContadoresPage() {
  return (
    <>
      <PublicHero
        align="left"
        eyebrow="Programa para contadores"
        title={
          <>
            Tus clientes en regla, <span className={pub.highlightOnNavy}>tú ganas una comisión</span>
          </>
        }
        description="Tus clientes te preguntan por SST, hostigamiento y SUNAFIL. Deriva esos temas a Comply360 y gana por cada cliente que contrate."
        media={<Breadcrumbs items={[{ nombre: 'Contadores', ruta: '/contadores' }]} className="mb-0" />}
      />

      <section className="bg-[#ffffff]" aria-labelledby="beneficios">
        <div className={cn(pub.container, pub.section)}>
          <SectionHeader id="beneficios" kicker="Por qué sumarte" titulo="Un aliado para lo que no es contable" />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {BENEFICIOS.map(({ icono: Icono, titulo, texto }) => (
              <div key={titulo} className={cn(pub.card, 'p-6')}>
                <span className={pub.iconBox}>
                  <Icono aria-hidden className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">{titulo}</h3>
                <p className={cn(pub.body, 'mt-2')}>{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="unete">
        <div className={cn(pub.container, pub.section, 'grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-start')}>
          <div>
            <SectionHeader id="unete" kicker="Cómo funciona" titulo="Tres pasos" />
            <ol className="mt-6 grid gap-4">
              {PASOS.map((paso, i) => (
                <li key={paso} className="flex items-start gap-3 text-[0.95rem] text-[#0B1B36]">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0B1B36] text-xs font-extrabold text-[#F5B301]">
                    {i + 1}
                  </span>
                  {paso}
                </li>
              ))}
            </ol>
            <ul className="mt-8 grid gap-2.5">
              {['Convenio con no captación en ambos sentidos', 'Confidencialidad sobre la información de tus clientes', 'Sin costo para ti'].map(
                (t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-[#475569]">
                    <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#15803D]" />
                    {t}
                  </li>
                ),
              )}
            </ul>
          </div>
          <ContactForm origen="contadores" interesInicial="contadores" source="REFERRAL" boton="Quiero ser aliado" />
        </div>
      </section>

      <div className={cn(pub.container, pub.section)}>
        <Faq faqs={FAQS} />
      </div>
    </>
  )
}
