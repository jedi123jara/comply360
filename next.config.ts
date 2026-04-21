import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // pdf-parse v2 usa pdfjs-dist con un web worker que webpack no puede resolver.
  // Externalizarlo evita el error "Setting up fake worker failed".
  serverExternalPackages: ['pdf-parse'],
  async redirects() {
    return [
      {
        source: '/portal-empleado',
        destination: '/mi-portal',
        permanent: true,
      },
      {
        source: '/portal-empleado/:path*',
        destination: '/mi-portal/:path*',
        permanent: true,
      },
      // ── Revolución UX Fase B/C: consolidación de 7 hubs ───────────────
      // Los 3 chatbots IA unificados en /ia-laboral
      {
        source: '/dashboard/asistente-ia',
        destination: '/dashboard/ia-laboral',
        permanent: true,
      },
      {
        source: '/dashboard/asistente-ia/:path*',
        destination: '/dashboard/ia-laboral',
        permanent: true,
      },
      {
        source: '/dashboard/agentes',
        destination: '/dashboard/ia-laboral?mode=agents',
        permanent: true,
      },
      {
        source: '/dashboard/analizar-contrato',
        destination: '/dashboard/ia-laboral?mode=review',
        permanent: true,
      },
      // Documentos y expedientes fusionados
      {
        source: '/dashboard/expedientes',
        destination: '/dashboard/documentos',
        permanent: true,
      },
      {
        source: '/dashboard/expedientes/:path*',
        destination: '/dashboard/documentos/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.clerk.com https://*.clerk.accounts.dev https://clerk.comply360.pe https://*.comply360.pe https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://clerk.comply360.pe https://*.comply360.pe https://challenges.cloudflare.com https://api.openai.com https://api.groq.com https://api.apis.net.pe https://api-seguridad.sunat.gob.pe https://api.sunat.gob.pe https://api.resend.com",
              "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://clerk.comply360.pe https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
