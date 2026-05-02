// =============================================
// CONTRACT CLAUSES — SEED RUNNER (idempotente)
// =============================================

import { Prisma, type PrismaClient } from '@/generated/prisma/client'
import { CONTRACT_CLAUSES } from './seed-clauses'

export async function seedContractClauses(
  prisma: PrismaClient,
): Promise<{ created: number; updated: number; total: number }> {
  let created = 0
  let updated = 0

  for (const c of CONTRACT_CLAUSES) {
    const existing = await prisma.contractClause.findUnique({
      where: { code: c.code },
      select: { id: true },
    })

    const applies: Prisma.InputJsonValue | typeof Prisma.JsonNull = c.applicableTo
      ? (c.applicableTo as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull

    await prisma.contractClause.upsert({
      where: { code: c.code },
      create: {
        code: c.code,
        category: c.category,
        type: c.type,
        title: c.title,
        bodyTemplate: c.bodyTemplate,
        legalBasis: c.legalBasis,
        variables: c.variables as unknown as Prisma.InputJsonValue,
        applicableTo: applies,
        version: c.version,
        active: true,
      },
      update: {
        category: c.category,
        type: c.type,
        title: c.title,
        bodyTemplate: c.bodyTemplate,
        legalBasis: c.legalBasis,
        variables: c.variables as unknown as Prisma.InputJsonValue,
        applicableTo: applies,
        version: c.version,
        active: true,
      },
    })

    if (existing) updated++
    else created++
  }

  return { created, updated, total: CONTRACT_CLAUSES.length }
}
