import type { Metadata } from 'next'
import { ArrowRight, Check } from 'lucide-react'
import { pub } from '@/components/marketing/public-theme'
import { ContactForm } from '@/components/sitio/contact-form'
import { CtaBand } from '@/components/sitio/cta-band'
import { FichaHero, HeroPagina, Seccion } from '@/components/sitio/editorial'
import { Faq } from '@/components/sitio/faq'
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
    titulo: 'Ganas una comisión',
    texto: '10% del primer año de iguala o 15% del primer proyecto de cada cliente que nos derives.',
  },
  {
    titulo: 'Tus clientes quedan protegidos',
    texto: 'Las faltas de SST y hostigamiento son de las más comunes en una inspección. Las resolvemos antes de que lleguen.',
  },
  {
    titulo: 'Tu relación no se toca',
    texto: 'No hacemos contabilidad, planillas ni tributario. Lo tributario que nos llegue, te lo derivamos a ti.',
  },
] as const

const PASOS = [
  'Te registras con el formulario de abajo y firmamos un convenio simple.',
  'Nos presentas al cliente. Hacemos su diagnóstico gratis y una propuesta.',
  'Si contrata, recibes tu comisión cuando el cliente paga.',
] as const

const CONDICIONES = [
  'Convenio con no captación en ambos sentidos',
  'Confidencialidad sobre la información de tus clientes',
  'Sin costo para ti',
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
      <HeroPagina
        migas={[{ nombre: 'Contadores', ruta: '/contadores' }]}
        etiqueta="Programa para contadores"
        titulo={
          <>
            Tus clientes en regla, <span className="text-[#F5B301]">tú ganas una comisión</span>
          </>
        }
        bajada="Tus clientes te preguntan por SST, hostigamiento y SUNAFIL. Deriva esos temas a Comply360 y gana por cada cliente que contrate."
        aside={
          <FichaHero
            filas={[
              { etiqueta: 'Comisión', valor: '10% del primer año de iguala o 15% del primer proyecto' },
              { etiqueta: 'Cuándo cobras', valor: 'Cuando el cliente paga' },
              { etiqueta: 'Qué no hacemos', valor: 'Contabilidad, planillas ni tributario' },
            ]}
          />
        }
      >
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href="#unete" className={pub.btnPrimaryLg}>
            Quiero ser aliado <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        </div>
      </HeroPagina>

      {/* 01 — Por qué sumarte */}
      <Seccion id="beneficios" numero="01" etiqueta="Por qué sumarte" titulo="Un aliado para lo que no es contable">
        <ol className="border-t border-[#0B1B36]">
          {BENEFICIOS.map((b, i) => (
            <li
              key={b.titulo}
              className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-[#E1E7F0] py-7 md:grid-cols-[3rem_minmax(0,17rem)_1fr] md:gap-x-8"
            >
              <span className="pt-1 text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="text-[1.25rem] font-extrabold leading-snug tracking-[-0.02em] text-[#0B1B36]">{b.titulo}</h3>
              <p className="col-start-2 mt-2 max-w-2xl text-[1.02rem] leading-7 text-[#475569] md:col-start-3 md:mt-0">
                {b.texto}
              </p>
            </li>
          ))}
        </ol>
      </Seccion>

      {/* 02 — Cómo funciona */}
      <Seccion id="como-funciona" numero="02" etiqueta="Cómo funciona" tono="claro" titulo="Tres pasos">
        <div className="grid gap-12 xl:grid-cols-[1.35fr_1fr] xl:items-start">
          <ol className="border-t border-[#0B1B36]">
            {PASOS.map((paso, i) => (
              <li key={paso} className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-[#D9E0EA] py-7">
                <span className="pt-1 text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
                <p className="max-w-2xl text-[1.1rem] leading-8 text-[#0B1B36]">{paso}</p>
              </li>
            ))}
          </ol>
          <aside aria-label="El convenio" className="rounded-2xl bg-[#0B1B36] p-8 text-[#ffffff]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5B301]">El convenio</p>
            <ul className="mt-6 divide-y divide-[#ffffff]/10 border-y border-[#ffffff]/10">
              {CONDICIONES.map((c) => (
                <li key={c} className="flex items-start gap-3 py-4 text-[0.98rem] leading-7 text-[#CBD5E1]">
                  <Check aria-hidden className="mt-1.5 h-4 w-4 shrink-0 text-[#F5B301]" />
                  {c}
                </li>
              ))}
            </ul>
            <a href="#unete" className={cn(pub.btnPrimary, 'mt-8 w-full')}>
              Quiero ser aliado <ArrowRight aria-hidden className="h-4 w-4" />
            </a>
          </aside>
        </div>
      </Seccion>

      {/* 03 — Únete */}
      <Seccion
        id="unete"
        numero="03"
        etiqueta="Únete"
        titulo="Súmate al programa"
        bajada="Completa el formulario y firmamos un convenio simple."
      >
        <div className="max-w-3xl">
          <ContactForm origen="contadores" interesInicial="contadores" source="REFERRAL" boton="Quiero ser aliado" />
        </div>
      </Seccion>

      {/* 04 — Preguntas frecuentes */}
      <Seccion id="preguntas" numero="04" etiqueta="Preguntas frecuentes" tono="claro" titulo="Lo que suelen preguntarnos">
        <Faq faqs={FAQS} titulo={null} />
      </Seccion>

      <CtaBand
        titulo="¿Tienes un cliente que necesita ponerse en regla?"
        texto="Empieza por el diagnóstico gratis: en minutos sabrás qué le falta y cuánto arriesga. Si quieres, lo revisamos juntos en una llamada de 30 minutos."
        mensajeWhatsapp="Hola, soy contador y quiero información sobre el programa para contadores de Comply360."
      />
    </>
  )
}
