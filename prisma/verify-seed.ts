import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEMO = ['demo_org_01','demo_org_02','demo_org_03','demo_org_04','demo_org_05',
              'demo_org_06','demo_org_07','demo_org_08','demo_org_09','demo_org_10']

async function main() {
  const [orgs, workers, contracts, diagnostics, calcs, sst, complaints, alerts, attendance, vacations] = await Promise.all([
    prisma.organization.count({ where: { id: { in: DEMO } } }),
    prisma.worker.count({ where: { orgId: { in: DEMO } } }),
    prisma.contract.count({ where: { orgId: { in: DEMO } } }),
    prisma.complianceDiagnostic.count({ where: { orgId: { in: DEMO } } }),
    prisma.calculation.count({ where: { orgId: { in: DEMO } } }),
    prisma.sstRecord.count({ where: { orgId: { in: DEMO } } }),
    prisma.complaint.count({ where: { orgId: { in: DEMO } } }),
    prisma.workerAlert.count({ where: { orgId: { in: DEMO } } }),
    prisma.attendance.count(),
    prisma.vacationRecord.count(),
  ])

  const byRegime = await prisma.worker.groupBy({
    by: ['regimenLaboral'],
    where: { orgId: { in: DEMO } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  })

  const byPlan = await prisma.organization.groupBy({
    by: ['plan'],
    where: { id: { in: DEMO } },
    _count: { id: true },
  })

  const scores = await prisma.complianceDiagnostic.findMany({
    where: { orgId: { in: DEMO } },
    select: { orgId: true, scoreGlobal: true, organization: { select: { name: true } } },
    orderBy: { scoreGlobal: 'asc' },
  })

  console.log('\n' + '═'.repeat(55))
  console.log('  COMPLY360 — VERIFICACIÓN DE DATOS DEMO')
  console.log('═'.repeat(55))
  console.log(`  Organizaciones:    ${orgs}`)
  console.log(`  Trabajadores:      ${workers}`)
  console.log(`  Contratos:         ${contracts}`)
  console.log(`  Diagnósticos:      ${diagnostics}`)
  console.log(`  Cálculos:          ${calcs}`)
  console.log(`  Registros SST:     ${sst}`)
  console.log(`  Denuncias:         ${complaints}`)
  console.log(`  Alertas:           ${alerts}`)
  console.log(`  Asistencias:       ${attendance}`)
  console.log(`  Vacaciones:        ${vacations}`)
  console.log('\n  TRABAJADORES POR RÉGIMEN:')
  byRegime.forEach(r => console.log(`    ${r.regimenLaboral.padEnd(24)} ${r._count.id} trabajadores`))
  console.log('\n  ORGANIZACIONES POR PLAN:')
  byPlan.forEach(p => console.log(`    ${p.plan.padEnd(12)} ${p._count.id} empresa(s)`))
  console.log('\n  SCORES DE COMPLIANCE (de menor a mayor):')
  scores.forEach(s => console.log(`    ${String(s.scoreGlobal).padStart(3)}/100  ${s.organization?.name ?? s.orgId}`))
  console.log('═'.repeat(55) + '\n')
}

main()
  .catch(e => { console.error('Error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
