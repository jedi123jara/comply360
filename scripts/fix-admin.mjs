// Diagnóstico + fix completo del admin: mira el estado real de la DB,
// lo repara y confirma. Sin tocar UI.
//
// Run: node scripts/fix-admin.mjs

import { existsSync } from 'node:fs'
import { config as loadEnv } from 'dotenv'
if (existsSync('.env.production.local')) {
  loadEnv({ path: '.env.production.local', override: true })
} else {
  loadEnv()
}

import pg from 'pg'

const ADMIN_EMAIL = 'a.jaracarranza@gmail.com'
const conn = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!conn) {
  console.error('❌ Falta DIRECT_URL/DATABASE_URL en env')
  process.exit(1)
}

const client = new pg.Client({
  connectionString: conn,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await client.connect()
  console.log('🔌 Conectado a la DB\n')

  // ── 1. Ver el estado actual del user
  console.log('━━━ Estado ACTUAL del user ━━━')
  const userQ = await client.query(
    `SELECT id, email, role, org_id, first_name, last_name, created_at
     FROM users
     WHERE email = $1`,
    [ADMIN_EMAIL],
  )
  if (userQ.rows.length === 0) {
    console.log(`⚠ No existe user con email ${ADMIN_EMAIL} en la DB todavía.`)
    console.log(
      '   Esto significa que Clerk creó tu cuenta pero el JIT provisioning no se disparó.',
    )
    console.log('   Necesitás hacer al menos UNA request autenticada (ej: entrar al dashboard)')
    console.log('   para que se cree la fila. Volvé a loguearte y correme de nuevo.')
    await client.end()
    process.exit(0)
  }
  const user = userQ.rows[0]
  console.log(user)
  console.log()

  // ── 2. Ver el estado actual de su org (si tiene)
  console.log('━━━ Estado ACTUAL de su org ━━━')
  if (!user.org_id) {
    console.log('⚠ El user NO tiene org_id asignada.')
  } else {
    const orgQ = await client.query(
      `SELECT id, name, ruc, sector, size_range, regimen_principal,
              onboarding_completed, plan, alert_email
       FROM organizations
       WHERE id = $1`,
      [user.org_id],
    )
    console.log(orgQ.rows[0] ?? `⚠ org_id ${user.org_id} no existe en organizations.`)
  }
  console.log()

  // ── 3. FIX: si no tiene org_id, creamos una. Si tiene, la marcamos onboarded.
  console.log('━━━ Aplicando FIX ━━━')

  let targetOrgId = user.org_id
  if (!targetOrgId) {
    targetOrgId = `org-${ADMIN_EMAIL.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}`
    console.log(`→ Creando organization "${targetOrgId}" ...`)
    await client.query(
      `INSERT INTO organizations
         (id, name, razon_social, sector, size_range, regimen_principal,
          alert_email, plan, onboarding_completed, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PRO', true, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         onboarding_completed = true,
         plan = 'PRO',
         updated_at = now()`,
      [
        targetOrgId,
        'Comply360 Admin Org',
        'COMPLY360 ADMIN',
        'Tecnología',
        '1-10',
        'GENERAL',
        ADMIN_EMAIL,
      ],
    )
    console.log('  ✓ Org creada/actualizada')

    console.log(`→ Linkeando user al org ...`)
    await client.query(`UPDATE users SET org_id = $1 WHERE email = $2`, [
      targetOrgId,
      ADMIN_EMAIL,
    ])
    console.log('  ✓ User linkeado')
  } else {
    console.log(`→ Marcando org "${targetOrgId}" como onboarded ...`)
    await client.query(
      `UPDATE organizations
       SET onboarding_completed = true,
           plan = COALESCE(plan, 'PRO'),
           sector = COALESCE(sector, 'Tecnología'),
           regimen_principal = COALESCE(regimen_principal, 'GENERAL'),
           size_range = COALESCE(size_range, '1-10'),
           updated_at = now()
       WHERE id = $1`,
      [targetOrgId],
    )
    console.log('  ✓ Org marcada onboarded')
  }

  console.log(`→ Haciendo al user SUPER_ADMIN ...`)
  await client.query(`UPDATE users SET role = 'SUPER_ADMIN' WHERE email = $1`, [ADMIN_EMAIL])
  console.log('  ✓ Rol actualizado\n')

  // ── 4. Verificar estado final
  console.log('━━━ Estado FINAL ━━━')
  const finalQ = await client.query(
    `SELECT u.email, u.role, u.org_id,
            o.name as org_name, o.onboarding_completed, o.plan, o.sector
     FROM users u
     LEFT JOIN organizations o ON u.org_id = o.id
     WHERE u.email = $1`,
    [ADMIN_EMAIL],
  )
  console.log(finalQ.rows[0])
  console.log()

  const final = finalQ.rows[0]
  const ok =
    final.role === 'SUPER_ADMIN' &&
    final.onboarding_completed === true &&
    final.org_id
  if (ok) {
    console.log('🎉 TODO LISTO. Hacé Ctrl+Shift+R en comply360.pe/dashboard')
    console.log('   Deberías ver el dashboard normal (no el onboarding) y acceso Admin.')
  } else {
    console.log('⚠ Algo quedó a medias, revisa manualmente:')
    console.log(final)
  }

  await client.end()
}

main().catch(async (err) => {
  console.error('\n💥 Error:', err.message)
  try {
    await client.end()
  } catch {}
  process.exit(1)
})
