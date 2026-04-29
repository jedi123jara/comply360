/**
 * POST /api/admin/db-sync — fuerza sincronización del schema de Prisma
 *
 * Útil cuando el wrapper db-sync.mjs en build no logró aplicar las
 * migrations (P3005, conexión pooler, etc.) y necesitas aplicar los
 * cambios pendientes desde la app misma.
 *
 * Solo accesible para SUPER_ADMIN o con CRON_SECRET en el header
 * (para automatización futura).
 *
 * No requiere DATABASE_URL extra — usa la misma conexión que el resto de
 * la app. Por eso funciona en runtime de Vercel donde el wrapper de build
 * a veces no.
 *
 * Estrategia interna: usa raw SQL queries de Prisma para verificar e
 * insertar columnas/tablas faltantes, sin shell out a npx.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, isSuperAdminRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'

// Cambios SQL aditivos a aplicar — corresponden a migrations 2026-04-29.
// Cada uno usa IF NOT EXISTS para ser idempotente.
const SCHEMA_PATCHES: { name: string; sql: string }[] = [
  // Fase 1.2 — Worker schedule
  {
    name: 'workers.expected_clock_in_hour',
    sql: `ALTER TABLE "workers" ADD COLUMN IF NOT EXISTS "expected_clock_in_hour" INTEGER NOT NULL DEFAULT 8`,
  },
  {
    name: 'workers.expected_clock_in_minute',
    sql: `ALTER TABLE "workers" ADD COLUMN IF NOT EXISTS "expected_clock_in_minute" INTEGER NOT NULL DEFAULT 0`,
  },
  {
    name: 'workers.expected_clock_out_hour',
    sql: `ALTER TABLE "workers" ADD COLUMN IF NOT EXISTS "expected_clock_out_hour" INTEGER NOT NULL DEFAULT 17`,
  },
  {
    name: 'workers.expected_clock_out_minute',
    sql: `ALTER TABLE "workers" ADD COLUMN IF NOT EXISTS "expected_clock_out_minute" INTEGER NOT NULL DEFAULT 0`,
  },
  {
    name: 'workers.late_tolerance_minutes',
    sql: `ALTER TABLE "workers" ADD COLUMN IF NOT EXISTS "late_tolerance_minutes" INTEGER NOT NULL DEFAULT 15`,
  },
  // Fase 1.3 — Attendance overtime
  {
    name: 'attendance.is_overtime',
    sql: `ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "is_overtime" BOOLEAN NOT NULL DEFAULT false`,
  },
  {
    name: 'attendance.overtime_minutes',
    sql: `ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "overtime_minutes" INTEGER`,
  },
  // Fase 4.1 — Geofences + AttendanceAttempt
  {
    name: 'geofences (table)',
    sql: `CREATE TABLE IF NOT EXISTS "geofences" (
      "id"           TEXT PRIMARY KEY,
      "org_id"       TEXT NOT NULL,
      "name"         TEXT NOT NULL,
      "type"         TEXT NOT NULL,
      "center_lat"   DECIMAL(10, 7),
      "center_lng"   DECIMAL(10, 7),
      "radius_meters" INTEGER,
      "vertices"     JSONB,
      "location_id"  TEXT,
      "is_active"    BOOLEAN NOT NULL DEFAULT true,
      "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: 'geofences index',
    sql: `CREATE INDEX IF NOT EXISTS "geofences_org_id_is_active_idx" ON "geofences"("org_id", "is_active")`,
  },
  {
    name: 'attendance_attempts (table)',
    sql: `CREATE TABLE IF NOT EXISTS "attendance_attempts" (
      "id"            TEXT PRIMARY KEY,
      "org_id"        TEXT NOT NULL,
      "worker_id"     TEXT,
      "result"        TEXT NOT NULL,
      "reason"        TEXT,
      "via"           TEXT,
      "geo_lat"       DECIMAL(10, 7),
      "geo_lng"       DECIMAL(10, 7),
      "geo_accuracy"  DECIMAL(8, 2),
      "ip_address"    TEXT,
      "user_agent"    TEXT,
      "metadata_json" JSONB,
      "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: 'attendance_attempts indexes',
    sql: `CREATE INDEX IF NOT EXISTS "attendance_attempts_org_id_created_at_idx" ON "attendance_attempts"("org_id", "created_at");
          CREATE INDEX IF NOT EXISTS "attendance_attempts_worker_id_created_at_idx" ON "attendance_attempts"("worker_id", "created_at");
          CREATE INDEX IF NOT EXISTS "attendance_attempts_result_created_at_idx" ON "attendance_attempts"("result", "created_at")`,
  },
]

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  // Auth: super-admin O bearer CRON_SECRET (para automatizar)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCronAuthed = cronSecret && authHeader === `Bearer ${cronSecret}`
  const isSuperAdmin = isSuperAdminRole(ctx.role)

  if (!isCronAuthed && !isSuperAdmin) {
    return NextResponse.json(
      { error: 'Solo super-admin o cron secret pueden correr db-sync' },
      { status: 403 },
    )
  }

  const results: { name: string; ok: boolean; error?: string }[] = []
  let okCount = 0
  let errorCount = 0

  for (const patch of SCHEMA_PATCHES) {
    try {
      // Cada SQL puede tener varios statements separados por ;
      const statements = patch.sql.split(';').map(s => s.trim()).filter(Boolean)
      for (const stmt of statements) {
        await prisma.$executeRawUnsafe(stmt)
      }
      results.push({ name: patch.name, ok: true })
      okCount++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ name: patch.name, ok: false, error: msg.slice(0, 200) })
      errorCount++
    }
  }

  return NextResponse.json({
    ok: errorCount === 0,
    appliedCount: okCount,
    errorCount,
    results,
    message: errorCount === 0
      ? 'Schema sincronizado. Recarga la app y debería funcionar todo.'
      : `${errorCount} parche(s) fallaron. Revisa los detalles.`,
  })
})

// GET — verificación: lista qué parches están aplicados
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  if (!isSuperAdminRole(ctx.role)) {
    return NextResponse.json({ error: 'Solo super-admin' }, { status: 403 })
  }

  // Query introspectiva: qué columnas/tablas existen
  const checks: { name: string; exists: boolean }[] = []

  try {
    const cols = await prisma.$queryRaw<{ column_name: string; table_name: string }[]>`
      SELECT column_name, table_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'workers' AND column_name LIKE 'expected_%')
          OR (table_name = 'workers' AND column_name = 'late_tolerance_minutes')
          OR (table_name = 'attendance' AND column_name IN ('is_overtime', 'overtime_minutes'))
        )
    `
    const colSet = new Set(cols.map(c => `${c.table_name}.${c.column_name}`))

    checks.push({ name: 'workers.expected_clock_in_hour', exists: colSet.has('workers.expected_clock_in_hour') })
    checks.push({ name: 'workers.expected_clock_in_minute', exists: colSet.has('workers.expected_clock_in_minute') })
    checks.push({ name: 'workers.expected_clock_out_hour', exists: colSet.has('workers.expected_clock_out_hour') })
    checks.push({ name: 'workers.expected_clock_out_minute', exists: colSet.has('workers.expected_clock_out_minute') })
    checks.push({ name: 'workers.late_tolerance_minutes', exists: colSet.has('workers.late_tolerance_minutes') })
    checks.push({ name: 'attendance.is_overtime', exists: colSet.has('attendance.is_overtime') })
    checks.push({ name: 'attendance.overtime_minutes', exists: colSet.has('attendance.overtime_minutes') })

    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('geofences', 'attendance_attempts')
    `
    const tableSet = new Set(tables.map(t => t.table_name))
    checks.push({ name: 'table: geofences', exists: tableSet.has('geofences') })
    checks.push({ name: 'table: attendance_attempts', exists: tableSet.has('attendance_attempts') })

    const missing = checks.filter(c => !c.exists)

    return NextResponse.json({
      total: checks.length,
      applied: checks.length - missing.length,
      missing: missing.length,
      checks,
      action: missing.length > 0
        ? 'Hay cambios pendientes. POST a este mismo endpoint para aplicarlos.'
        : 'Schema sincronizado. No hay nada que aplicar.',
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No se pudo introspectar el schema' },
      { status: 500 },
    )
  }
})
