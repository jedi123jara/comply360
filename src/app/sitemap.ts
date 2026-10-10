import type { MetadataRoute } from 'next'
import { ARTICLES } from '@/lib/blog/articles'
import { CAPACITACIONES } from '@/lib/sitio/capacitaciones'
import { AREAS_SERVICIO } from '@/lib/sitio/servicios'
import { SITE_URL } from '@/lib/sitio/site'

type Frecuencia = MetadataRoute.Sitemap[number]['changeFrequency']

// Rutas públicas indexables, priorizadas por valor comercial y SEO.
const RUTAS: Array<{ path: string; changeFrequency: Frecuencia; priority: number }> = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/servicios', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/capacitaciones', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/planes', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/obligaciones', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/diagnostico-gratis', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/calculadoras', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/calculadoras/multa-sunafil', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/calculadoras/cts', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/calculadoras/gratificacion', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/calculadoras/iperc', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/recursos', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/contadores', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/nosotros', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/contacto', changeFrequency: 'yearly', priority: 0.6 },
  { path: '/terminos', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/privacidad', changeFrequency: 'yearly', priority: 0.2 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const fijas = RUTAS.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))

  const servicios = AREAS_SERVICIO.map((a) => ({
    url: `${SITE_URL}/servicios/${a.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }))

  const capacitaciones = CAPACITACIONES.map((c) => ({
    url: `${SITE_URL}/capacitaciones/${c.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const articulos = ARTICLES.map((article) => ({
    url: `${SITE_URL}/recursos/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...fijas, ...servicios, ...capacitaciones, ...articulos]
}
