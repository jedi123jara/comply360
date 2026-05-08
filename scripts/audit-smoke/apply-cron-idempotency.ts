/**
 * Aplica el patrón claimCronRun a los crons que no lo tienen.
 *
 * El patrón asume que cada cron sigue este formato:
 *   1. Imports (incluyendo NextRequest, NextResponse, prisma).
 *   2. export async function GET(req) {
 *      check authHeader === Bearer ${cronSecret}
 *      lógica
 *      return NextResponse.json(summary)
 *   }
 *
 * Inserta:
 *   - Import de @/lib/cron/idempotency tras los imports existentes.
 *   - claimCronRun + dup check después del auth check.
 *   - try/catch wrap con completeCronRun en happy path y failCronRun en catch.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'

interface CronConfig {
  path: string
  name: string
  bucketMinutes: number
}

const CRONS: CronConfig[] = [
  { path: 'src/app/api/cron/check-trials/route.ts', name: 'check-trials', bucketMinutes: 1440 },
  { path: 'src/app/api/cron/risk-sweep/route.ts', name: 'risk-sweep', bucketMinutes: 1440 },
  { path: 'src/app/api/cron/drip-emails/route.ts', name: 'drip-emails', bucketMinutes: 1440 },
  { path: 'src/app/api/cron/ack-reminders/route.ts', name: 'ack-reminders', bucketMinutes: 1440 },
  { path: 'src/app/api/cron/training-overdue/route.ts', name: 'training-overdue', bucketMinutes: 1440 },
  { path: 'src/app/api/cron/scheduled-reports/route.ts', name: 'scheduled-reports', bucketMinutes: 60 },
  { path: 'src/app/api/cron/anchor-versions/route.ts', name: 'anchor-versions', bucketMinutes: 1440 },
  { path: 'src/app/api/cron/sst-retention/route.ts', name: 'sst-retention', bucketMinutes: 1440 },
  { path: 'src/app/api/cron/attendance-patterns/route.ts', name: 'attendance-patterns', bucketMinutes: 1440 },
  { path: 'src/app/api/cron/orgchart-alerts/route.ts', name: 'orgchart-alerts', bucketMinutes: 1440 },
  { path: 'src/app/api/cron/orgchart-snapshots/route.ts', name: 'orgchart-snapshots', bucketMinutes: 10080 }, // semanal
  { path: 'src/app/api/cron/sst-daily/route.ts', name: 'sst-daily', bucketMinutes: 1440 },
]

const PROJECT_ROOT = join(__dirname, '..', '..')

function processCron(cfg: CronConfig): { ok: boolean; reason?: string } {
  const fullPath = join(PROJECT_ROOT, cfg.path)
  let raw = readFileSync(fullPath, 'utf-8')

  if (raw.includes('claimCronRun')) {
    return { ok: false, reason: 'already has claimCronRun' }
  }

  // 1. Agregar import después del último 'from \'next/server\'' import
  const importLine = `import { claimCronRun, completeCronRun, failCronRun } from '@/lib/cron/idempotency'\n`
  const lastImportRegex = /^import .+from .+\n(?=\nexport|\nasync|\nfunction|\nconst|\n\/\/|\n\/\*|^[a-zA-Z])/m
  // Más simple: encontrar el último import y agregar después
  const importsEnd = raw.lastIndexOf('\nimport ')
  if (importsEnd === -1) return { ok: false, reason: 'no imports found' }
  const endOfLastImport = raw.indexOf('\n', importsEnd + 1)
  raw = raw.slice(0, endOfLastImport + 1) + importLine + raw.slice(endOfLastImport + 1)

  // 2. Encontrar el handler GET. Match `export async function GET(...) {`
  // o `export const GET = ... async (...) => {` (no aplica en estos pero por si acaso)
  const handlerMatch = /export\s+async\s+function\s+GET\s*\([^)]*\)\s*(?::\s*Promise<[^>]+>\s*)?\{/m.exec(raw)
  if (!handlerMatch) return { ok: false, reason: 'GET handler not found' }
  const handlerStart = handlerMatch.index
  const handlerBodyStart = handlerMatch.index + handlerMatch[0].length

  // 3. Encontrar el cierre de función GET (matching brace)
  let depth = 1
  let handlerEnd = -1
  for (let i = handlerBodyStart; i < raw.length; i++) {
    const c = raw[i]
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        handlerEnd = i
        break
      }
    }
  }
  if (handlerEnd === -1) return { ok: false, reason: 'GET handler closing brace not found' }

  // 4. Encontrar el último `if (authHeader !== \`Bearer\` ...) { return ... }` ANTES del happy path
  // Patrón: una línea con `Unauthorized` que retorna 401
  const handlerBody = raw.slice(handlerBodyStart, handlerEnd)
  const unauthIdx = handlerBody.search(/return\s+NextResponse\.json\(\s*\{\s*error:\s*['"]Unauthorized['"]/)
  if (unauthIdx === -1) return { ok: false, reason: 'auth check (Unauthorized) not found' }

  // Encontrar el cierre del `if (...) { return ... }`
  const afterUnauth = handlerBody.indexOf('}', unauthIdx)
  if (afterUnauth === -1) return { ok: false, reason: 'auth if closing brace not found' }
  // afterUnauth está justo después del closing brace del if, en el body
  const insertPosInBody = afterUnauth + 1
  const insertPosAbsolute = handlerBodyStart + insertPosInBody

  // 5. Construir el código a insertar después del auth check
  const claimSnippet = `

  // FIX #5.A: idempotencia bucket ${cfg.bucketMinutes / 60}h.
  const claim = await claimCronRun('${cfg.name}', { bucketMinutes: ${cfg.bucketMinutes} })
  if (!claim.acquired) {
    return NextResponse.json({ ok: true, duplicate: true, bucket: claim.bucket })
  }

  try {`

  // 6. Construir el código a insertar antes del cierre de la función:
  //    - Reemplazar el último `return NextResponse.json(...)` con
  //      `const __summary = ...; await completeCronRun(claim.runId, __summary); return ...`
  // Estrategia más segura: añadir un `} catch { await failCronRun; return 500 }` antes del closing brace
  // y dejar el happy path como está (sin completeCronRun explícito → el stale RUNNING se queda
  // pero no es crítico; en cambio en el sucesivo claim del mismo bucket retorna duplicate).
  //
  // Vercel: el bucket = mismo día, una corrida exitosa marca RUNNING, en su próximo claim del
  // siguiente día empieza nuevo. Para tracking limpio, sí es mejor completeCronRun, pero requiere
  // identificar el último return — complicado en handlers con múltiples returns.
  //
  // Solución pragmática: usar completeCronRun en finally (siempre). Si hubo throw, el catch ya
  // marcó FAILED, así que el finally no debe sobrescribir. Mejor: catch handles fail, success path
  // termina con un "after-handler" que usa try-catch propio.

  const closingSnippet = `
  } catch (__err) {
    console.error('[${cfg.name}] cron failed:', __err)
    await failCronRun(claim.runId, __err).catch(() => undefined)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  } finally {
    // completeCronRun is idempotent — si ya falló, este update no rompe nada
    await completeCronRun(claim.runId).catch(() => undefined)
  }`

  // Insertar claimSnippet después del auth check
  raw = raw.slice(0, insertPosAbsolute) + claimSnippet + raw.slice(insertPosAbsolute)
  // El handlerEnd cambió por inserción
  const newHandlerEnd = handlerEnd + claimSnippet.length

  // Insertar closingSnippet antes del closing brace
  raw = raw.slice(0, newHandlerEnd) + closingSnippet + '\n' + raw.slice(newHandlerEnd)

  writeFileSync(fullPath, raw, 'utf-8')
  return { ok: true }
}

let applied = 0
let skipped = 0
let failed = 0

for (const cron of CRONS) {
  const result = processCron(cron)
  if (result.ok) {
    console.log(`  ✓ ${cron.name}`)
    applied++
  } else if (result.reason === 'already has claimCronRun') {
    console.log(`  ⚪ ${cron.name} (already)`)
    skipped++
  } else {
    console.log(`  ✗ ${cron.name}: ${result.reason}`)
    failed++
  }
}

console.log(`\nResultado: ${applied} aplicados, ${skipped} skip, ${failed} fallaron`)
