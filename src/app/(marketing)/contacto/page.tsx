import type { Metadata } from 'next'
import Link from 'next/link'
import { ContactForm } from '@/components/sitio/contact-form'
import { FichaHero, HeroPagina, Seccion } from '@/components/sitio/editorial'
import { JsonLd } from '@/components/sitio/json-ld'
import { ORGANIZACION_REF, construirMetadata } from '@/lib/sitio/seo'
import { SITE_URL, SITIO, whatsappHref } from '@/lib/sitio/site'

export const metadata: Metadata = construirMetadata({
  titulo: 'Contacto',
  descripcion:
    'Escríbenos para un diagnóstico, una implementación, el Plan Anual de Capacitaciones o si tienes una inspección de SUNAFIL. Atendemos en Trujillo y en todo el Perú.',
  ruta: '/contacto',
})

const PASOS = [
  'Leemos tu consulta y te escribimos al correo que dejaste.',
  'Coordinamos una llamada de 30 minutos para entender tu caso.',
  'Te enviamos una propuesta con alcance, plazo y precio en dos páginas.',
] as const

export default async function ContactoPage({ searchParams }: { searchParams: Promise<{ interes?: string }> }) {
  const { interes } = await searchParams
  const wa = whatsappHref('Hola, quiero información sobre los servicios de Comply360.')

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: 'Contacto de Comply360',
          url: `${SITE_URL}/contacto`,
          about: ORGANIZACION_REF,
        }}
      />

      <HeroPagina
        migas={[{ nombre: 'Contacto', ruta: '/contacto' }]}
        etiqueta="Contacto"
        titulo="Cuéntanos qué necesita tu empresa"
        bajada="Un diagnóstico, una implementación, el Plan Anual de Capacitaciones o una inspección en curso: te respondemos con un siguiente paso concreto."
        aside={
          <FichaHero
            filas={[
              {
                etiqueta: 'Correo',
                valor: (
                  <a href={`mailto:${SITIO.email}`} className="underline decoration-[#ffffff]/30 underline-offset-4 hover:decoration-[#F5B301]">
                    {SITIO.email}
                  </a>
                ),
              },
              ...(wa
                ? [
                    {
                      etiqueta: 'WhatsApp',
                      valor: (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="underline decoration-[#ffffff]/30 underline-offset-4 hover:decoration-[#F5B301]">
                          Escríbenos por WhatsApp
                        </a>
                      ),
                    },
                  ]
                : []),
              { etiqueta: 'Atención', valor: `${SITIO.ciudad}, ${SITIO.region}. ${SITIO.cobertura}.` },
            ]}
          />
        }
      />

      <Seccion id="formulario" numero="01" etiqueta="Escríbenos" titulo="Te respondemos con un siguiente paso">
        <div className="grid gap-12">
          <ContactForm origen="contacto" interesInicial={interes} />

          <aside className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A97AB]">Qué pasa después</p>
              <ol className="mt-4 border-t border-[#0B1B36]">
                {PASOS.map((paso, i) => (
                  <li key={paso} className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-[#E1E7F0] py-4">
                    <span className="text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[0.98rem] leading-7 text-[#0B1B36]">{paso}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl bg-[#0B1B36] p-7 text-[#ffffff]">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#F5B301]">¿Tienes una inspección?</p>
              <p className="mt-3 text-[0.98rem] leading-7 text-[#CBD5E1]">
                Si te llegó una notificación o un requerimiento de SUNAFIL, elige «Tengo una inspección de SUNAFIL» en el
                formulario y cuéntanos el plazo. Esos casos los atendemos primero.
              </p>
            </div>

            <p className="text-sm text-[#475569] lg:col-span-2">
              ¿Prefieres empezar por tu cuenta?{' '}
              <Link href="/diagnostico-gratis" className="font-semibold text-[#0B1B36] underline decoration-[#C9D1DD] underline-offset-4 hover:decoration-[#0B1B36]">
                Haz el diagnóstico gratis
              </Link>
              .
            </p>
          </aside>
        </div>
      </Seccion>
    </>
  )
}
