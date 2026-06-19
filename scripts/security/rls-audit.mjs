// Auditoría de cobertura RLS: lista toda tabla con columna `org_id` y dice si tiene
// Row Level Security habilitado y cuántas políticas. Las marcadas con ⚠️ son las que
// FALTAN antes de activar RLS_ENFORCED=true.
//
//   node scripts/security/rls-audit.mjs
import 'dotenv/config'
import pg from 'pg'

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) {
  console.error('Falta DIRECT_URL / DATABASE_URL en el entorno (.env).')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } })

const QUERY = `
SELECT
  c.relname               AS tabla,
  c.relrowsecurity        AS rls_enabled,
  COUNT(p.polname)::int    AS num_politicas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns col
    WHERE col.table_schema = 'public'
      AND col.table_name = c.relname
      AND col.column_name = 'org_id'
  )
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relrowsecurity ASC, num_politicas ASC, c.relname;
`

try {
  const { rows } = await pool.query(QUERY)
  console.log('\n' + 'TABLA (con org_id)'.padEnd(44) + 'RLS'.padEnd(6) + 'POLÍTICAS')
  console.log('─'.repeat(64))
  let conRls = 0
  let sinCobertura = 0
  const faltantes = []
  for (const r of rows) {
    const cubierta = r.rls_enabled && r.num_politicas > 0
    if (r.rls_enabled) conRls++
    if (!cubierta) { sinCobertura++; faltantes.push(r.tabla) }
    const flag = cubierta ? '' : '  ⚠️ FALTA'
    console.log(String(r.tabla).padEnd(44) + (r.rls_enabled ? 'sí' : 'NO').padEnd(6) + String(r.num_politicas) + flag)
  }
  console.log('─'.repeat(64))
  console.log(`Tablas con org_id: ${rows.length}  |  con RLS habilitado: ${conRls}  |  SIN cobertura: ${sinCobertura}`)
  if (faltantes.length) {
    console.log('\n⚠️  Cubrir antes de activar RLS_ENFORCED=true:')
    console.log('   ' + faltantes.join(', '))
  } else {
    console.log('\n✅ Todas las tablas con org_id tienen RLS + política.')
  }
} catch (e) {
  console.error('Error consultando RLS:', e instanceof Error ? e.message : e)
  process.exitCode = 1
} finally {
  await pool.end()
}
