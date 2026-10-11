#!/usr/bin/env node
/**
 * db-sync — sincroniza el schema de Prisma con la DB en el build de Vercel.
 *
 * Solo corre en el deploy de PRODUCCIÓN. Las previews comparten las variables
 * de entorno (y por lo tanto la DB) de producción: si sincronizaran el schema,
 * una rama sin mergear podría cambiar la base real. Los builds locales tampoco
 * corren, salvo que se pida con DB_SYNC=1.
 *
 * Estrategia en producción:
 *   1. Intenta `prisma migrate deploy` (lo correcto si la DB tiene
 *      historial de migrations en _prisma_migrations).
 *   2. Si falla (P3005: DB creada sin baseline de migrations), cae a
 *      `prisma db push`, que sin --accept-data-loss se niega a aplicar
 *      cambios destructivos.
 *   3. Si los dos fallan, por ahora el build sigue (comportamiento anterior),
 *      porque no sabemos si la DB de producción tiene drift que haga fallar
 *      db push en cada deploy. Con DB_SYNC_STRICT=1 el build se detiene;
 *      activarlo cuando el baseline esté hecho.
 *
 * Pendiente: hacer el baseline de las migrations en la DB de producción
 * (`prisma migrate resolve --applied <migration>` por cada una) para que el
 * paso 1 funcione y se pueda retirar el fallback a db push.
 */

import { execSync } from 'node:child_process'

function run(cmd) {
  console.log(`[db-sync] $ ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

function shouldSync() {
  if (process.env.DB_SYNC === '1') return { run: true, reason: 'DB_SYNC=1' }
  if (process.env.VERCEL !== '1') return { run: false, reason: 'build local (usa DB_SYNC=1 para forzar)' }
  const env = process.env.VERCEL_ENV
  if (env === 'production') return { run: true, reason: 'deploy de producción' }
  if (env === 'preview' || env === 'development') {
    return { run: false, reason: `deploy de ${env}: no toca la DB de producción` }
  }
  // Vercel sin VERCEL_ENV expuesto: mantenemos el comportamiento anterior.
  console.warn('[db-sync] ⚠ VERCEL_ENV no está disponible; se asume producción')
  return { run: true, reason: 'VERCEL_ENV ausente' }
}

const decision = shouldSync()
if (!decision.run) {
  console.log(`[db-sync] Omitido: ${decision.reason}`)
  process.exit(0)
}
console.log(`[db-sync] Sincronizando schema (${decision.reason})`)

try {
  run('npx prisma migrate deploy')
  console.log('[db-sync] ✅ Migrations aplicadas correctamente')
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  console.warn('[db-sync] ⚠ migrate deploy falló — intento db push')
  console.warn('[db-sync] Razón probable: P3005 (DB sin baseline de migrations).')
  console.warn(`[db-sync] Detalle: ${msg.slice(0, 200)}`)

  try {
    run('npx prisma db push')
    console.log('[db-sync] ✅ Schema sincronizado vía db push')
  } catch (err2) {
    console.error('[db-sync] ❌ db push también falló')
    console.error(err2 instanceof Error ? err2.message : err2)
    if (process.env.DB_SYNC_STRICT === '1') {
      console.error('[db-sync] DB_SYNC_STRICT=1: se detiene el build')
      process.exit(1)
    }
    console.warn('[db-sync] ⚠ Continuando el build sin sincronizar el schema')
  }
}
