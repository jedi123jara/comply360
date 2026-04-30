/**
 * Eval harness — runner de regresión de IA.
 *
 * Ejecuta golden datasets contra el provider configurado y compara con la
 * respuesta esperada. Emite reporte JSON + HTML con score por caso.
 *
 * Uso:
 *   npm run eval:ai -- --feature=chat
 *   npm run eval:ai -- --feature=contract-review --provider=deepseek
 *   npm run eval:ai -- --all --baseline   (corre y graba como baseline)
 *
 * Categorías de eval:
 *   - chat:            queries reales del copilot, espera contiene-X o regex
 *   - contract-review: PDF redactado con score esperado, riesgos esperados
 *   - agents:          input estructurado por agente, output JSON con asserts
 *   - triage:          denuncias clasificadas con tipo y prioridad esperados
 *
 * Cada golden file es JSON con shape:
 *   {
 *     id: string
 *     description: string
 *     input: { messages: AIMessage[], options?: AICallOptions }
 *     expected: {
 *       containsAll?: string[]        // sub-strings que DEBEN estar
 *       containsAny?: string[]        // al menos uno
 *       notContains?: string[]        // sub-strings que NO deben estar
 *       jsonShape?: Record<string, JsonAssert>  // asserts sobre claves del JSON
 *       regex?: string                // expresión regular completa
 *       semanticReference?: string    // texto canónico para similitud cosine
 *     }
 *     tags?: string[]
 *   }
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { callAIWithUsage, type AIMessage, type AICallOptions } from '../provider'
import { extractJson } from '../provider'

export interface JsonAssert {
  exists?: boolean
  equals?: unknown
  oneOf?: unknown[]
  min?: number
  max?: number
  /** Para strings: substring esperado (case-insensitive). */
  contains?: string
}

export interface GoldenCase {
  id: string
  description: string
  input: {
    messages: AIMessage[]
    options?: AICallOptions
  }
  expected: {
    containsAll?: string[]
    containsAny?: string[]
    notContains?: string[]
    jsonShape?: Record<string, JsonAssert>
    regex?: string
    semanticReference?: string
  }
  tags?: string[]
}

export interface CaseResult {
  id: string
  passed: boolean
  score: number // 0-1
  failedAssertions: string[]
  latencyMs: number
  costUsd: number
  promptTokens: number
  completionTokens: number
  cachedTokens: number
  output: string
}

export interface EvalReport {
  feature: string
  provider: string
  model: string
  totalCases: number
  passed: number
  failed: number
  passRate: number
  avgScore: number
  totalCostUsd: number
  p50LatencyMs: number
  p95LatencyMs: number
  results: CaseResult[]
  startedAt: string
  finishedAt: string
}

const GOLDENS_ROOT = path.join(process.cwd(), 'src', 'lib', 'ai', '__evals__', 'goldens')

export async function loadGoldens(feature: string): Promise<GoldenCase[]> {
  const dir = path.join(GOLDENS_ROOT, feature)
  let entries: string[] = []
  try {
    entries = await fs.readdir(dir)
  } catch {
    return []
  }
  const cases: GoldenCase[] = []
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue
    const raw = await fs.readFile(path.join(dir, entry), 'utf-8')
    try {
      const parsed = JSON.parse(raw) as GoldenCase
      cases.push(parsed)
    } catch (e) {
      console.warn(`[eval] could not parse ${entry}:`, e)
    }
  }
  return cases
}

function assertJsonShape(
  obj: unknown,
  shape: Record<string, JsonAssert>,
): string[] {
  const failures: string[] = []
  if (typeof obj !== 'object' || obj === null) {
    return ['response is not a JSON object']
  }
  const o = obj as Record<string, unknown>
  for (const [path, assertion] of Object.entries(shape)) {
    const parts = path.split('.')
    let cursor: unknown = o
    for (const p of parts) {
      if (cursor && typeof cursor === 'object') {
        cursor = (cursor as Record<string, unknown>)[p]
      } else {
        cursor = undefined
        break
      }
    }
    if (assertion.exists === true && cursor === undefined) {
      failures.push(`missing key: ${path}`)
      continue
    }
    if (assertion.exists === false && cursor !== undefined) {
      failures.push(`unexpected key: ${path}`)
      continue
    }
    if (assertion.equals !== undefined && cursor !== assertion.equals) {
      failures.push(`${path}: expected ${JSON.stringify(assertion.equals)}, got ${JSON.stringify(cursor)}`)
    }
    if (assertion.oneOf && !assertion.oneOf.includes(cursor)) {
      failures.push(`${path}: expected one of ${JSON.stringify(assertion.oneOf)}, got ${JSON.stringify(cursor)}`)
    }
    if (assertion.min !== undefined && typeof cursor === 'number' && cursor < assertion.min) {
      failures.push(`${path}: expected >= ${assertion.min}, got ${cursor}`)
    }
    if (assertion.max !== undefined && typeof cursor === 'number' && cursor > assertion.max) {
      failures.push(`${path}: expected <= ${assertion.max}, got ${cursor}`)
    }
    if (assertion.contains && typeof cursor === 'string' && !cursor.toLowerCase().includes(assertion.contains.toLowerCase())) {
      failures.push(`${path}: expected to contain "${assertion.contains}"`)
    }
  }
  return failures
}

