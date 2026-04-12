import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/calculations(.*)',  // Public calculator API (no auth needed for demo)
  '/api/health',            // Health check endpoint
  '/denuncias(.*)',         // Public complaint form (no auth needed)
  '/api/complaints',        // Public complaint submission
  '/portal-empleado(.*)',   // Lookup publico del trabajador (DNI + codigo empresa)
  '/api/portal-empleado(.*)',
  '/api/integrations/sunat-sol/receive', // Chrome Extension endpoint (CORS preflight needs to pass)
])

// Rutas que requieren rol SUPER_ADMIN (dueños de la plataforma)
const isSuperAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
])

// Rutas que requieren rol WORKER (trabajadores con login)
const isWorkerPortalRoute = createRouteMatcher([
  '/mi-portal(.*)',
  '/api/mi-portal(.*)',
])

// Rutas del dashboard de gestion (OWNER/ADMIN/MEMBER/VIEWER)
const isDashboardRoute = createRouteMatcher([
  '/dashboard(.*)',
])

const isDev = process.env.NODE_ENV === 'development'
const isProd = process.env.NODE_ENV === 'production'

// Build Content-Security-Policy
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.clerk.dev https://*.clerk.accounts.dev https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://api.clerk.dev https://*.clerk.accounts.dev https://clerk-telemetry.com https://api.openai.com https://api.apis.net.pe https://*.supabase.co https://*.sentry.io https://www.google-analytics.com https://www.googletagmanager.com https://connect.facebook.net https://o0.ingest.sentry.io http://localhost:11434",
  "frame-src 'self' https://accounts.clerk.dev https://*.clerk.accounts.dev",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
]

// Security headers applied to all responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': cspDirectives.join('; '),
}

const clerkHandler = clerkMiddleware(async (auth, request) => {
  // CORS preflight (OPTIONS) requests must pass without auth
  if (request.method === 'OPTIONS') {
    return NextResponse.next()
  }

  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  if (!isPublicRoute(request)) {
    const { sessionClaims } = await auth()
    const claims = sessionClaims as { metadata?: { role?: string }, publicMetadata?: { role?: string } } | null
    const role =
      claims?.metadata?.role ||
      claims?.publicMetadata?.role ||
      undefined

    if (isSuperAdminRoute(request) && role && role !== 'SUPER_ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'WORKER' ? '/mi-portal' : '/dashboard'
      return NextResponse.redirect(url)
    }

    if (isWorkerPortalRoute(request) && role && role !== 'WORKER') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'
      return NextResponse.redirect(url)
    }

    if (isDashboardRoute(request) && role) {
      if (role === 'WORKER') {
        const url = request.nextUrl.clone()
        url.pathname = '/mi-portal'
        return NextResponse.redirect(url)
      }
      if (role === 'SUPER_ADMIN') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
    }
  }

  const response = NextResponse.next()

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }

  return response
})

export default async function proxy(request: NextRequest) {
  try {
    return await clerkHandler(request, {} as unknown as Parameters<typeof clerkHandler>[1])
  } catch (error) {
    if (isDev) {
      console.warn('[Proxy] Clerk auth failed, allowing request in dev mode:', error)
      const response = NextResponse.next()
      for (const [key, value] of Object.entries(securityHeaders)) {
        response.headers.set(key, value)
      }
      return response
    }
    throw error
  }
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
