/**
 * <CalculatorSchema /> — JSON-LD Schema.org para calculadoras públicas.
 *
 * Inyecta metadata estructurada que Google/Bing usan para Rich Results:
 *  - WebApplication / SoftwareApplication (la calculadora como tool)
 *  - BreadcrumbList (Inicio › Calculadoras › Esta calculadora)
 *  - FAQPage (si se proveen pares pregunta/respuesta)
 *
 * Resultado esperado en SERP:
 *  - Snippet con "calculadora" badge
 *  - FAQ expandido si Google lo elige
 *  - Breadcrumb visible en lugar de URL completa
 *
 * Uso:
 * ```tsx
 * <CalculatorSchema
 *   name="Calculadora de CTS"
 *   description="Calcula tu depósito de CTS paso a paso..."
 *   path="/calculadoras/cts"
 *   faqs={[{ q: "¿Cuándo se paga la CTS?", a: "..." }]}
 * />
 * ```
 */

interface CalculatorSchemaProps {
  /** Nombre comercial de la calculadora. */
  name: string
  /** Descripción de 100-200 caracteres. */
  description: string
  /** Path absoluto (ej: "/calculadoras/cts"). */
  path: string
  /** Preguntas frecuentes opcionales para FAQPage schema. */
  faqs?: Array<{ q: string; a: string }>
  /** Categoría legal peruana (ej: "Beneficios Sociales"). */
  category?: string
}

const SITE_URL = 'https://comply360.pe'
const ORGANIZATION = {
  '@type': 'Organization',
  name: 'COMPLY360',
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
}

export function CalculatorSchema({
  name,
  description,
  path,
  faqs,
  category = 'Compliance Laboral',
}: CalculatorSchemaProps) {
  const url = `${SITE_URL}${path}`

  // 1. Schema principal — SoftwareApplication es lo más apropiado para calculadora
  // que se usa en el navegador (vs WebApplication que es más genérico).
  const calculatorSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: category,
    operatingSystem: 'Any (Web)',
    inLanguage: 'es-PE',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'PEN',
      availability: 'https://schema.org/InStock',
    },
    publisher: ORGANIZATION,
    audience: {
      '@type': 'BusinessAudience',
      audienceType: 'Empresas peruanas, contadores, RRHH',
      geographicArea: {
        '@type': 'Country',
        name: 'Perú',
      },
    },
  }

  // 2. Breadcrumb
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Calculadoras',
        item: `${SITE_URL}/calculadoras`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name,
        item: url,
      },
    ],
  }

  // 3. FAQ (opcional)
  const faqSchema =
    faqs && faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: f.a,
            },
          })),
        }
      : null

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorSchema) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema ? (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}
    </>
  )
}
