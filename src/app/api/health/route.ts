import { NextResponse } from 'next/server'
import pg from 'pg'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()

  // TEMP: diagnose whether the issue is Prisma or raw pg connection
  const diag: Record<string, unknown> = {}
  try {
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    })
    const pgStart = Date.now()
    await client.connect()
    const res = await client.query('SELECT 1 as ok')
    await client.end()
    diag.pg = { ok: true, ms: Date.now() - pgStart, row: res.rows[0] }
  } catch (e) {
    diag.pg = {
      ok: false,
      message: e instanceof Error ? e.message : String(e),
      code: (e as { code?: string })?.code,
    }
  }

  try {
    // Check database connectivity
    await prisma.$queryRawUnsafe('SELECT 1')
    const dbLatency = Date.now() - start
    ;(diag as { prisma?: unknown }).prisma = { ok: true, ms: dbLatency }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: { status: 'connected', latencyMs: dbLatency },
      diag,
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
        diag,
      },
      { status: 503 }
    )
  }
}
