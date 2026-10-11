import type { JsonLdObject } from '@/lib/sitio/seo'

/**
 * Datos estructurados schema.org. Escapa `<` (guía JSON-LD de Next.js) para
 * que ningún texto pueda cerrar el <script>.
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
