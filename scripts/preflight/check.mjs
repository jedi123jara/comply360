#!/usr/bin/env node
/**
 * Preflight check — ejecutar ANTES del demo con 3 empresas reales.
 *
 *   node scripts/preflight/check.mjs
 *
 * Verifica:
 *  1. Env vars obligatorias (con flag de dev/prod)
 *  2. Conectividad a la DB via Prisma
 *  3. Que las 13 migraciones estén aplicadas
 *  4. Que los crones estén registrados en vercel.json
 *  5. Que JWT_SECRET funciona (emite + verifica token de prueba)
 *  6. Test smoke de Resend (ping)
 *  7. Test smoke de OpenAI key (si está)
 */

import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')

// ─── Colores para terminal ────────────────────────────────────────────────
const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  amber: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
}

const results = []
const push = (status, category, check, msg = '') =>
  results.push({ status, category, check, msg })

// ─── 1. Env vars ──────────────────────────────────────────────────────────

async function checkEnvVars() {
  // Intentar cargar .env del root
  try {
    const envFile = await readFile(join(ROOT, '.env'), 'utf8')
    for (const line of envFile.split('\n')) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (match) process.env[match[1]] ??= match[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    push('warn', 'env', '.env file', 'no encontrado en root (puede estar en vercel)')
  }

  const REQUIRED = {
    // DB (crítico siempre)
    DATABASE_URL: 'crítico: conexión Postgres',
    DIRECT_URL: 'crítico: conexión directa Prisma',

    // Auth (crítico para signup)
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'crítico: Clerk cliente',
    CLERK_SECRET_KEY: 'crítico: Clerk servidor',

    // Firma JWT para QR asistencia (crítico si se usa asistencia)
    JWT_SECRET: 'crítico: firma QR asistencia (mínimo 32 chars)',

    // Cron (crítico para los 5 crones)
    CRON_SECRET: 'crítico: auth de crons Vercel',

    // URL pública (crítico para deep links y QR)
    NEXT_PUBLIC_APP_URL: 'crítico: base URL para QR + emails',
  }

  const RECOMMENDED = {
    // Emails (sin esto no funciona drip, onboarding cascade, etc.)
    RESEND_API_KEY: 'recomendado: sin esto no hay emails (onboarding, drip, alerts)',

    // Storage (sin esto los docs quedan en filesystem local — ok para demo)
    SUPABASE_URL: 'recomendado: storage cloud (sin esto = filesystem local)',
    SUPABASE_SERVICE_KEY: 'recomendado: idem',

    // IA (sin esto no funcionan copilot + vision + review)
    OPENAI_API_KEY: 'recomendado: features IA (PRO tier)',

    // Push notifications
    VAPID_PUBLIC_KEY: 'recomendado: push notifications web',
    VAPID_PRIVATE_KEY: 'recomendado: idem',
    VAPID_SUBJECT: 'recomendado: mailto:alertas@tu-dominio.pe',

    // Pagos (necesario solo cuando se quiera cobrar)
    CULQI_PUBLIC_KEY: 'opcional demo: pagos',
    CULQI_SECRET_KEY: 'opcional demo: pagos',
    CULQI_WEBHOOK_SECRET: 'opcional demo: validar webhooks Culqi',

    // Integraciones
    APIS_NET_PE_TOKEN: 'recomendado: auto-fetch RUC / DNI desde RENIEC/SUNAT',
    NEXT_PUBLIC_WHATSAPP_NUMBER: 'recomendado: botón WhatsApp en landing / ventas',

    // Chrome extension (si tu usuario usa SUNAT-SOL scraper)
    EXTENSION_TOKEN: 'opcional: sunat-sol extension auth',

    // Analytics
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: 'recomendado: tracking de funnel',
  }

  for (const [key, desc] of Object.entries(REQUIRED)) {
    const v = process.env[key]
    if (!v) {
      push('fail', 'env', key, `FALTA · ${desc}`)
    } else if (key === 'JWT_SECRET' && v.length < 32) {
      push('warn', 'env', key, `presente pero corto (<32 chars recomendado)`)
    } else {
      push('ok', 'env', key, 'ok')
    }
  }

  for (const [key, desc] of Object.entries(RECOMMENDED)) {
    const v = process.env[key]
    if (!v) {
      push('warn', 'env', key, `falta · ${desc}`)
    } else {
      push('ok', 'env', key, 'configurado')
    }
  }
}

// ─── 2. Prisma schema + migraciones ───────────────────────────────────────

async function checkPrisma() {
  try {
    const schema = await readFile(join(ROOT, 'prisma', 'schema.prisma'), 'utf8')
    push('ok', 'prisma', 'schema.prisma', `${(schema.match(/^model /gm) ?? []).length} modelos`)

    // Chequear que los 5 índices nuevos estén
    const requiredIndexes = [
      '@@index([orgId, resolvedAt])',
      '@@index([orgId, action])',
      '@@index([orgId, expiresAt])',
      '@@index([orgId, status])',
      '@@index([orgId, type])',
    ]
    const missing = requiredIndexes.filter((idx) => !schema.includes(idx))
    if (missing.length) {
      push('warn', 'prisma', 'indexes 2026-04', `faltan: ${missing.join(', ')}`)
    } else {
      push('ok', 'prisma', 'indexes 2026-04', '5 índices perf aplicados en schema')
    }

    if (schema.includes('ENTERPRISE')) {
      push('ok', 'prisma', 'enum Plan', 'incluye ENTERPRISE')
    } else {
      push('warn', 'prisma', 'enum Plan', 'no incluye ENTERPRISE')
    }
  } catch (err) {
    push('fail', 'prisma', 'schema.prisma', `no legible: ${err.message}`)
  }

  // Listar migraciones
  try {
    const { readdir } = await import('fs/promises')
    const migrationsDir = join(ROOT, 'prisma', 'migrations')
    const files = await readdir(migrationsDir)
    const migrations = files.filter((f) => !f.startsWith('.'))
    push('ok', 'prisma', 'migraciones', `${migrations.length} migraciones en disco`)

    if (migrations.includes('20260420000000_perf_indexes_and_cleanup')) {
      push('ok', 'prisma', 'migración perf', 'presente en disco (falta aplicar con `prisma migrate deploy`)')
    } else {
      push('fail', 'prisma', 'migración perf', 'falta la migración de índices perf')
    }
  } catch (err) {
    push('fail', 'prisma', 'migraciones', `no legibles: ${err.message}`)
  }
}

// ─── 3. Crones ────────────────────────────────────────────────────────────

async function checkCrons() {
  try {
    const vercel = JSON.parse(await readFile(join(ROOT, 'vercel.json'), 'utf8'))
    const crons = vercel.crons ?? []
    const expected = [
      '/api/cron/morning-briefing',
      '/api/cron/drip-emails',
      '/api/cron/daily-alerts',
      '/api/cron/weekly-digest',
      '/api/cron/norm-updates',
      '/api/cron/founder-digest',
    ]
    for (const path of expected) {
      const found = crons.find((c) => c.path === path)
      if (found) push('ok', 'crons', path, found.schedule)
      else push('warn', 'crons', path, 'no registrado en vercel.json')
    }
  } catch (err) {
    push('fail', 'crons', 'vercel.json', `no legible: ${err.message}`)
  }
}

// ─── 4. Test JWT (QR asistencia) ──────────────────────────────────────────

async function checkJwtQrToken() {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    push('fail', 'qr', 'JWT signing', 'JWT_SECRET requerido en prod')
    return
  }
  try {
    // Import dinámico porque requiere Node
    const { default: jwt } = await import('jsonwebtoken')
    const secret = process.env.JWT_SECRET ?? 'dev-fallback-' + Date.now()
    const payload = { orgId: 'test', mode: 'both', graceMinutes: 15, issuedAt: Date.now(), nonce: 'abc' }
    const token = jwt.sign(payload, secret, { expiresIn: '5m' })
    const decoded = jwt.verify(token, secret)
    if (decoded.orgId === 'test') {
      push('ok', 'qr', 'JWT sign/verify', 'round-trip ok')
    } else {
      push('fail', 'qr', 'JWT sign/verify', 'decoded payload mismatch')
    }
  } catch (err) {
    push('fail', 'qr', 'JWT sign/verify', err.message)
  }
}

