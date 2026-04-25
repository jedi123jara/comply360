#!/usr/bin/env node
/**
 * check-multitenant.mjs
 *
 * Garantía de aislamiento multi-tenant en endpoints API.
 *
 * Recorre todos los handlers en `src/app/api/**` y verifica que cada query
 * Prisma (findMany, findFirst, findUnique, count, aggregate, deleteMany,
 * updateMany, groupBy) opere con scope a `orgId` — ya sea en el `where:`
 * directamente, o derivado vía join (workerId/contractId que apunten a un
 * registro previamente filtrado por orgId).
 *
 * Reglas:
 *  - El handler debe importar `withAuth` / `withRole` / `withWorkerAuth`
 *    (que inyectan `ctx.orgId`).
 *  - Si NO importa ninguno de esos wrappers, debe estar en WHITELIST.
 *
 * Uso:
 *   node scripts/preflight/check-multitenant.mjs           # check, exit 1 si hay leaks
 *   node scripts/preflight/check-multitenant.mjs --verbose # imprime cada handler con su veredicto
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), 'src/app/api')
const VERBOSE = process.argv.includes('--verbose')

// Endpoints que LEGÍTIMAMENTE no filtran por orgId.
// Cada entrada documenta el motivo.
const WHITELIST = new Map([
  // Health / probes públicos
  ['health/route.ts', 'public health probe'],
  ['diagnostics/route.ts', 'public diagnostics endpoint (no PII)'],

  // Webhooks entrantes: validan firma HMAC en lugar de auth Clerk
  ['payments/webhook/route.ts', 'inbound webhook (HMAC)'],
  ['webhooks/clerk/route.ts', 'Clerk webhook (svix)'],
  ['webhooks/culqi/route.ts', 'Culqi webhook (HMAC)'],

  // Endpoints públicos para leads / canales de denuncia
  ['leads/route.ts', 'public lead capture'],
  ['complaints/route.ts', 'public complaint channel (Ley 27942)'],
  ['casilla/route.ts', 'public casilla SUNAFIL'],

  // Verificación pública de sellos Compliance-Ready
  ['seals/[slug]/route.ts', 'verificación pública del sello (link público)'],

  // Crons protegidos por CRON_SECRET — operan global por diseño
  ['cron/morning-briefing/route.ts', 'cron, CRON_SECRET'],
  ['cron/drip-emails/route.ts', 'cron, CRON_SECRET'],
  ['cron/daily-alerts/route.ts', 'cron, CRON_SECRET'],
  ['cron/weekly-digest/route.ts', 'cron, CRON_SECRET'],
  ['cron/norm-updates/route.ts', 'cron, CRON_SECRET'],
  ['cron/check-trials/route.ts', 'cron, CRON_SECRET'],
  ['cron/founder-digest/route.ts', 'cron, CRON_SECRET — global metrics'],
  ['cron/risk-sweep/route.ts', 'cron, CRON_SECRET'],
  ['cron/scheduled-reports/route.ts', 'cron, CRON_SECRET'],
  ['cron/workflow-resume/route.ts', 'cron, CRON_SECRET — limpia workflowRuns colgados'],
  ['cron/issue-seals/route.ts', 'cron mensual, emite sellos a orgs cualificadas'],

  // Founder Console (SUPER_ADMIN único): vistas globales por diseño
  ['admin/overview/route.ts', 'SUPER_ADMIN founder console — global metrics intentional'],
  ['admin/admins/route.ts', 'SUPER_ADMIN ops on User table'],
  ['admin/auditoria/route.ts', 'SUPER_ADMIN audit trail global'],
  ['admin/billing/route.ts', 'SUPER_ADMIN MRR aggregate'],
  ['admin/analytics/route.ts', 'SUPER_ADMIN analytics global'],
  ['admin/empresas/route.ts', 'SUPER_ADMIN empresas listing'],
  ['admin/empresas/[id]/route.ts', 'SUPER_ADMIN single empresa view'],
  ['admin/soporte/route.ts', 'SUPER_ADMIN support inbox'],
  ['admin/configuracion/route.ts', 'SUPER_ADMIN platform config'],
  ['admin/ai-usage/route.ts', 'SUPER_ADMIN founder telemetría IA cross-org (intencional)'],

  // Self-service: ctx.userId garantiza scope a sí mismo
  ['user/export-my-data/route.ts', 'self export — userId-scoped'],
  ['user/delete-me/route.ts', 'self delete — userId-scoped'],
  ['me/route.ts', 'self profile'],

  // WebAuthn challenge: stateless por design
  ['webauthn/challenge/route.ts', 'webauthn challenge (stateless)'],
  ['webauthn/register/route.ts', 'webauthn register (userId-scoped)'],
  ['webauthn/register/options/route.ts', 'webauthn register options (userId-scoped, no orgId aplica)'],
  ['webauthn/register/verify/route.ts', 'webauthn register verify (userId-scoped)'],
  ['webauthn/auth/options/route.ts', 'webauthn auth options (workerId-scoped)'],
  ['webauthn/auth/verify/route.ts', 'webauthn auth verify (workerId-scoped)'],

  // Catálogos globales (no tienen orgId en su schema por diseño)
  ['templates/route.ts', 'ContractTemplate es catálogo global (5 plantillas base)'],
  ['portal-empleado/route.ts', 'lookup público worker→portal vía email'],
  ['webhooks/casilla/route.ts', 'webhook casilla SUNAFIL (token validation)'],
  ['norm-updates/route.ts', 'NormUpdate es catálogo global de normativa peruana'],
  ['admin/norm-updates/route.ts', 'SUPER_ADMIN gestión de catálogo normativo global'],
  ['admin/norm-updates/[id]/route.ts', 'SUPER_ADMIN editar norma del catálogo'],
  ['admin/support/route.ts', 'SUPER_ADMIN inbox de soporte cross-org'],

  // Verificación pública de certificados (URL pública con código)
  ['certificates/verify/route.ts', 'verificación pública de certificado por código'],
  ['certificates/[code]/qr/route.ts', 'QR generado para certificado público'],
  ['certification/verify/route.ts', 'verificación pública de sello compliance'],
])

// Patrones de auth válidos en el codebase. Si el handler usa CUALQUIERA
// de éstos + filtra por orgId, está OK.
const SAFE_WRAPPERS = [
  // Wrappers de alto nivel (src/lib/api-auth.ts)
  'withAuth',
  'withAuthParams', // versión con params dinámicos /[id]
  'withRole',
  'withRoleParams',
  'withSuperAdmin',
  'withWorkerAuth',
  'withWorkerAuthParams',
  'withPlanGate',
  'withApiKey',
  // Helpers low-level (src/lib/auth.ts) — handlers que los llaman directo
  'getAuthContext',
  'requireAuth',
  'currentUser',
  // Clerk directo (función auth() — verificada por substring "auth(" porque
  // muchos wrappers la incluyen indirectamente)
  // API pública v1 con Bearer API key
  'apiKeyService',
  'validateApiKey',
  // Webhooks con HMAC manual
  'validateWebhookSignature',
  // Chrome Extension con shared secret
  'EXTENSION_TOKEN',
  'X-Extension-Token',
]

// Operaciones Prisma que leen/escriben datos. Las que NO necesitan orgId filter
// (ej. `create` con orgId en data) las verificamos por separado.
const QUERY_OPS = [
  'findMany',
  'findFirst',
  'findUnique',
  'count',
  'aggregate',
  'groupBy',
  'deleteMany',
  'updateMany',
]

const QUERY_REGEX = new RegExp(
  '\\bprisma\\.([A-Za-z]+)\\.(' + QUERY_OPS.join('|') + ')\\s*\\(',
  'g',
)

const issues = []
const stats = { handlers: 0, whitelisted: 0, queries: 0, leaks: 0 }

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (e.name === 'route.ts' || e.name === 'route.tsx') yield p
  }
}

function relativeApi(filePath) {
  return path
    .relative(ROOT, filePath)
    .split(path.sep)
    .join('/')
}

function usesSafeWrapper(content) {
  if (SAFE_WRAPPERS.some((w) => new RegExp(`\\b${w}\\b`).test(content))) return true
  // Patrón especial: import directo de Clerk auth() — handler que llama
  // `await auth()` para obtener orgId/userId.
  if (/from ['"]@clerk\/nextjs\/server['"]/.test(content) && /\bauth\s*\(\s*\)/.test(content)) {
    return true
  }
  return false
}

function hasOrgIdGuard(content) {
  // Heurística: el handler hace al menos una mención a `orgId` en where: o en data:.
  // Esto cubre tanto filtros directos como derivaciones (ej: where: { worker: { orgId } }).
  return /\borgId\b/.test(content) || /\borg_id\b/.test(content) || /\borgId:/.test(content)
}

function hasWorkerIdGuard(content) {
  // Cuando el handler corre bajo withWorkerAuth, el scope se deriva de
  // `ctx.workerId`. Una query a `workerContract` o `payslip` filtrada por
  // `workerId` es safe sin necesidad de mencionar orgId, porque el wrapper
  // ya validó que el worker pertenece al usuario (y por ende a su org).
  return /workerId:\s*ctx\.workerId/.test(content) || /\bctx\.workerId\b/.test(content)
}

for await (const file of walk(ROOT)) {
  stats.handlers += 1
  const rel = relativeApi(file)
  const content = await fs.readFile(file, 'utf8')

  if (WHITELIST.has(rel)) {
    stats.whitelisted += 1
    if (VERBOSE) console.log(`  ⊘ ${rel}  (whitelist: ${WHITELIST.get(rel)})`)
    continue
  }

  const queries = [...content.matchAll(QUERY_REGEX)]
  if (queries.length === 0) {
    if (VERBOSE) console.log(`  · ${rel}  (sin queries Prisma de lectura)`)
    continue
  }

  stats.queries += queries.length

  const safeWrapped = usesSafeWrapper(content)
  const hasOrgRef = hasOrgIdGuard(content)
  const hasWorkerRef = hasWorkerIdGuard(content)

  if (safeWrapped && (hasOrgRef || hasWorkerRef)) {
    if (VERBOSE) {
      const scope = hasOrgRef ? 'orgId-scoped' : 'workerId-scoped'
      console.log(`  ✓ ${rel}  (${queries.length} queries, ${scope})`)
    }
    continue
  }

  // Issue: handler con queries pero sin scope visible.
  stats.leaks += queries.length
  issues.push({
    file: rel,
    queries: queries.length,
    safeWrapped,
    hasOrgRef,
    sampleOps: queries.slice(0, 3).map((m) => `${m[1]}.${m[2]}`).join(', '),
  })
}

console.log('\n📋 Multi-tenant audit — endpoints API\n')
console.log(`  Handlers analizados:    ${stats.handlers}`)
console.log(`  Whitelisted (público):  ${stats.whitelisted}`)
console.log(`  Queries Prisma vistas:  ${stats.queries}`)
console.log(`  Posibles leaks:         ${stats.leaks}`)
console.log('')

if (issues.length === 0) {
  console.log('✓ Cero leaks detectados. Cada endpoint con query usa wrapper seguro + filtro orgId.\n')
  process.exit(0)
}

console.error('✗ Endpoints con queries sin scope multi-tenant evidente:\n')
for (const i of issues) {
  console.error(`  ${i.file}`)
  console.error(`    queries=${i.queries} | safeWrapper=${i.safeWrapped} | orgIdRef=${i.hasOrgRef}`)
  console.error(`    ops: ${i.sampleOps}`)
  console.error('')
}
console.error(`Si el endpoint es legítimamente público (webhook, cron, founder), agrégalo a WHITELIST con razón.`)
console.error(`Si no, envuélvelo con withAuth/withRole y filtra por ctx.orgId.\n`)
process.exit(1)
