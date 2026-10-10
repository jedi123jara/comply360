import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, MapPin, MessageCircle } from 'lucide-react'
import { PublicHero } from '@/components/marketing/public-hero'
import { pub } from '@/components/marketing/public-theme'
import { Breadcrumbs } from '@/components/sitio/breadcrumbs'
import { ContactForm } from '@/components/sitio/contact-form'
import { JsonLd } from '@/components/sitio/json-ld'
import { cn } from '@/lib/utils'
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
      <PublicHero
        align="left"
        eyebrow="Contacto"
        title="Cuéntanos qué necesita tu empresa"
        description="Un diagnóstico, una implementación, el Plan Anual de Capacitaciones o una inspección en curso: te respondemos con un siguiente paso concreto."
        media={<Breadcrumbs items={[{ nombre: 'Contacto', ruta: '/contacto' }]} className="mb-0" />}
      />

      <section aria-label="Formulario de contacto">
        <div className={cn(pub.container, pub.section, 'grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start')}>
          <ContactForm origen="contacto" interesInicial={interes} />

          <aside className="grid gap-5">
            <div className={cn(pub.card, 'p-6')}>
              <h2 className="text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">Otros canales</h2>
              <ul className="mt-4 grid gap-3 text-sm">
                <li className="flex items-start gap-3">
                  <Mail aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                  <a href={`mailto:${SITIO.email}`} className={pub.link}>
                    {SITIO.email}
                  </a>
                </li>
                {wa ? (
                  <li className="flex items-start gap-3">
                    <MessageCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                    <a href={wa} target="_blank" rel="noopener noreferrer" className={pub.link}>
                      Escríbenos por WhatsApp
                    </a>
                  </li>
                ) : null}
                <li className="flex items-start gap-3">
                  <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                  <span className="text-[#475569]">
                    {SITIO.ciudad}, {SITIO.region}. {SITIO.cobertura}.
                  </span>
                </li>
              </ul>
            </div>

            <div className={cn(pub.card, 'p-6')}>
              <h2 className="text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">Qué pasa después</h2>
              <ol className="mt-4 grid gap-3">
                {PASOS.map((paso, i) => (
                  <li key={paso} className="flex items-start gap-3 text-sm text-[#475569]">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0B1B36] text-xs font-extrabold text-[#F5B301]">
                      {i + 1}
                    </span>
                    {paso}
                  </li>
                ))}
              </ol>
            </div>

            <div className={cn(pub.notice, 'text-sm')}>
              ¿Te llegó una notificación o un requerimiento de SUNAFIL? Elige «Tengo una inspección de SUNAFIL» en el
              formulario y cuéntanos el plazo: lo atendemos primero.
            </div>

            <p className={pub.body}>
              ¿Prefieres empezar solo?{' '}
              <Link href="/diagnostico-gratis" className={pub.link}>
                Haz el diagnóstico gratis
              </Link>
              .
            </p>
          </aside>
        </div>
      </section>
    </>
  )
}
