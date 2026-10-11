/**
 * SEO del sitio público: metadata por página y JSON-LD (schema.org).
 *
 * - Títulos: el layout raíz agrega " | Comply360"; aquí van sin la marca y
 *   cortos (≤ 55 caracteres) para que el título completo no se corte en Google.
 * - Canonicals relativos: `metadataBase` del layout raíz los vuelve absolutos.
 * - JSON-LD: se renderiza con <JsonLd /> (escapa `<` como indica la guía de Next).
 */
import type { Metadata } from 'next'
import { SITE_URL, SITIO } from './site'

export function construirMetadata({
  titulo,
  descripcion,
  ruta,
  keywords,
  tipo = 'website',
}: {
  titulo: string
  descripcion: string
  ruta: string
  keywords?: string[]
  tipo?: 'website' | 'article'
}): Metadata {
  return {
    title: titulo,
    description: descripcion,
    keywords,
    alternates: { canonical: ruta },
    openGraph: {
      title: `${titulo} | ${SITIO.nombre}`,
      description: descripcion,
      url: ruta,
      type: tipo,
      siteName: SITIO.nombre,
      locale: 'es_PE',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${titulo} | ${SITIO.nombre}`,
      description: descripcion,
    },
  }
}

export type JsonLdObject = Record<string, unknown>

const ORG_ID = `${SITE_URL}/#organizacion`

/** Referencia corta a la organización para usar dentro de otros nodos. */
export const ORGANIZACION_REF = { '@id': ORG_ID } as const

export function organizacionLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': ORG_ID,
    name: SITIO.nombre,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}/opengraph-image`,
    description: SITIO.descripcion,
    email: SITIO.email,
    ...(SITIO.whatsapp ? { telephone: `+${SITIO.whatsapp}` } : {}),
    slogan: SITIO.promesa,
    priceRange: 'S/ 390 – S/ 3,500',
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITIO.ciudad,
      addressRegion: SITIO.region,
      addressCountry: 'PE',
    },
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'La Libertad' },
      { '@type': 'Country', name: 'Perú' },
    ],
    knowsAbout: [
      'Seguridad y salud en el trabajo (Ley 29783)',
      'Prevención y sanción del hostigamiento sexual (Ley 27942)',
      'Igualdad salarial (Ley 30709)',
      'Inspección del trabajo y SUNAFIL',
      'Capacitaciones obligatorias de SST',
      'Protección de datos personales (Ley 29733)',
    ],
  }
}

export function sitioWebLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#sitio`,
    url: SITE_URL,
    name: SITIO.nombre,
    inLanguage: 'es-PE',
    publisher: ORGANIZACION_REF,
  }
}

export function breadcrumbLd(items: Array<{ nombre: string; ruta: string }>): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.nombre,
      item: `${SITE_URL}${item.ruta}`,
    })),
  }
}

export function faqLd(faqs: ReadonlyArray<{ pregunta: string; respuesta: string }>): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: f.respuesta },
    })),
  }
}

export function servicioLd({
  nombre,
  descripcion,
  ruta,
  tipo,
  precioDesde,
}: {
  nombre: string
  descripcion: string
  ruta: string
  tipo: string
  /** Precio mínimo en soles, sin IGV. */
  precioDesde?: number
}): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: nombre,
    serviceType: tipo,
    description: descripcion,
    url: `${SITE_URL}${ruta}`,
    provider: ORGANIZACION_REF,
    areaServed: { '@type': 'Country', name: 'Perú' },
    ...(precioDesde
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'PEN',
            price: precioDesde,
            priceSpecification: {
              '@type': 'PriceSpecification',
              priceCurrency: 'PEN',
              minPrice: precioDesde,
              valueAddedTaxIncluded: false,
            },
          },
        }
      : {}),
  }
}

export function cursoLd({
  nombre,
  descripcion,
  ruta,
  modalidad,
  precioDesde,
}: {
  nombre: string
  descripcion: string
  ruta: string
  modalidad: 'Onsite' | 'Online' | 'Blended'
  precioDesde?: number
}): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: nombre,
    description: descripcion,
    url: `${SITE_URL}${ruta}`,
    inLanguage: 'es-PE',
    provider: { '@type': 'Organization', name: SITIO.nombre, url: SITE_URL },
    educationalCredentialAwarded: 'Constancia de capacitación',
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: modalidad,
      inLanguage: 'es-PE',
    },
    ...(precioDesde
      ? {
          offers: {
            '@type': 'Offer',
            category: 'Paid',
            priceCurrency: 'PEN',
            price: precioDesde,
          },
        }
      : {}),
  }
}

export function articuloLd({
  titulo,
  descripcion,
  ruta,
  publicado,
  actualizado,
}: {
  titulo: string
  descripcion: string
  ruta: string
  publicado: string
  actualizado: string
}): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: titulo,
    description: descripcion,
    url: `${SITE_URL}${ruta}`,
    mainEntityOfPage: `${SITE_URL}${ruta}`,
    datePublished: publicado,
    dateModified: actualizado,
    inLanguage: 'es-PE',
    author: { '@type': 'Organization', name: SITIO.nombre, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: SITIO.nombre,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
    },
  }
}
