import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://comply360.pe'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/calculadoras',
          '/calculadoras/*',
          '/diagnostico-gratis',
          '/planes',
          '/contadores',
          '/recursos',
          '/recursos/*',
          '/legal',
          '/terminos',
          '/privacidad',
          '/sign-in',
          '/sign-up',
        ],
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/mi-portal',
          '/mi-portal/*',
          '/admin',
          '/admin/*',
          '/api/*',
          '/denuncias/*', // URLs por-empresa privadas
          '/firmar',
          '/portal-empleado',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
