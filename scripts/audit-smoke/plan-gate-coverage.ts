/**
 * FIX #3.A — Audit script: detecta rutas /api que no usan withPlanGate.
 *
 * Recorre `src/app/api/**\/route.ts` y reporta:
 *   - Rutas sin plan gate (server-side bypass posible).
 *   - Rutas que parecen requerir plan paid pero usan solo withAuth.
 *
 * Las rutas excluidas legítimamente son:
 *   - /api/cron/*: usan CRON_SECRET (no plan gate aplica).
 *   - /api/webauthn/*: auth ya impone via withWorkerAuth.
 *   - /api/payments/webhook: público con HMAC.
 *   - /api/complaints (POST público): canal de denuncias.
 *
 * Output: tabla TSV con ruta + estado + sugerencia de feature.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const PROJECT_ROOT = join(__dirname, '..', '..')

/**
 * Walk recursivo zero-deps que reemplaza `glob('**\/route.ts')`.
 * (Antes usábamos `glob` package pero rompía el build de Vercel
 *  porque no estaba en dependencies.)
 */
function findRouteFiles(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    let stat
    try {
      stat = statSync(full)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      findRouteFiles(full, out)
    } else if (entry === 'route.ts' || entry === 'route.tsx') {
      out.push(full)
    }
  }
  return out
}

// Heurísticas de feature por path prefix
const PATH_FEATURE_HINTS: Array<{ pattern: RegExp; feature: string }> = [
  { pattern: /\/api\/sst\//, feature: 'sst_completo' },
  { pattern: /\/api\/payslips/, feature: 'boletas' },
  { pattern: /\/api\/contracts/, feature: 'contratos' },
  { pattern: /\/api\/diagnostics/, feature: 'diagnostico' },
  { pattern: /\/api\/reports\/pdf/, feature: 'reportes_avanzados' },
  { pattern: /\/api\/integrations/, feature: 'integraciones' },
  { pattern: /\/api\/ai-chat/, feature: 'asistente_ia' },
  { pattern: /\/api\/ai-review/, feature: 'review_ia' },
  { pattern: /\/api\/agents/, feature: 'asistente_ia' },
  { pattern: /\/api\/orgchart/, feature: 'organigrama' },
  { pattern: /\/api\/elearning/, feature: 'elearning' },
  { pattern: /\/api\/gamification/, feature: 'gamificacion' },
  { pattern: /\/api\/v1\//, feature: 'api_access' },
]

// Rutas legítimamente sin plan gate (justificadas)
const ALLOWLIST = [
  /\/api\/cron\//,
  /\/api\/webauthn\//,
  /\/api\/payments\/webhook/,
  /\/api\/payments\/cancel/, // ya tiene withRole('OWNER')
  /\/api\/payments\/checkout/, // ya valida plan internamente
  /\/api\/payments\/history/,
  /\/api\/notifications\/vapid-key/,
  /\/api\/auth\//,
  /\/api\/health/,
  /\/api\/metrics/,
  /\/api\/portal-empleado/,
  /\/api\/mi-portal\//, // workers — withWorkerAuth
  /\/api\/workers\b/, // base CRUD; el plan gate va por feature 'workers' implícito
  /\/api\/admin\//, // SUPER_ADMIN only
  /\/api\/founder\//, // SUPER_ADMIN
  /\/api\/onboarding\//,
  /\/api\/leads/,
  /\/api\/complaints/, // POST público + PUT con orgId
  /\/api\/denuncias/,
  /\/api\/dashboard\b/,
  /\/api\/uploads\b/,
  /\/api\/calculations/, // calculadoras open
  /\/api\/files\//,
  /\/api\/billing\/upgrade/,
  /\/api\/subscriptions\/start-trial/,
  /\/api\/email\//,
  /\/api\/whatsapp\//,
  /\/api\/sms\//,
  /\/api\/verify\//,
  /\/api\/audit\b/,
  /\/api\/feedback\b/,
  /\/api\/nps\b/,
]

interface RouteAudit {
  path: string
  hasPlanGate: boolean
  hasAuth: boolean
  isPublic: boolean
  isAllowed: boolean
  suggestedFeature: string | null
  exports: string[]
}

async function main() {
  const routeFiles = findRouteFiles(join(PROJECT_ROOT, 'src/app/api'))

  const audits: RouteAudit[] = []

  for (const file of routeFiles) {
    const content = readFileSync(file, 'utf-8')
    const rel = relative(PROJECT_ROOT, file).replace(/\\/g, '/')
    const apiPath = '/' + rel.replace('src/app/', '').replace('/route.ts', '')

    const hasPlanGate = /withPlanGate\s*\(/.test(content)
    const hasAuth = /withAuth\b|withRole\b|withWorkerAuth\b|withSuperAdmin\b|getAuthContext\b/.test(content)
    const isPublic = !hasAuth && !hasPlanGate
    const isAllowed = ALLOWLIST.some((re) => re.test(apiPath))

    const exportsMatch = content.match(/export\s+(?:const|async\s+function)\s+(GET|POST|PUT|PATCH|DELETE)\b/g) ?? []
    const exports = exportsMatch.map((s) => s.replace(/export\s+(?:const|async\s+function)\s+/, ''))

    let suggested: string | null = null
    for (const { pattern, feature } of PATH_FEATURE_HINTS) {
      if (pattern.test(apiPath)) {
        suggested = feature
        break
      }
    }

    audits.push({
      path: apiPath,
      hasPlanGate,
      hasAuth,
      isPublic,
      isAllowed,
      suggestedFeature: suggested,
      exports,
    })
  }

  // Agrupar resultados
  const total = audits.length
  const gated = audits.filter((a) => a.hasPlanGate)
  const allowedNoGate = audits.filter((a) => !a.hasPlanGate && a.isAllowed)
  const missingGate = audits.filter((a) => !a.hasPlanGate && !a.isAllowed)
  const publicRoutes = audits.filter((a) => a.isPublic && !a.isAllowed)

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  PLAN GATE COVERAGE — FIX #3.A')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`  Total rutas /api/*/route.ts:  ${total}`)
  console.log(`  Con withPlanGate:             ${gated.length}  ✅`)
  console.log(`  Allowlisted (legítimas):      ${allowedNoGate.length}  ⚪`)
  console.log(`  Faltan plan gate (sospechosas): ${missingGate.length}  ⚠️`)
  console.log(`  Públicas (sin auth):          ${publicRoutes.length}`)
  console.log('═══════════════════════════════════════════════════════════════')

  if (missingGate.length > 0) {
    console.log('\n⚠️  RUTAS SIN PLAN GATE (revisar):\n')
    console.log('PATH\tEXPORTS\tFEATURE_SUGERIDA')
    for (const a of missingGate.sort((a, b) => a.path.localeCompare(b.path))) {
      console.log(
        `${a.path}\t${a.exports.join(',')}\t${a.suggestedFeature ?? '(sin sugerencia)'}`
      )
    }
  }

  if (publicRoutes.length > 0) {
    console.log('\n🚨 RUTAS PÚBLICAS SIN AUTH (revisar):\n')
    for (const a of publicRoutes) {
      console.log(`  ${a.path} (exports: ${a.exports.join(', ')})`)
    }
  }

  // Exit code: 0 si todo OK, 1 si hay rutas sin gate
  process.exit(missingGate.length > 0 || publicRoutes.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
