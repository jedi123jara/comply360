#!/usr/bin/env tsx
/**
 * Health-check del módulo Organigrama v2.
 *
 * Corre como pre-deploy o como smoke test post-deploy. Verifica:
 *
 *   1. Dependencias instaladas en package.json
 *   2. Variables de entorno críticas configuradas
 *   3. Migraciones Prisma al día (modelos OrgUnit, OrgPosition, etc.)
 *   4. Tests vitest del módulo en verde
 *   5. TypeScript del módulo sin errores
 *   6. Endpoints v2 protegidos (devuelven 401 sin auth)
 *
 * Uso:
 *   npx tsx scripts/verify-orgchart-v2.ts
 *   npx tsx scripts/verify-orgchart-v2.ts --skip-tests   # rápido
 *   npx tsx scripts/verify-orgchart-v2.ts --remote https://app.comply360.pe
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface CheckResult {
  name: string
  ok: boolean
  message: string
  detail?: string
}

const args = new Set(process.argv.slice(2))
const skipTests = args.has('--skip-tests')
const remoteIdx = process.argv.indexOf('--remote')
const remoteUrl =
  remoteIdx >= 0 ? process.argv[remoteIdx + 1] : null

const root = resolve(__dirname, '..')

const REQUIRED_DEPS = [
  '@xyflow/react',
  '@dagrejs/dagre',
  'd3-hierarchy',
  'zustand',
  'react-window',
] as const

const CRITICAL_ENV_VARS = [
  'OPENAI_API_KEY', // o DEEPSEEK_API_KEY como alternativa
  'JWT_SECRET',     // o NEXTAUTH_SECRET o CLERK_SECRET_KEY
  'DATABASE_URL',
] as const

const RECOMMENDED_ENV_VARS = ['NEXT_PUBLIC_SENTRY_DSN'] as const

const ROLLOUT_ENV_VARS = [
  'NEXT_PUBLIC_ORGCHART_V2',
  'ORGCHART_V2_ORGS',
] as const

const V2_ENDPOINTS_TO_PROBE = [
  '/api/orgchart/people',
  '/api/orgchart/memoria-anual?year=2026',
  '/api/orgchart/onboarding-ai',
  '/api/orgchart/copilot',
] as const

const REQUIRED_PRISMA_MODELS = [
  'OrgUnit',
  'OrgPosition',
  'OrgAssignment',
  'OrgComplianceRole',
  'OrgChartSnapshot',
] as const

// ─────────────────────────────────────────────────────────────────────────────

const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
}

function header(title: string) {
  console.log()
  console.log(c.bold(c.blue(`━━━ ${title} ━━━`)))
}

function row(r: CheckResult) {
  const icon = r.ok ? c.green('✓') : c.red('✗')
  const msg = r.ok ? c.dim(r.message) : c.yellow(r.message)
  console.log(`  ${icon} ${r.name.padEnd(40)} ${msg}`)
  if (r.detail) {
    for (const line of r.detail.split('\n').slice(0, 4)) {
      console.log(c.dim(`      ${line}`))
    }
  }
}

// ─── 1. Dependencias ─────────────────────────────────────────────────────────

function checkDependencies(): CheckResult[] {
  const pkgPath = resolve(root, 'package.json')
  if (!existsSync(pkgPath)) {
    return [{ name: 'package.json', ok: false, message: 'no encontrado' }]
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  return REQUIRED_DEPS.map((d) => ({
    name: d,
    ok: Boolean(deps[d]),
    message: deps[d] ? deps[d] : 'NO INSTALADA',
  }))
}

// ─── 2. Variables de entorno ─────────────────────────────────────────────────

function loadEnv(): Set<string> {
  const present = new Set<string>()
  for (const f of ['.env', '.env.local', '.env.production.local']) {
    const p = resolve(root, f)
    if (!existsSync(p)) continue
    const content = readFileSync(p, 'utf-8')
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=/)
      if (m) present.add(m[1])
    }
  }
  // También consideramos process.env (CI/CD las pasa así)
  for (const k of Object.keys(process.env)) {
    if (process.env[k]) present.add(k)
  }
  return present
}

function checkEnvVars(): CheckResult[] {
  const present = loadEnv()
  const results: CheckResult[] = []

  for (const v of CRITICAL_ENV_VARS) {
    let ok = present.has(v)
    let msg = ok ? 'configurada' : 'FALTA — crítica'
    // Aceptar alternativas
    if (!ok && v === 'OPENAI_API_KEY') {
      if (present.has('DEEPSEEK_API_KEY') || present.has('GROQ_API_KEY')) {
        ok = true
        msg = `usando provider alternativo`
      }
    }
    if (!ok && v === 'JWT_SECRET') {
      if (present.has('NEXTAUTH_SECRET') || present.has('CLERK_SECRET_KEY')) {
        ok = true
        msg = `usando ${present.has('NEXTAUTH_SECRET') ? 'NEXTAUTH_SECRET' : 'CLERK_SECRET_KEY'}`
      }
    }
    results.push({ name: v, ok, message: msg })
  }

  for (const v of RECOMMENDED_ENV_VARS) {
    const ok = present.has(v)
    results.push({
      name: v,
      ok: true, // no es crítica, no fallar el script
      message: ok ? 'configurada' : 'no configurada (recomendada)',
    })
  }

  // Rollout flags — informativos, no fallan
  for (const v of ROLLOUT_ENV_VARS) {
    const ok = present.has(v)
    results.push({
      name: v,
      ok: true,
      message: ok ? 'definida' : 'no definida (v2 apagado por defecto)',
    })
  }

  return results
}

// ─── 3. Prisma models ────────────────────────────────────────────────────────

function checkPrismaModels(): CheckResult[] {
  const schemaPath = resolve(root, 'prisma/schema.prisma')
  if (!existsSync(schemaPath)) {
    return [{ name: 'prisma/schema.prisma', ok: false, message: 'no encontrado' }]
  }
  const schema = readFileSync(schemaPath, 'utf-8')
  return REQUIRED_PRISMA_MODELS.map((m) => {
    const found = new RegExp(`model\\s+${m}\\b`).test(schema)
    return {
      name: `model ${m}`,
      ok: found,
      message: found ? 'definido' : 'NO ENCONTRADO en schema.prisma',
    }
  })
}

// ─── 4. Tests vitest ─────────────────────────────────────────────────────────

function checkTests(): CheckResult[] {
  if (skipTests) {
    return [{ name: 'vitest run', ok: true, message: 'skipped (--skip-tests)' }]
  }
  try {
    const out = execSync(
      'npx vitest run src/lib/orgchart/__tests__/',
      { cwd: root, stdio: 'pipe', encoding: 'utf-8' },
    )
    const passMatch = out.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/)
    const passed = passMatch ? parseInt(passMatch[1], 10) : 0
    const total = passMatch ? parseInt(passMatch[2], 10) : 0
    return [
      {
        name: 'vitest run (orgchart)',
        ok: passed > 0 && passed === total,
        message: `${passed}/${total} tests verdes`,
      },
    ]
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return [
      {
        name: 'vitest run (orgchart)',
        ok: false,
        message: 'tests fallaron',
        detail: detail.slice(0, 600),
      },
    ]
  }
}

// ─── 5. TypeScript ───────────────────────────────────────────────────────────

function checkTypeScript(): CheckResult[] {
  try {
    const out = execSync('npx tsc --noEmit -p tsconfig.json', {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf-8',
    })
    void out
    return [{ name: 'tsc --noEmit', ok: true, message: 'sin errores' }]
  } catch (err) {
    const out = err instanceof Error && 'stdout' in err
      ? String((err as { stdout: Buffer }).stdout ?? '')
      : err instanceof Error ? err.message : String(err)
    // Filtramos errores conocidos pre-existentes que NO son del v2 del organigrama.
    // Sólo nos interesan errores en archivos del módulo organigrama / orgchart-v2.
    const lines = out
      .split('\n')
      .filter((l) => l.includes('error TS'))
      .filter((l) => {
        // Pre-existentes en otros módulos — no son responsabilidad del v2
        if (l.includes('validator.ts')) return false
        if (l.includes('scripts/')) return false
        if (l.includes('lib/workers/history')) return false
        if (l.includes('api/workers/[id]/dependents')) return false
        if (l.includes('api/sst/')) return false
        if (l.includes('lib/sst/')) return false
        // Solo cuenta como del v2 si toca archivos del organigrama
        const isOrgchart =
          l.includes('orgchart') ||
          l.includes('organigrama') ||
          l.includes('memoria-pdf') ||
          l.includes('onboarding-ai') ||
          l.includes('copilot') ||
          l.includes('public-link') ||
          l.includes('coverage-aggregator') ||
          l.includes('snapshot-thumbnail') ||
          l.includes('time-machine-narrative') ||
          l.includes('people-view') ||
          l.includes('people-score') ||
          l.includes('plan-features.ts')
        return isOrgchart
      })
    if (lines.length === 0) {
      return [
        {
          name: 'tsc --noEmit',
          ok: true,
          message: 'sin errores en código del v2',
        },
      ]
    }
    return [
      {
        name: 'tsc --noEmit',
        ok: false,
        message: `${lines.length} error(es) en código del v2`,
        detail: lines.slice(0, 5).join('\n'),
      },
    ]
  }
}

// ─── 6. Endpoints (probe remoto opcional) ────────────────────────────────────

async function probeEndpoints(): Promise<CheckResult[]> {
  if (!remoteUrl) {
    return [
      {
        name: 'endpoints v2 (probe)',
        ok: true,
        message: 'skipped (sin --remote)',
      },
    ]
  }
  const results: CheckResult[] = []
  for (const path of V2_ENDPOINTS_TO_PROBE) {
    const url = `${remoteUrl.replace(/\/$/, '')}${path}`
    try {
      const res = await fetch(url, { method: 'GET' })
      // Sin auth, esperamos 401, 403 o 307 (redirect a sign-in)
      const status = res.status
      const ok = [401, 403, 307, 308].includes(status)
      results.push({
        name: path,
        ok,
        message: `HTTP ${status}${ok ? ' (protegido)' : ' (¡expuesto!)'}`,
      })
    } catch (err) {
      results.push({
        name: path,
        ok: false,
        message: 'no responde',
        detail: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return results
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(c.bold('Verificación del módulo Organigrama v2'))
  console.log(c.dim(`Root: ${root}`))
  if (remoteUrl) console.log(c.dim(`Remote: ${remoteUrl}`))
  if (skipTests) console.log(c.dim(`Modo rápido: vitest skipped`))

  const sections: Array<{ title: string; results: CheckResult[] }> = []

  header('1. Dependencias')
  sections.push({ title: 'Dependencias', results: checkDependencies() })
  for (const r of sections[sections.length - 1].results) row(r)

  header('2. Variables de entorno')
  sections.push({ title: 'Env vars', results: checkEnvVars() })
  for (const r of sections[sections.length - 1].results) row(r)

  header('3. Prisma models')
  sections.push({ title: 'Prisma', results: checkPrismaModels() })
  for (const r of sections[sections.length - 1].results) row(r)

  header('4. Tests vitest del módulo')
  sections.push({ title: 'Tests', results: checkTests() })
  for (const r of sections[sections.length - 1].results) row(r)

  header('5. TypeScript')
  sections.push({ title: 'TypeScript', results: checkTypeScript() })
  for (const r of sections[sections.length - 1].results) row(r)

  header('6. Endpoints v2')
  sections.push({ title: 'Endpoints', results: await probeEndpoints() })
  for (const r of sections[sections.length - 1].results) row(r)

  console.log()
  const allResults = sections.flatMap((s) => s.results)
  const okCount = allResults.filter((r) => r.ok).length
  const total = allResults.length
  const failed = allResults.filter((r) => !r.ok)

  if (failed.length === 0) {
    console.log(c.bold(c.green(`✓ TODO OK — ${okCount}/${total} checks verdes`)))
    console.log(c.dim('Listo para deploy del v2.'))
    process.exit(0)
  } else {
    console.log(c.bold(c.red(`✗ FALLAS — ${failed.length}/${total} checks rojos`)))
    console.log()
    console.log(c.yellow('Items que requieren acción:'))
    for (const f of failed) {
      console.log(`  - ${c.bold(f.name)}: ${f.message}`)
    }
    console.log()
    console.log(c.dim('Revisa el runbook: docs/ORGCHART-V2.md sección 8 (Troubleshooting)'))
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(c.red('Error inesperado:'), err)
  process.exit(2)
})
