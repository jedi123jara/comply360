import type { MetadataRoute } from 'next'
import { ARTICLES } from '@/lib/blog/articles'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://comply360.pe'

// Public routes que queremos indexar — priorizadas por valor SEO.
const routes: Array<{
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/calculadoras', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/calculadoras/cts', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/calculadoras/gratificacion', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/calculadoras/multa-sunafil', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/calculadoras/iperc', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/diagnostico-gratis', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/planes', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/recursos', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/legal/aup', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/legal/autorizacion-datos-sensibles', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/legal/dpa', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/legal/firma-electronica', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/legal/privacidad-trabajador', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/terminos', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/privacidad', changeFrequency: 'yearly', priority: 0.2 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes = routes.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))

  const articleRoutes = ARTICLES.map((article) => ({
    url: `${BASE_URL}/recursos/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }))

  return [...staticRoutes, ...articleRoutes]
}
