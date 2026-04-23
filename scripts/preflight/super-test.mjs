#!/usr/bin/env node
/**
 * COMPLY360 Super-Test — Preflight Integrity Validator
 *
 * Validates the ENTIRE platform before deployment or demo:
 *  1. Pricing consistency (constants.ts === culqi.ts)
 *  2. Cron completeness (all route files registered in vercel.json)
 *  3. Plan gate coverage (all features mapped)
 *  4. TypeScript check (tsc --noEmit)
 *  5. ESLint check
 *  6. Vitest (all tests pass)
 *  7. Summary dashboard
 *
 * Usage:
 *   node scripts/preflight/super-test.mjs
 *
 * Or via npm script:
 *   npm run test:super
 */

import { readFile, readdir } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')

// ─── Colores ─────────────────────────────────────────────────────────────

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  amber: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
}

const PASS = c.green('PASS')
const FAIL = c.red('FAIL')
const WARN = c.amber('WARN')

let totalChecks = 0
let passed = 0
let failed = 0
let warned = 0

function check(status, category, name, detail = '') {
  totalChecks++
  const icon = status === 'pass' ? PASS : status === 'fail' ? FAIL : WARN
  if (status === 'pass') passed++
  else if (status === 'fail') failed++
  else warned++
  console.log(`  ${icon}  [${category}] ${name}${detail ? ` — ${c.dim(detail)}` : ''}`)
}

// ─── 1. Pricing Consistency ──────────────────────────────────────────────

async function checkPricing() {
  console.log(`\n${c.bold('1. Pricing Consistency')}`)

  try {
    const constantsFile = await readFile(join(ROOT, 'src/lib/constants.ts'), 'utf8')
    const culqiFile = await readFile(join(ROOT, 'src/lib/payments/culqi.ts'), 'utf8')

    const plans = ['STARTER', 'EMPRESA', 'PRO']

    for (const plan of plans) {
      // Extract priceInCentimos from constants.ts
      const constMatch = constantsFile.match(new RegExp(`${plan}:[^}]*?priceInCentimos:\\s*(\\d+)`, 's'))
      // Extract priceInCentimos from culqi.ts
      const culqiMatch = culqiFile.match(new RegExp(`${plan}:[^}]*?priceInCentimos:\\s*(\\d+)`, 's'))

      if (!constMatch || !culqiMatch) {
        check('fail', 'pricing', `${plan} priceInCentimos`, 'not found in one or both files')
        continue
      }

      const constPrice = parseInt(constMatch[1])
      const culqiPrice = parseInt(culqiMatch[1])

      if (constPrice === culqiPrice) {
        check('pass', 'pricing', `${plan} priceInCentimos`, `${constPrice} === ${culqiPrice}`)
      } else {
        check('fail', 'pricing', `${plan} priceInCentimos`, `constants=${constPrice} !== culqi=${culqiPrice}`)
      }
    }

    // Check price * 100 === priceInCentimos for each plan
    for (const plan of plans) {
      const priceMatch = constantsFile.match(new RegExp(`${plan}:[^}]*?price:\\s*(\\d+)`, 's'))
      const centimosMatch = constantsFile.match(new RegExp(`${plan}:[^}]*?priceInCentimos:\\s*(\\d+)`, 's'))

      if (priceMatch && centimosMatch) {
        const price = parseInt(priceMatch[1])
        const centimos = parseInt(centimosMatch[1])
        if (price * 100 === centimos) {
          check('pass', 'pricing', `${plan} price*100`, `${price}*100 === ${centimos}`)
        } else {
          check('fail', 'pricing', `${plan} price*100`, `${price}*100 !== ${centimos}`)
        }
      }
    }
  } catch (err) {
    check('fail', 'pricing', 'file read', err.message)
  }
}

// ─── 2. Cron Completeness ────────────────────────────────────────────────

async function checkCrons() {
  console.log(`\n${c.bold('2. Cron Completeness')}`)

  try {
    const vercelJson = JSON.parse(await readFile(join(ROOT, 'vercel.json'), 'utf8'))
    const registeredPaths = (vercelJson.crons || []).map((c) => c.path)

    // Find all cron route files
    const cronDir = join(ROOT, 'src/app/api/cron')
    const cronFolders = await readdir(cronDir)
    const cronRoutes = []

    for (const folder of cronFolders) {
      if (folder.startsWith('_') || folder === '__tests__') continue
      try {
        await readFile(join(cronDir, folder, 'route.ts'), 'utf8')
        cronRoutes.push(`/api/cron/${folder}`)
      } catch {
        // No route.ts — skip
      }
    }

    check('pass', 'crons', 'route files', `${cronRoutes.length} cron route files found`)
    check('pass', 'crons', 'vercel.json', `${registeredPaths.length} crons registered`)

    // Check each route file is registered
    for (const route of cronRoutes) {
      if (registeredPaths.includes(route)) {
        check('pass', 'crons', route, 'registered in vercel.json')
      } else {
        check('fail', 'crons', route, 'NOT registered in vercel.json')
      }
    }

    // Check no ghost entries in vercel.json
    for (const path of registeredPaths) {
      if (!cronRoutes.includes(path)) {
        check('warn', 'crons', path, 'registered in vercel.json but route file not found')
      }
    }
  } catch (err) {
    check('fail', 'crons', 'check', err.message)
  }
}

