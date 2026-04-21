import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()

  try {
    // Check database connectivity
    await prisma.$queryRawUnsafe('SELECT 1')
    const dbLatency = Date.now() - start

    // SECURITY: In production, return minimal info only
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
    }
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: { status: 'connected', latencyMs: dbLatency },
    })
  } catch (err) {
    // TEMP: expose error details for production debugging of initial deploy
    const message = err instanceof Error ? err.message : String(err)
    const code = (err as { code?: string } | null)?.code
    console.error('[health] DB check failed:', message, code)
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: { status: 'disconnected' },
        debug: { message, code, hasUrl: !!process.env.DATABASE_URL, urlHost: process.env.DATABASE_URL?.match(/@([^/]+)/)?.[1] },
      },
      { status: 503 }
    )
  }
}
