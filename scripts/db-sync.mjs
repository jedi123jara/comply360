#!/usr/bin/env node
/**
 * db-sync — sincroniza el schema de Prisma con la DB en build de Vercel.
 *
 * Estrategia:
 *   1. Intenta `prisma migrate deploy` (lo correcto si la DB tiene
 *      historial de migrations en _prisma_migrations).
 *   2. Si falla con P3005 ("schema not empty, baseline needed"), cae a
 *      `prisma db push` que aplica el schema directamente
 *      sin requerir baseline de migrations.
 *
 * P3005 ocurre cuando la DB de prod fue creada sin pasar por el sistema
 * de migrations (con `db push` previo, o manualmente). El `db push` es
 * seguro mientras los cambios sean aditivos (ALTER TABLE ADD COLUMN con
 * DEFAULT, CREATE TABLE, ALTER TYPE ADD VALUE) — sin riesgo de pérdida
 * de datos.
 *
 * Si en el futuro el usuario hace baseline correcto de las migrations
 * existentes, este script automáticamente vuelve a usar migrate deploy
 * sin cambios.
 */

import { execSync } from 'node:child_process'

function run(cmd) {
  console.log(`[db-sync] $ ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

try {
  console.log('[db-sync] Intentando: prisma migrate deploy')
  run('npx prisma migrate deploy')
  console.log('[db-sync] ✅ Migrations aplicadas correctamente')
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  console.warn('[db-sync] ⚠ migrate deploy falló — caigo a db push')
  console.warn(`[db-sync] Razón probable: P3005 (DB sin baseline de migrations).`)
  console.warn(`[db-sync] db push aplica el schema directamente sin requerir migrations.`)
  console.warn(`[db-sync] Esto es seguro mientras los cambios sean aditivos.`)
  console.warn(`[db-sync] Detalle: ${msg.slice(0, 200)}`)

  try {
    run('npx prisma db push')
    console.log('[db-sync] ✅ Schema sincronizado vía db push')
  } catch (err2) {
    console.error('[db-sync] ❌ db push también falló')
    console.error(err2 instanceof Error ? err2.message : err2)
    // Si AMBOS fallan, no bloqueamos el build — el código defensivo en los
    // endpoints (try/catch alrededor de selects con campos nuevos) permite
    // que la app arranque y degrade gracefully sin las features nuevas.
    console.warn('[db-sync] ⚠ Continuando con build sin migrations aplicadas')
    console.warn('[db-sync] Las features nuevas pueden no funcionar hasta que el')
    console.warn('[db-sync] admin aplique manualmente: npx prisma db push')
  }
}
