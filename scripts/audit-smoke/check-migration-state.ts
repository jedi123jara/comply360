import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  const result = await prisma.$queryRaw<Array<{
    qr_sessions: boolean
    justifications: boolean
    approvals: boolean
    evidence: boolean
    work_date_col: boolean
  }>>`
    SELECT
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='attendance_qr_sessions') as qr_sessions,
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='attendance_justifications') as justifications,
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='attendance_approvals') as approvals,
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='attendance_evidence') as evidence,
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='work_date') as work_date_col
  `
  console.log(JSON.stringify(result[0], null, 2))

  // También: prueba el cast eval_score actual
  const aiUsage = await prisma.$queryRaw<Array<{ data_type: string; numeric_precision: number | null }>>`
    SELECT data_type, numeric_precision
    FROM information_schema.columns
    WHERE table_name='ai_usage' AND column_name='eval_score'
  `
  console.log('eval_score column:', JSON.stringify(aiUsage[0]))

  // Cuenta cuántas filas tiene ai_usage con eval_score no nulo (para saber si el cast preserva data)
  const evalCount = await prisma.$queryRaw<Array<{ total: bigint; non_null: bigint }>>`
    SELECT COUNT(*) AS total, COUNT(eval_score) AS non_null FROM ai_usage
  `
  console.log('ai_usage rows:', { total: Number(evalCount[0].total), with_eval_score: Number(evalCount[0].non_null) })

  // Worker.org_id constraint actual
  const fk = await prisma.$queryRaw<Array<{ confdeltype: string }>>`
    SELECT pg_catalog.pg_get_constraintdef(c.oid) as confdeltype
    FROM pg_catalog.pg_constraint c
    WHERE c.conname = 'workers_org_id_fkey'
  `
  console.log('workers_org_id_fkey:', fk[0]?.confdeltype ?? 'NOT FOUND')

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
