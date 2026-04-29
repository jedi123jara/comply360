#!/usr/bin/env node
/**
 * migration-baseline — marca TODAS las migrations existentes como aplicadas.
 *
 * Cuándo usar:
 *   La DB de prod fue creada sin pasar por el sistema de migrations
 *   (con db push o manualmente), entonces _prisma_migrations no existe o
 *   está vacía. Pero las tablas SÍ existen, reflejando el schema acumulado.
 *
 *   Con este script, le decimos a Prisma "estas migrations ya están
 *   aplicadas en la DB, no las re-corras". Después de esto, el sistema
 *   vuelve al flujo normal de `prisma migrate deploy` para futuras migrations.
 *
 * Cómo usar:
 *   1. Asegúrate que DATABASE_URL apunte a tu DB de PROD (no la local).
 *      Puedes usar export DATABASE_URL="postgresql://..." o un .env.production
 *   2. Corre: node scripts/migration-baseline.mjs
 *   3. El script va una por una marcando cada migration como aplicada.
 *      Si una falla porque ya estaba marcada, se salta sin error.
 *
 * Es seguro: solo escribe a la tabla _prisma_migrations, nunca toca
 * las tablas de datos.
 *
 * Después de correr esto:
 *   - Puedes volver a usar `prisma migrate deploy` (cambiar el build script
 *     de scripts/db-sync.mjs a `prisma migrate deploy`)
 *   - O dejar el wrapper como está (también funciona).
 */

import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = 'prisma/migrations'

// Listar todas las carpetas de migrations (excepto el lock file)
const migrations = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort()

console.log(`[baseline] Encontradas ${migrations.length} migrations.`)
console.log(`[baseline] DATABASE_URL: ${(process.env.DATABASE_URL ?? 'NO_DEFINIDA').slice(0, 60)}...`)
console.log(`[baseline] Empezando baseline... (las que ya estén marcadas se saltan)`)
console.log()

let applied = 0
let skipped = 0
let errors = 0

for (const name of migrations) {
  const sqlPath = join(MIGRATIONS_DIR, name, 'migration.sql')
  // Verificación rápida que la migration tenga su SQL
  try {
    readdirSync(join(MIGRATIONS_DIR, name)).filter(f => f === 'migration.sql')
  } catch {
    console.log(`[baseline]    ${name} — sin migration.sql, salto`)
    skipped++
    continue
  }

  try {
    execSync(`npx prisma migrate resolve --applied "${name}"`, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    console.log(`[baseline] ✅ ${name}`)
    applied++
  } catch (err) {
    const stderr = (err.stderr ?? err.stdout ?? '').toString()
    if (stderr.includes('already in applied state') || stderr.includes('already recorded')) {
      console.log(`[baseline] ⏭ ${name} (ya estaba)`)
      skipped++
    } else {
      console.error(`[baseline] ❌ ${name}`)
      console.error('   ', stderr.slice(0, 200))
      errors++
    }
  }
}

console.log()
console.log(`[baseline] ✅ Aplicadas: ${applied}`)
console.log(`[baseline] ⏭ Saltadas:  ${skipped}`)
console.log(`[baseline] ❌ Errores:   ${errors}`)
console.log()

if (errors === 0) {
  console.log('[baseline] 🎉 Listo. Ya puedes volver a usar `prisma migrate deploy`.')
  console.log('[baseline] Si quieres simplificar el build, en package.json cambia:')
  console.log('[baseline]   "build": "node scripts/db-sync.mjs && next build"')
  console.log('[baseline]   →')
  console.log('[baseline]   "build": "prisma migrate deploy && next build"')
} else {
  console.log('[baseline] ⚠ Algunas migrations fallaron. Revisa los errores arriba.')
  console.log('[baseline] El wrapper db-sync.mjs sigue funcionando, no urge resolver esto.')
  process.exitCode = 1
}
