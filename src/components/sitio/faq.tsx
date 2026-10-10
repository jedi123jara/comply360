import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pub } from '@/components/marketing/public-theme'
import { faqLd } from '@/lib/sitio/seo'
import { JsonLd } from './json-ld'

/**
 * Preguntas frecuentes con <details> (funciona sin JavaScript y el texto queda
 * en el HTML para Google) + FAQPage en JSON-LD.
 */
export function Faq({
  faqs,
  titulo = 'Preguntas frecuentes',
  className,
}: {
  faqs: ReadonlyArray<{ pregunta: string; respuesta: string }>
  titulo?: string
  className?: string
}) {
  if (faqs.length === 0) return null
  return (
    <section aria-labelledby="faq-titulo" className={className}>
      <JsonLd data={faqLd(faqs)} />
      <h2 id="faq-titulo" className={pub.h2}>
        {titulo}
      </h2>
      <div className={cn(pub.card, pub.divide, 'mt-6')}>
        {faqs.map((f) => (
          <details key={f.pregunta} className="group px-5 py-4 sm:px-6">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left text-base font-bold text-[#0B1B36] [&::-webkit-details-marker]:hidden">
              <span>{f.pregunta}</span>
              <ChevronDown
                aria-hidden
                className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB] transition-transform group-open:rotate-180"
              />
            </summary>
            <p className={cn(pub.body, 'mt-3 max-w-3xl text-[0.95rem] leading-7')}>{f.respuesta}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