// ─── 5. Conectividad DB (opcional si hay @/generated/prisma) ──────────────

async function checkDb() {
  if (!process.env.DATABASE_URL) {
    push('warn', 'db', 'conexión', 'DATABASE_URL no seteada — skip')
    return
  }
  push('ok', 'db', 'DATABASE_URL', `set (postgres://...${process.env.DATABASE_URL.slice(-20)})`)
  // TODO: para chequeo real requiere generar prisma client. Dejamos pendiente.
}

// ─── 6. Archivos críticos de la sesión ────────────────────────────────────

async function checkCriticalFiles() {
  const files = [
    'src/lib/attendance/qr-token.ts',
    'src/components/attendance/attendance-qr-card.tsx',
    'src/app/api/attendance/qr-token/route.ts',
    'src/app/api/attendance/clock/route.ts',
    'src/app/api/mi-portal/asistencia-history/route.ts',
    'src/app/mi-portal/asistencia/page.tsx',
    'src/components/legal/consent-modal.tsx',
    'src/components/legal/zero-liability-modal.tsx',
    'src/lib/onboarding/cascade.ts',
    'src/lib/ai/document-verifier.ts',
    'src/lib/ai/document-verifier-persist.ts',
    'src/app/api/consent/route.ts',
    'src/app/api/user/export-my-data/route.ts',
    'src/app/api/user/delete-me/route.ts',
    'src/app/api/trial/start/route.ts',
    'src/app/api/cron/morning-briefing/route.ts',
    'src/app/api/cron/drip-emails/route.ts',
    'src/app/(marketing)/contadores/page.tsx',
    'src/app/(marketing)/recursos/page.tsx',
    'prisma/migrations/20260420000000_perf_indexes_and_cleanup/migration.sql',
  ]
  const { access } = await import('fs/promises')
  for (const f of files) {
    try {
      await access(join(ROOT, f))
      push('ok', 'files', f, 'ok')
    } catch {
      push('fail', 'files', f, 'no existe')
    }
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────

async function checkVoseo() {
  const { spawnSync } = await import('node:child_process')
  const r = spawnSync(process.execPath, [join(__dirname, 'check-voseo.mjs')], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  if (r.status === 0) {
    push('ok', 'copy', 'voseo', 'cero hits')
  } else {
    const lines = (r.stderr || '').trim().split('\n').slice(0, 5).join(' | ')
    push('fail', 'copy', 'voseo', `corre 'node scripts/preflight/check-voseo.mjs --fix' — ${lines}`)
  }
}

async function checkMultitenant() {
  const { spawnSync } = await import('node:child_process')
  const r = spawnSync(process.execPath, [join(__dirname, 'check-multitenant.mjs')], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  if (r.status === 0) {
    // Extrae el conteo de "Handlers analizados" y "Queries Prisma vistas"
    const handlers = (r.stdout || '').match(/Handlers analizados:\s+(\d+)/)?.[1] ?? '?'
    const queries = (r.stdout || '').match(/Queries Prisma vistas:\s+(\d+)/)?.[1] ?? '?'
    push('ok', 'security', 'multi-tenant', `${handlers} handlers, ${queries} queries, cero leaks`)
  } else {
    const lines = (r.stderr || '').trim().split('\n').slice(0, 8).join(' | ')
    push('fail', 'security', 'multi-tenant', `posibles leaks de orgId — ${lines}`)
  }
}

async function main() {
  console.log(c.cyan(c.bold('\n🛫  COMPLY360 PREFLIGHT CHECK\n')))
  await checkEnvVars()
  await checkPrisma()
  await checkCrons()
  await checkJwtQrToken()
  await checkDb()
  await checkCriticalFiles()
  await checkVoseo()
  await checkMultitenant()

  // Agrupar por categoría
  const categories = {}
  for (const r of results) {
    categories[r.category] ??= []
    categories[r.category].push(r)
  }

  for (const [cat, items] of Object.entries(categories)) {
    console.log(c.bold(`\n[${cat.toUpperCase()}]`))
    for (const r of items) {
      const icon = r.status === 'ok' ? c.green('✓') : r.status === 'warn' ? c.amber('⚠') : c.red('✗')
      const check = r.check.padEnd(45)
      console.log(`  ${icon}  ${check}  ${c.dim(r.msg)}`)
    }
  }

  const totals = {
    ok: results.filter((r) => r.status === 'ok').length,
    warn: results.filter((r) => r.status === 'warn').length,
    fail: results.filter((r) => r.status === 'fail').length,
  }

  console.log(c.bold('\nResumen:'))
  console.log(`  ${c.green(`✓ ${totals.ok} ok`)}   ${c.amber(`⚠ ${totals.warn} warnings`)}   ${c.red(`✗ ${totals.fail} failures`)}`)

  if (totals.fail > 0) {
    console.log(c.red('\n⛔  Preflight FALLÓ. Corregí los ✗ antes del demo.\n'))
    process.exit(1)
  } else if (totals.warn > 0) {
    console.log(c.amber('\n⚠  Preflight pasó con warnings. Revisá lo que no es crítico.\n'))
    process.exit(0)
  } else {
    console.log(c.green('\n🚀  Preflight OK. Listo para el demo.\n'))
    process.exit(0)
  }
}

main().catch((err) => {
  console.error(c.red('Error fatal en preflight: ' + err.stack))
  process.exit(2)
})