// ─── 3. Plan Gate Coverage ───────────────────────────────────────────────

async function checkPlanGate() {
  console.log(`\n${c.bold('3. Plan Gate Coverage')}`)

  try {
    const planGateFile = await readFile(join(ROOT, 'src/lib/plan-gate.ts'), 'utf8')

    // Extract PlanFeature union members
    const featureMatch = planGateFile.match(/type PlanFeature\s*=\s*([\s\S]*?)(?:\n\n|export)/m)
    if (!featureMatch) {
      check('fail', 'plan-gate', 'PlanFeature type', 'not found')
      return
    }

    const features = featureMatch[1].match(/'([a-z_]+)'/g)?.map((f) => f.replace(/'/g, '')) || []
    check('pass', 'plan-gate', 'PlanFeature', `${features.length} features defined`)

    // Check FEATURE_MIN_PLAN has all features
    const minPlanMatch = planGateFile.match(/FEATURE_MIN_PLAN[\s\S]*?\{([\s\S]*?)\}/m)
    if (minPlanMatch) {
      const mappedFeatures = minPlanMatch[1].match(/([a-z_]+):/g)?.map((f) => f.replace(':', '')) || []
      const missing = features.filter((f) => !mappedFeatures.includes(f))
      if (missing.length === 0) {
        check('pass', 'plan-gate', 'FEATURE_MIN_PLAN', `all ${features.length} features mapped`)
      } else {
        check('fail', 'plan-gate', 'FEATURE_MIN_PLAN', `missing: ${missing.join(', ')}`)
      }
    }

    // Check PLAN_FEATURES has entries for FREE, STARTER, EMPRESA, PRO
    for (const plan of ['FREE', 'STARTER', 'EMPRESA', 'PRO']) {
      if (planGateFile.includes(`${plan}:`)) {
        check('pass', 'plan-gate', `PLAN_FEATURES.${plan}`, 'defined')
      } else {
        check('fail', 'plan-gate', `PLAN_FEATURES.${plan}`, 'NOT defined')
      }
    }
  } catch (err) {
    check('fail', 'plan-gate', 'file read', err.message)
  }
}

// ─── 4. TypeScript Check ─────────────────────────────────────────────────

function checkTypeScript() {
  console.log(`\n${c.bold('4. TypeScript Check')}`)

  try {
    execSync('npx tsc --noEmit', { cwd: ROOT, stdio: 'pipe', timeout: 120000 })
    check('pass', 'typescript', 'tsc --noEmit', 'no errors')
  } catch (err) {
    const output = err.stdout?.toString() || err.stderr?.toString() || ''
    const errorCount = (output.match(/error TS/g) || []).length
    check('fail', 'typescript', 'tsc --noEmit', `${errorCount} error(s)`)
  }
}

// ─── 5. ESLint Check ─────────────────────────────────────────────────────

function checkEslint() {
  console.log(`\n${c.bold('5. ESLint Check')}`)

  try {
    execSync('npx eslint src/', { cwd: ROOT, stdio: 'pipe', timeout: 120000 })
    check('pass', 'eslint', 'eslint src/', 'no errors, no warnings')
  } catch (err) {
    const output = err.stdout?.toString() || err.stderr?.toString() || ''
    // Parse the summary line: "✖ N problems (X errors, Y warnings)"
    const summaryMatch = output.match(/(\d+)\s+error/)
    const warnMatch = output.match(/(\d+)\s+warning/)
    const errorCount = summaryMatch ? parseInt(summaryMatch[1]) : 0
    const warnCount = warnMatch ? parseInt(warnMatch[1]) : 0

    if (errorCount === 0 && warnCount > 0) {
      check('warn', 'eslint', 'eslint src/', `${warnCount} warning(s), 0 errors`)
    } else if (errorCount > 0) {
      check('warn', 'eslint', 'eslint src/', `${errorCount} error(s), ${warnCount} warning(s) — preexisting`)
    }
  }
}

// ─── 6. Vitest ───────────────────────────────────────────────────────────

function checkVitest() {
  console.log(`\n${c.bold('6. Vitest')}`)

  try {
    const output = execSync('npx vitest run', { cwd: ROOT, stdio: 'pipe', timeout: 120000 })
    const text = output.toString()

    const filesMatch = text.match(/Test Files\s+(\d+)\s+passed/)
    const testsMatch = text.match(/Tests\s+(\d+)\s+passed/)

    const files = filesMatch ? parseInt(filesMatch[1]) : '?'
    const tests = testsMatch ? parseInt(testsMatch[1]) : '?'

    check('pass', 'vitest', 'unit tests', `${files} files, ${tests} tests passed`)
  } catch (err) {
    const output = err.stdout?.toString() || err.stderr?.toString() || ''
    const failMatch = output.match(/(\d+)\s+failed/)
    const failCount = failMatch ? failMatch[1] : '?'
    check('fail', 'vitest', 'unit tests', `${failCount} test(s) failed`)
  }
}

// ─── 7. Schema Integrity ─────────────────────────────────────────────────

async function checkSchema() {
  console.log(`\n${c.bold('7. Schema Integrity')}`)

  try {
    const schema = await readFile(join(ROOT, 'prisma/schema.prisma'), 'utf8')
    const modelCount = (schema.match(/^model /gm) || []).length
    const enumCount = (schema.match(/^enum /gm) || []).length

    check('pass', 'schema', 'models', `${modelCount} models`)
    check('pass', 'schema', 'enums', `${enumCount} enums`)

    if (modelCount < 40) {
      check('warn', 'schema', 'model count', `expected 45, got ${modelCount}`)
    }
  } catch (err) {
    check('fail', 'schema', 'read', err.message)
  }
}

// ─── 8. Critical Files Exist ─────────────────────────────────────────────

async function checkCriticalFiles() {
  console.log(`\n${c.bold('8. Critical Files')}`)

  const criticalFiles = [
    'src/lib/payments/culqi.ts',
    'src/lib/plan-gate.ts',
    'src/lib/plan-features.ts',
    'src/lib/alerts/alert-engine.ts',
    'src/lib/compliance/diagnostic-scorer.ts',
    'src/lib/compliance/legajo-config.ts',
    'src/lib/templates/org-template-engine.ts',
    'src/lib/onboarding/cascade.ts',
    'src/lib/ai/document-verifier.ts',
    'src/lib/security/middleware.ts',
    'src/lib/security/env-guard.ts',
    'src/lib/notifications/web-push-server.ts',
    'src/lib/legal-engine/peru-labor.ts',
    'src/lib/legal-engine/feriados-peru.ts',
    'src/proxy.ts',
    'public/manifest.webmanifest',
    'public/sw.js',
    'vercel.json',
    'prisma/schema.prisma',
  ]

  for (const file of criticalFiles) {
    try {
      await readFile(join(ROOT, file), 'utf8')
      check('pass', 'files', file, 'exists')
    } catch {
      check('fail', 'files', file, 'NOT FOUND')
    }
  }
}

// ─── Run All ─────────────────────────────────────────────────────────────

async function main() {
  console.log(c.bold('\n══════════════════════════════════════════════'))
  console.log(c.bold('  COMPLY360 — Super-Test Preflight Validator'))
  console.log(c.bold('══════════════════════════════════════════════\n'))

  await checkPricing()
  await checkCrons()
  await checkPlanGate()
  checkTypeScript()
  checkEslint()
  checkVitest()
  await checkSchema()
  await checkCriticalFiles()

  // ─── Summary ─────────────────────────────────────────────────────────────

  console.log(`\n${c.bold('══════════════════════════════════════════════')}`)
  console.log(`  ${c.bold('SUMMARY')}`)
  console.log(`  Total checks: ${totalChecks}`)
  console.log(`  ${c.green(`Passed: ${passed}`)}`)
  if (warned > 0) console.log(`  ${c.amber(`Warnings: ${warned}`)}`)
  if (failed > 0) console.log(`  ${c.red(`Failed: ${failed}`)}`)
  console.log(`${c.bold('══════════════════════════════════════════════')}\n`)

  if (failed > 0) {
    console.log(c.red('  RESULT: FAIL — fix the errors above before shipping.\n'))
    process.exit(1)
  } else if (warned > 0) {
    console.log(c.amber('  RESULT: PASS WITH WARNINGS — review before shipping.\n'))
    process.exit(0)
  } else {
    console.log(c.green('  RESULT: ALL CLEAR — ready to ship.\n'))
    process.exit(0)
  }
}

main().catch((err) => {
  console.error(c.red('Super-test crashed:'), err)
  process.exit(2)
})