export async function runCase(c: GoldenCase): Promise<CaseResult> {
  const start = Date.now()
  let output = ''
  let promptTokens = 0
  let completionTokens = 0
  let cachedTokens = 0
  const failures: string[] = []
  let costUsd = 0
  try {
    const { content, usage } = await callAIWithUsage(c.input.messages, c.input.options ?? {})
    output = content
    promptTokens = usage.promptTokens
    completionTokens = usage.completionTokens
    cachedTokens = usage.cachedTokens
    // Importamos pricing dinámicamente para no acoplar runner a hot path
    const { estimateCostUsd } = await import('../pricing')
    costUsd = estimateCostUsd({
      provider: usage.provider,
      model: usage.model,
      promptTokens,
      completionTokens,
      cachedTokens,
    })
  } catch (e) {
    failures.push(`call failed: ${e instanceof Error ? e.message : 'desconocido'}`)
  }
  const latencyMs = Date.now() - start
  const exp = c.expected

  const lc = output.toLowerCase()
  if (exp.containsAll) {
    for (const term of exp.containsAll) {
      if (!lc.includes(term.toLowerCase())) failures.push(`missing required term: "${term}"`)
    }
  }
  if (exp.containsAny && exp.containsAny.length > 0) {
    if (!exp.containsAny.some((t) => lc.includes(t.toLowerCase()))) {
      failures.push(`none of expected terms found: ${exp.containsAny.join(', ')}`)
    }
  }
  if (exp.notContains) {
    for (const term of exp.notContains) {
      if (lc.includes(term.toLowerCase())) failures.push(`forbidden term present: "${term}"`)
    }
  }
  if (exp.regex) {
    const re = new RegExp(exp.regex, 'i')
    if (!re.test(output)) failures.push(`regex did not match: ${exp.regex}`)
  }
  if (exp.jsonShape) {
    try {
      const parsed = extractJson<unknown>(output)
      failures.push(...assertJsonShape(parsed, exp.jsonShape))
    } catch (e) {
      failures.push(`could not parse JSON: ${e instanceof Error ? e.message : 'desconocido'}`)
    }
  }

  // Score: 1 si no hay fallas, fracción si hay algunas pero output existe.
  const totalAssertions =
    (exp.containsAll?.length ?? 0) +
    (exp.containsAny ? 1 : 0) +
    (exp.notContains?.length ?? 0) +
    (exp.regex ? 1 : 0) +
    (exp.jsonShape ? Object.keys(exp.jsonShape).length : 0)
  const score = totalAssertions > 0 ? 1 - failures.length / totalAssertions : output ? 1 : 0

  return {
    id: c.id,
    passed: failures.length === 0,
    score: Math.max(0, Math.min(1, score)),
    failedAssertions: failures,
    latencyMs,
    costUsd,
    promptTokens,
    completionTokens,
    cachedTokens,
    output: output.slice(0, 500), // truncar para reporte
  }
}

export async function runFeature(feature: string): Promise<EvalReport> {
  const cases = await loadGoldens(feature)
  if (cases.length === 0) {
    throw new Error(`No goldens found for feature: ${feature}`)
  }
  const startedAt = new Date().toISOString()
  const results: CaseResult[] = []
  for (const c of cases) {
    process.stdout.write(`[eval] ${feature}/${c.id} ... `)
    const r = await runCase(c)
    results.push(r)
    process.stdout.write(`${r.passed ? '✓' : '✗'} (score=${r.score.toFixed(2)}, ${r.latencyMs}ms)\n`)
  }
  const finishedAt = new Date().toISOString()
  const passed = results.filter((r) => r.passed).length
  const sortedLat = [...results].map((r) => r.latencyMs).sort((a, b) => a - b)
  const p50 = sortedLat[Math.floor(sortedLat.length * 0.5)] ?? 0
  const p95 = sortedLat[Math.floor(sortedLat.length * 0.95)] ?? 0

  // Inferir provider/model dominantes desde el primer case
  const { detectProvider, getModelName } = await import('../provider')
  const firstOpts = cases[0].input.options ?? {}
  const provider = detectProvider(firstOpts)
  const model = getModelName(firstOpts)

  return {
    feature,
    provider,
    model,
    totalCases: cases.length,
    passed,
    failed: cases.length - passed,
    passRate: passed / cases.length,
    avgScore: results.reduce((a, r) => a + r.score, 0) / results.length,
    totalCostUsd: results.reduce((a, r) => a + r.costUsd, 0),
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    results,
    startedAt,
    finishedAt,
  }
}

export async function saveReport(report: EvalReport, outDir: string): Promise<string> {
  await fs.mkdir(outDir, { recursive: true })
  const stamp = report.startedAt.replace(/[:.]/g, '-')
  const file = path.join(outDir, `${report.feature}-${report.provider}-${stamp}.json`)
  await fs.writeFile(file, JSON.stringify(report, null, 2), 'utf-8')
  return file
}

// ─── CLI ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const featureArg = args.find((a) => a.startsWith('--feature='))?.split('=')[1]
  const all = args.includes('--all')
  const features = all
    ? ['chat', 'contract-review', 'agents', 'triage']
    : featureArg
    ? [featureArg]
    : ['chat']
  const outDir = path.join(process.cwd(), '.eval-reports')
  for (const f of features) {
    try {
      const report = await runFeature(f)
      const file = await saveReport(report, outDir)
      console.log(`\n[eval] ${f} → pass=${report.passed}/${report.totalCases} (${(report.passRate * 100).toFixed(1)}%) cost=$${report.totalCostUsd.toFixed(4)} p95=${report.p95LatencyMs}ms`)
      console.log(`[eval] report → ${file}`)
    } catch (e) {
      console.error(`[eval] ${f} failed:`, e instanceof Error ? e.message : e)
    }
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
