// =============================================
// SEED — CONTRACT VALIDATION RULES (standalone)
// Uso: npx tsx scripts/seed-contract-validation-rules.ts
// Útil post-deploy o tras agregar reglas nuevas sin correr el seed completo.
// =============================================

import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { seedContractValidationRules } from '../src/lib/contracts/validation/seed-runner'

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  console.log('⚖️  Sembrando reglas de validación de contratos...')
  const result = await seedContractValidationRules(prisma)
  console.log(
    `   ✅ ${result.total} reglas (${result.created} nuevas, ${result.updated} actualizadas)`,
  )

  await prisma.$disconnect()
  await pool.end()
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
