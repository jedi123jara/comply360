// =============================================
// CONTRACT VALIDATION ENGINE — SEED RUNNER
//
// Función reutilizable que inserta/actualiza el catálogo de reglas en BD.
// Idempotente: corre upsert por `code`. Llamada desde:
//   - prisma/seed.ts (seed inicial)
//   - scripts/seed-contract-validation-rules.ts (standalone, post-deploy)
// =============================================

import { Prisma, type PrismaClient } from '@/generated/prisma/client'
import { CONTRACT_VALIDATION_RULES } from './seed-rules'

export async function seedContractValidationRules(
  prisma: PrismaClient,
): Promise<{ created: number; updated: number; total: number }> {
  let created = 0
  let updated = 0

  for (const rule of CONTRACT_VALIDATION_RULES) {
    const existing = await prisma.contractValidationRule.findUnique({
      where: { code: rule.code },
      select: { id: true, version: true },
    })

    const appliesTo: Prisma.InputJsonValue | typeof Prisma.JsonNull = rule.appliesTo
      ? (rule.appliesTo as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull

    await prisma.contractValidationRule.upsert({
      where: { code: rule.code },
      create: {
        code: rule.code,
        category: rule.category,
        severity: rule.severity,
        title: rule.title,
        description: rule.description,
        legalBasis: rule.legalBasis,
        ruleSpec: rule.ruleSpec as unknown as Prisma.InputJsonValue,
        appliesTo,
        version: rule.version,
        active: true,
      },
      update: {
        category: rule.category,
        severity: rule.severity,
        title: rule.title,
        description: rule.description,
        legalBasis: rule.legalBasis,
        ruleSpec: rule.ruleSpec as unknown as Prisma.InputJsonValue,
        appliesTo,
        version: rule.version,
        active: true,
      },
    })

    if (existing) updated++
    else created++
  }

  return { created, updated, total: CONTRACT_VALIDATION_RULES.length }
}
