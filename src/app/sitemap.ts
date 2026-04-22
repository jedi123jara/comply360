import type { MetadataRoute } from 'next'

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
  { path: '/diagnostico-gratis', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/planes', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/contadores', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/recursos', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/legal', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terminos', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/privacidad', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/sign-up', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/sign-in', changeFrequency: 'yearly', priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
