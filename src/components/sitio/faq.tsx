import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pub } from '@/components/marketing/public-theme'
import { faqLd } from '@/lib/sitio/seo'
import { JsonLd } from './json-ld'

/**
 * Preguntas frecuentes con <details> (funciona sin JavaScript y el texto queda
 * en el HTML para Google) + FAQPage en JSON-LD. Estilo editorial: líneas finas.
 * `titulo={null}` cuando la sección que la contiene ya tiene su título.
 */
export function Faq({
  faqs,
  titulo = 'Preguntas frecuentes',
  className,
}: {
  faqs: ReadonlyArray<{ pregunta: string; respuesta: string }>
  titulo?: string | null
  className?: string
}) {
  if (faqs.length === 0) return null
  return (
    <div className={className}>
      <JsonLd data={faqLd(faqs)} />
      {titulo ? <h2 className={cn(pub.h2, 'mb-10')}>{titulo}</h2> : null}
      <div className="border-t border-[#0B1B36]">
        {faqs.map((f) => (
          <details key={f.pregunta} className="group border-b border-[#E1E7F0]">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-left [&::-webkit-details-marker]:hidden">
              <span className="text-lg font-bold tracking-[-0.01em] text-[#0B1B36]">{f.pregunta}</span>
              <Plus
                aria-hidden
                className="mt-1 h-5 w-5 shrink-0 text-[#0B1B36] transition-transform duration-200 group-open:rotate-45"
              />
            </summary>
            <p className="-mt-2 max-w-3xl pb-7 text-[1.02rem] leading-8 text-[#475569]">{f.respuesta}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
