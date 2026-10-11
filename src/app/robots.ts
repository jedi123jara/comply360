import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/sitio/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/dashboard',
          '/mi-portal',
          '/admin',
          '/api/',
          '/denuncias/', // URLs por empresa, privadas
          '/firmar',
          '/portal-empleado',
          '/kiosko',
          '/verify',
          '/audit',
          '/onboarding',
          '/post-login',
          '/elegir-acceso',
          '/sign-in',
          '/sign-up',
          '/dev',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
