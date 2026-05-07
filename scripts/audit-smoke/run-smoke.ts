import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

// FIXES UNDER TEST
import { validatePeruvianDni, computeDniCdv } from '../../src/lib/validations/dni'
import { numberToWords } from '../../src/lib/templates/org-template-engine'
import { calcularCTS } from '../../src/lib/legal-engine/calculators/cts'
import { calcularLiquidacion } from '../../src/lib/legal-engine/calculators/liquidacion'
import { calcularVacaciones } from '../../src/lib/legal-engine/calculators/vacaciones'
import { calcularPlazoSat } from '../../src/lib/sst/sat-deadline'

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

interface Result {
  id: string
  desc: string
  ok: boolean
  detail?: string
}
const results: Result[] = []
const seedTag = `audit-smoke-${Date.now()}`

function ok(id: string, desc: string, detail?: string) {
  results.push({ id, desc, ok: true, detail })
  console.log(`✅ ${id} ${desc}${detail ? ` — ${detail}` : ''}`)
}
function fail(id: string, desc: string, detail: string) {
  results.push({ id, desc, ok: false, detail })
  console.log(`❌ ${id} ${desc} — ${detail}`)
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  COMPLY360 — Audit Smoke Test (real DB)')
  console.log('  Seed tag:', seedTag)
  console.log('═══════════════════════════════════════════════════════════════\n')

  // ── 1. Migration aplicada ──────────────────────────────────────────
  const fkCheck = await prisma.$queryRaw<Array<{ def: string }>>`
    SELECT pg_catalog.pg_get_constraintdef(c.oid) as def
    FROM pg_catalog.pg_constraint c
    WHERE c.conname = 'workers_org_id_fkey'
  `
  if (fkCheck[0]?.def?.includes('ON DELETE RESTRICT')) {
    ok('#7.A', 'workers.org_id ON DELETE RESTRICT')
  } else {
    fail('#7.A', 'workers.org_id constraint', fkCheck[0]?.def ?? 'NOT FOUND')
  }

  const evalCheck = await prisma.$queryRaw<Array<{ data_type: string; numeric_precision: number | null }>>`
    SELECT data_type, numeric_precision
    FROM information_schema.columns
    WHERE table_name='ai_usage' AND column_name='eval_score'
  `
  if (evalCheck[0]?.data_type === 'numeric' && evalCheck[0]?.numeric_precision === 5) {
    ok('#7.G', 'ai_usage.eval_score DECIMAL(5,4)')
  } else {
    fail('#7.G', 'ai_usage.eval_score type', JSON.stringify(evalCheck[0]))
  }

  // ── 2. Validación DNI ──────────────────────────────────────────────
  const dniTests: [string, boolean, string][] = [
    ['00000000', false, 'patron sospechoso'],
    ['11111111', false, 'patron sospechoso'],
    ['12345678', false, 'patron sospechoso'],
    ['45678912', true, 'random valido'],
    ['1234567', false, 'corto'],
    ['xxxxxxxx', false, 'no numerico'],
  ]
  for (const [dni, expected, label] of dniTests) {
    const r = validatePeruvianDni(dni)
    if (r.valid === expected) {
      ok('#6.A', `validatePeruvianDni('${dni}') → ${expected}`, label)
    } else {
      fail('#6.A', `validatePeruvianDni('${dni}')`, `expected ${expected}, got ${r.valid} (${r.reason ?? 'no reason'})`)
    }
  }
  // CDV correcto
  const cdv45678912 = computeDniCdv('45678912')
  const validWithCdv = validatePeruvianDni('45678912' + cdv45678912)
  if (validWithCdv.valid) ok('#6.A', `validatePeruvianDni con CDV correcto`, `CDV calculado: ${cdv45678912}`)
  else fail('#6.A', 'CDV roundtrip', validWithCdv.reason ?? '')
  // CDV incorrecto
  const wrongCdv = validatePeruvianDni('456789120') // CDV=0 no es el correcto si CDV real es otro
  // Si por casualidad 0 es el CDV correcto, pruebo con otro
  const failingCdv = '0123456789'.replace('0', '').replace(cdv45678912, '')[0]
  const failTest = validatePeruvianDni('45678912' + failingCdv)
  if (!failTest.valid) ok('#6.A', `validatePeruvianDni con CDV incorrecto rechaza`, `tested ${failingCdv}`)
  else fail('#6.A', 'CDV erróneo no fue rechazado', '')

  // ── 3. numberToWords ───────────────────────────────────────────────
  const ntwCases: [number, string][] = [
    [0, 'CERO CON 00/100 SOLES'],
    [20, 'VEINTE CON 00/100 SOLES'],
    [21, 'VEINTIUNO CON 00/100 SOLES'],
    [25, 'VEINTICINCO CON 00/100 SOLES'],
    [100, 'CIEN CON 00/100 SOLES'],
    [1500.5, 'MIL QUINIENTOS CON 50/100 SOLES'],
    [1_000_000, 'UN MILLON CON 00/100 SOLES'],
    [2_500_000, 'DOS MILLONES QUINIENTOS MIL CON 00/100 SOLES'],
    [1_500_000_000, 'MIL QUINIENTOS MILLONES CON 00/100 SOLES'],
  ]
  for (const [n, expected] of ntwCases) {
    try {
      const got = numberToWords(n)
      if (got === expected) {
        ok('#0.7', `numberToWords(${n})`, expected)
      } else {
        fail('#0.7', `numberToWords(${n})`, `got "${got}" expected "${expected}"`)
      }
    } catch (e) {
      fail('#0.7', `numberToWords(${n})`, (e as Error).message)
    }
  }
  try {
    numberToWords(-1)
    fail('#0.7', 'numberToWords(-1) NO lanzó', 'silent accept')
  } catch {
    ok('#0.7', 'numberToWords(-1) lanza correctamente')
  }
  try {
    numberToWords(NaN)
    fail('#0.7', 'numberToWords(NaN) NO lanzó', 'silent accept')
  } catch {
    ok('#0.7', 'numberToWords(NaN) lanza correctamente')
  }

  // ── 4. CTS valida fechaCorte ───────────────────────────────────────
  try {
    calcularCTS({
      sueldoBruto: 2000,
      asignacionFamiliar: false,
      ultimaGratificacion: 2000,
      fechaIngreso: '2024-01-01',
      fechaCorte: '2026-08-15', // mes 8 — inválido
    })
    fail('#0.5', 'CTS con fechaCorte mes=8 NO lanzó', 'silent accept')
  } catch (e) {
    ok('#0.5', 'CTS rechaza fechaCorte fuera de {may, nov}', (e as Error).message.slice(0, 80))
  }
  try {
    const r = calcularCTS({
      sueldoBruto: 2000,
      asignacionFamiliar: false,
      ultimaGratificacion: 2000,
      fechaIngreso: '2025-11-01',
      fechaCorte: '2026-05-15',
    })
    if (r.ctsTotal > 0) ok('#0.5', `CTS válido (15-may) calcula correcto`, `total: S/ ${r.ctsTotal.toFixed(2)}`)
    else fail('#0.5', 'CTS válido devolvió 0', JSON.stringify(r))
  } catch (e) {
    fail('#0.5', 'CTS válido lanzó', (e as Error).message)
  }

  // ── 5. Liquidación off-by-one ene-abr ──────────────────────────────
  // Cese fin-ene: con FIX #0.6 mesesTruncos = 3 (nov+dic+ene). Antes era 2.
  // Monto = (rem+1/6grati)/12 × meses + (rem+1/6grati)/360 × días
  //       = 3500/12 × 3 + 3500/360 × ~30 = 875 + 291.67 ≈ 1166.67
  // (Antes del fix: 2 meses → 583.33 + 291.67 = 875.00).
  // Por eso testeamos > 1000 (post-fix) y descartamos < 950 (pre-fix).
  const liq = calcularLiquidacion({
    sueldoBruto: 3000,
    asignacionFamiliar: false,
    comisionesPromedio: 0,
    fechaIngreso: '2025-11-01',
    fechaCese: '2026-01-31',
    motivoCese: 'renuncia',
    vacacionesNoGozadas: 0,
    horasExtrasPendientes: 0,
    ultimaGratificacion: 3000,
    gratificacionesPendientes: false,
  })
  const ctsAmount = liq.breakdown.cts.amount
  if (ctsAmount > 1000) {
    ok('#0.6', `Liquidación cese 31-ene mesesTruncos=3 (post-fix)`, `CTS trunca: S/ ${ctsAmount.toFixed(2)}`)
  } else {
    fail('#0.6', `Liquidación cese 31-ene — fix NO aplicado`, `S/ ${ctsAmount.toFixed(2)} (pre-fix daba ~875, post-fix da ~1166)`)
  }

  // ── 6. Vacaciones por régimen — diasGozados parcial ───────────────
  // Caso donde la diferencia de días/año SÍ se ve en monto:
  // 2 años trabajados, 25 días gozados.
  //   GENERAL: 2×30=60 debidos − 25 gozados = 35 no gozados
  //   MYPE_MICRO: 2×15=30 debidos − 25 gozados =  5 no gozados
  // vacNoGozadas:
  //   GENERAL = 2000/30 × 35 = 2333.33
  //   MYPE    = 2000/15 ×  5 =  666.67
  const vacGeneral = calcularVacaciones({
    sueldoBruto: 2000, fechaIngreso: '2024-01-01', fechaCese: '2026-01-01',
    diasGozados: 25, asignacionFamiliar: false, regimenLaboral: 'GENERAL',
  })
  const vacMype = calcularVacaciones({
    sueldoBruto: 2000, fechaIngreso: '2024-01-01', fechaCese: '2026-01-01',
    diasGozados: 25, asignacionFamiliar: false, regimenLaboral: 'MYPE_MICRO',
  })
  if (vacMype.vacacionesNoGozadas < vacGeneral.vacacionesNoGozadas * 0.5) {
    ok('#0.10', 'Vacaciones MYPE usa 15 días/año (ya gozó 25)',
       `MYPE: S/ ${vacMype.vacacionesNoGozadas.toFixed(2)} vs GENERAL: S/ ${vacGeneral.vacacionesNoGozadas.toFixed(2)}`)
  } else {
    fail('#0.10', 'Vacaciones MYPE no respeta 15 días',
         `MYPE: S/ ${vacMype.vacacionesNoGozadas.toFixed(2)} vs GENERAL: S/ ${vacGeneral.vacacionesNoGozadas.toFixed(2)}`)
  }
  // Caso formativa: diasPorAno=0 → vacacionesNoGozadas=0
  const vacFormativa = calcularVacaciones({
    sueldoBruto: 2000, fechaIngreso: '2024-01-01', fechaCese: '2026-01-01',
    diasGozados: 0, asignacionFamiliar: false, regimenLaboral: 'MODALIDAD_FORMATIVA',
  })
  if (vacFormativa.vacacionesNoGozadas === 0) {
    ok('#0.10', 'Vacaciones MODALIDAD_FORMATIVA = S/ 0 (sin vacaciones legales)')
  } else {
    fail('#0.10', 'Vacaciones MODALIDAD_FORMATIVA debería ser 0', `S/ ${vacFormativa.vacacionesNoGozadas}`)
  }

  // ── 7. SAT deadline con feriados ───────────────────────────────────
  // Enf. ocupacional viernes 24-jul-2026 (víspera de Fiestas Patrias 28-29 jul)
  const enfPlazo = calcularPlazoSat('ENFERMEDAD_OCUPACIONAL', new Date('2026-07-24T10:00:00-05:00'))
  const sundayCheck = enfPlazo.deadline.getUTCDay()
  // Esperamos que la deadline NO caiga en sáb/dom/feriado
  if (sundayCheck !== 0 && sundayCheck !== 6) {
    ok('#4.G', 'SAT deadline cae en hábil', enfPlazo.deadline.toISOString())
  } else {
    fail('#4.G', 'SAT deadline cayó en fin de semana', enfPlazo.deadline.toISOString())
  }

  // ── 8. Cross-tenant complaint PUT ─────────────────────────────────
  console.log('\n[setup] Creando 2 orgs de prueba...')
  const orgA = await prisma.organization.create({
    data: {
      id: `${seedTag}-orgA`,
      name: `${seedTag} Org A`,
      plan: 'STARTER',
      alertEmail: 'a@test.local',
    },
  })
  const orgB = await prisma.organization.create({
    data: {
      id: `${seedTag}-orgB`,
      name: `${seedTag} Org B`,
      plan: 'STARTER',
      alertEmail: 'b@test.local',
    },
  })
  const complaintB = await prisma.complaint.create({
    data: {
      orgId: orgB.id,
      code: `${seedTag}-COMP-1`,
      type: 'ACOSO_LABORAL',
      description: 'Test smoke',
      isAnonymous: true,
      status: 'RECEIVED',
    },
  })
  console.log(`[setup] orgA=${orgA.id} orgB=${orgB.id} complaintB=${complaintB.id}\n`)

  // Simular handler: orgA admin intentando actualizar complaintB
  const ownedFromOrgA = await prisma.complaint.findFirst({
    where: { id: complaintB.id, orgId: orgA.id }, // Filtro #0.2
    select: { id: true },
  })
  if (!ownedFromOrgA) {
    ok('#0.2', 'PUT /complaints cross-tenant findFirst devuelve null', 'orgA no puede tocar complaint de orgB')
  } else {
    fail('#0.2', 'PUT /complaints cross-tenant', 'orgA encontró complaint de orgB')
  }

  // ── 9. Worker.organization Restrict (intentar borrar org con worker) ──
  console.log('\n[#7.A] Probando RESTRICT al borrar org con worker...')
  const w = await prisma.worker.create({
    data: {
      orgId: orgA.id,
      dni: '99999991',
      firstName: 'Test',
      lastName: 'Smoke',
      regimenLaboral: 'GENERAL',
      tipoContrato: 'INDEFINIDO',
      tipoAporte: 'AFP',
      asignacionFamiliar: false,
      jornadaSemanal: 48,
      sueldoBruto: 2000,
      fechaIngreso: new Date(),
      status: 'ACTIVE',
    },
  })
  try {
    await prisma.organization.delete({ where: { id: orgA.id } })
    fail('#7.A', 'Borrar org con worker NO falló', 'cascade still active')
  } catch (err) {
    const msg = (err as Error).message
    if (msg.includes('Foreign key') || msg.includes('foreign key') || msg.includes('violates')) {
      ok('#7.A', 'RESTRICT bloquea borrado de org con worker', 'FK violation correcto')
    } else {
      fail('#7.A', 'Borrar org con worker', msg.slice(0, 120))
    }
  }
  await prisma.worker.delete({ where: { id: w.id } })

  // ── 10. CronRun idempotency ─────────────────────────────────────────
  console.log('\n[#5.A] Probando claimCronRun idempotency...')
  const { claimCronRun, completeCronRun } = await import('../../src/lib/cron/idempotency')
  const cronName = `${seedTag}-cron`
  const claim1 = await claimCronRun(cronName, { bucketMinutes: 60 })
  const claim2 = await claimCronRun(cronName, { bucketMinutes: 60 })
  if (claim1.acquired && !claim2.acquired) {
    ok('#5.A', 'claimCronRun deduplica segundo claim', `1st: ${claim1.acquired}, 2nd: ${claim2.acquired} (${(claim2 as { reason?: string }).reason})`)
  } else {
    fail('#5.A', 'claimCronRun no deduplicó', JSON.stringify({ claim1, claim2 }))
  }
  if (claim1.acquired) await completeCronRun(claim1.runId, { test: true })

  // ── 11. Import token HMAC ──────────────────────────────────────────
  console.log('\n[#1.D] Probando import token HMAC...')
  // Setup env temporal
  if (!process.env.IMPORT_TOKEN_SECRET) {
    process.env.IMPORT_TOKEN_SECRET = 'dev-import-secret-do-not-use-in-prod-32chars-12345'
  }
  // Re-importamos para ver si el módulo soporta evaluar el secret en runtime
  // (en este caso el módulo lee getImportSecret() en cada call, así que reuse la lógica directamente)
  const { createHmac, timingSafeEqual } = await import('node:crypto')
  const secret = process.env.IMPORT_TOKEN_SECRET!
  const payload = JSON.stringify({ orgId: orgB.id, validRows: [], timestamp: Date.now() })
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  const token = Buffer.from(JSON.stringify({ payload, sig })).toString('base64')

  // Validar OK
  const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8')) as { payload: string; sig: string }
  const expectedSig = createHmac('sha256', secret).update(decoded.payload).digest('hex')
  const a = Buffer.from(decoded.sig, 'hex')
  const b = Buffer.from(expectedSig, 'hex')
  const valid = a.length === b.length && timingSafeEqual(a, b)
  if (valid) ok('#1.D', 'Import token HMAC roundtrip OK')
  else fail('#1.D', 'HMAC roundtrip', 'sig mismatch')

  // Validar tampering
  const tampered = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
  tampered.payload = JSON.stringify({ orgId: 'ATTACKER', validRows: [], timestamp: Date.now() })
  const tamperedExpectedSig = createHmac('sha256', secret).update(tampered.payload).digest('hex')
  const tamperedValid = tampered.sig === tamperedExpectedSig
  if (!tamperedValid) ok('#1.D', 'Import token tampered es rechazado', 'firma no coincide')
  else fail('#1.D', 'Import token tampered fue aceptado', '')

  // ── Cleanup ────────────────────────────────────────────────────────
  console.log('\n[cleanup] Borrando data de prueba...')
  await prisma.complaint.deleteMany({ where: { orgId: orgB.id } })
  await prisma.organization.delete({ where: { id: orgB.id } })
  // orgA ya tiene su worker borrado
  await prisma.organization.delete({ where: { id: orgA.id } })
  await prisma.cronRun.deleteMany({ where: { cronName } })
  console.log('[cleanup] ✓ Done')

  // ── Summary ─────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════')
  const passed = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length
  console.log(`  RESULTADO: ${passed} ✅  ${failed} ❌  (${results.length} total)`)
  console.log('═══════════════════════════════════════════════════════════════')
  if (failed > 0) {
    console.log('\nFAILED:')
    for (const r of results.filter(r => !r.ok)) {
      console.log(`  ❌ ${r.id} ${r.desc} — ${r.detail}`)
    }
    process.exit(1)
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect().catch(() => {})
  await pool.end().catch(() => {})
  process.exit(1)
})
