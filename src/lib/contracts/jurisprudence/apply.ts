// =============================================
// JURISPRUDENCE UPDATE — APPLY ENGINE
// Generador de Contratos / Chunk 9
//
// Ejecuta las afectaciones de un `JurisprudenceUpdate` sobre el catálogo
// de reglas y cláusulas. Idempotente: ejecutar dos veces el mismo update
// produce el mismo estado final (no duplica).
// =============================================

import { Prisma, type PrismaClient } from '@/generated/prisma/client'
import type {
  ApplyResult,
  ClauseAction,
  ClauseAffectation,
  RuleAction,
  RuleAffectation,
} from './types'

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

interface ApplyInput {
  rules: RuleAffectation[]
  clauses: ClauseAffectation[]
}

/**
 * Aplica las afectaciones declaradas en un update. Toda la operación va en
 * una transacción para garantizar que un fallo parcial no deje el catálogo
 * en estado intermedio.
 */
export async function applyJurisprudenceAffectations(
  prisma: PrismaClient,
  input: ApplyInput,
): Promise<ApplyResult> {
  const startedAt = new Date().toISOString()
  const ruleResults: ApplyResult['rules'] = []
  const clauseResults: ApplyResult['clauses'] = []

  await prisma.$transaction(async (tx) => {
    for (const r of input.rules) {
      ruleResults.push(await applyRuleAffectation(tx as unknown as Tx, r))
    }
    for (const c of input.clauses) {
      clauseResults.push(await applyClauseAffectation(tx as unknown as Tx, c))
    }
  })

  const totalChanged =
    ruleResults.filter((r) => r.status === 'OK').length +
    clauseResults.filter((c) => c.status === 'OK').length
  const totalSkipped =
    ruleResults.filter((r) => r.status === 'ALREADY_EXISTS' || r.status === 'NOT_FOUND').length +
    clauseResults.filter((c) => c.status === 'ALREADY_EXISTS' || c.status === 'NOT_FOUND').length
  const totalErrors =
    ruleResults.filter((r) => r.status === 'ERROR').length +
    clauseResults.filter((c) => c.status === 'ERROR').length

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    rules: ruleResults,
    clauses: clauseResults,
    totalChanged,
    totalSkipped,
    totalErrors,
  }
}

async function applyRuleAffectation(
  tx: Tx,
  r: RuleAffectation,
): Promise<ApplyResult['rules'][number]> {
  try {
    const existing = await tx.contractValidationRule.findUnique({
      where: { code: r.ruleCode },
      select: { id: true, version: true, active: true, ruleSpec: true, severity: true },
    })

    if (r.action === 'ADD') {
      if (existing) {
        return { ruleCode: r.ruleCode, action: 'ADD', status: 'ALREADY_EXISTS', message: 'La regla ya existe — usa MODIFY.' }
      }
      if (!r.severity || !r.title || !r.description || !r.legalBasis || !r.ruleSpec) {
        return {
          ruleCode: r.ruleCode,
          action: 'ADD',
          status: 'ERROR',
          message: 'ADD requiere severity, title, description, legalBasis y ruleSpec.',
        }
      }
      await tx.contractValidationRule.create({
        data: {
          code: r.ruleCode,
          category: r.category ?? deriveCategory(r.ruleCode),
          severity: r.severity,
          title: r.title,
          description: r.description,
          legalBasis: r.legalBasis,
          ruleSpec: r.ruleSpec as unknown as Prisma.InputJsonValue,
          appliesTo: r.appliesTo
            ? (r.appliesTo as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          version: r.version ?? '1.0.0',
          active: true,
        },
      })
      return { ruleCode: r.ruleCode, action: 'ADD', status: 'OK' }
    }

    if (r.action === 'MODIFY') {
      if (!existing) {
        return { ruleCode: r.ruleCode, action: 'MODIFY', status: 'NOT_FOUND', message: 'No existe la regla a modificar.' }
      }
      // Idempotencia: si version y severity coinciden y no se piden cambios concretos,
      // damos "ALREADY_EXISTS" para evitar bumps inútiles.
      const sameVersion = r.version && r.version === existing.version
      const sameSeverity = r.severity && r.severity === existing.severity
      const noConcreteChange =
        !r.ruleSpec && !r.title && !r.description && !r.legalBasis && !r.appliesTo
      if (sameVersion && sameSeverity && noConcreteChange) {
        return { ruleCode: r.ruleCode, action: 'MODIFY', status: 'ALREADY_EXISTS', message: 'No hay cambios pendientes.' }
      }
      await tx.contractValidationRule.update({
        where: { code: r.ruleCode },
        data: {
          ...(r.severity ? { severity: r.severity } : {}),
          ...(r.title ? { title: r.title } : {}),
          ...(r.description ? { description: r.description } : {}),
          ...(r.legalBasis ? { legalBasis: r.legalBasis } : {}),
          ...(r.ruleSpec ? { ruleSpec: r.ruleSpec as unknown as Prisma.InputJsonValue } : {}),
          ...(r.appliesTo
            ? { appliesTo: r.appliesTo as unknown as Prisma.InputJsonValue }
            : {}),
          ...(r.version ? { version: r.version } : { version: bumpPatch(existing.version) }),
          active: true,
        },
      })
      return { ruleCode: r.ruleCode, action: 'MODIFY', status: 'OK' }
    }

    if (r.action === 'DEPRECATE') {
      if (!existing) {
        return { ruleCode: r.ruleCode, action: 'DEPRECATE', status: 'NOT_FOUND' }
      }
      if (!existing.active) {
        return { ruleCode: r.ruleCode, action: 'DEPRECATE', status: 'ALREADY_EXISTS', message: 'Ya estaba desactivada.' }
      }
      await tx.contractValidationRule.update({
        where: { code: r.ruleCode },
        data: { active: false },
      })
      return { ruleCode: r.ruleCode, action: 'DEPRECATE', status: 'OK' }
    }

    return assertUnreachable(r.action)
  } catch (err) {
    return {
      ruleCode: r.ruleCode,
      action: r.action,
      status: 'ERROR',
      message: err instanceof Error ? err.message : 'unknown',
    }
  }
}

async function applyClauseAffectation(
  tx: Tx,
  c: ClauseAffectation,
): Promise<ApplyResult['clauses'][number]> {
  try {
    const existing = await tx.contractClause.findUnique({
      where: { code: c.code },
      select: { id: true, version: true, active: true, bodyTemplate: true },
    })

    if (c.action === 'ADD') {
      if (existing) {
        return { code: c.code, action: 'ADD', status: 'ALREADY_EXISTS' }
      }
      if (!c.category || !c.type || !c.title || !c.bodyTemplate || !c.legalBasis || !c.variables) {
        return {
          code: c.code,
          action: 'ADD',
          status: 'ERROR',
          message: 'ADD requiere category, type, title, bodyTemplate, legalBasis y variables.',
        }
      }
      await tx.contractClause.create({
        data: {
          code: c.code,
          category: c.category,
          type: c.type,
          title: c.title,
          bodyTemplate: c.bodyTemplate,
          legalBasis: c.legalBasis,
          variables: c.variables as unknown as Prisma.InputJsonValue,
          applicableTo: c.applicableTo
            ? (c.applicableTo as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          version: c.version ?? '1.0.0',
          active: true,
        },
      })
      return { code: c.code, action: 'ADD', status: 'OK' }
    }

    if (c.action === 'MODIFY') {
      if (!existing) {
        return { code: c.code, action: 'MODIFY', status: 'NOT_FOUND' }
      }
      const sameBody = c.bodyTemplate && c.bodyTemplate === existing.bodyTemplate
      if (sameBody && !c.variables && !c.title && !c.legalBasis && !c.applicableTo) {
        return { code: c.code, action: 'MODIFY', status: 'ALREADY_EXISTS', message: 'Sin cambios materiales.' }
      }
      await tx.contractClause.update({
        where: { code: c.code },
        data: {
          ...(c.title ? { title: c.title } : {}),
          ...(c.bodyTemplate ? { bodyTemplate: c.bodyTemplate } : {}),
          ...(c.legalBasis ? { legalBasis: c.legalBasis } : {}),
          ...(c.variables ? { variables: c.variables as unknown as Prisma.InputJsonValue } : {}),
          ...(c.applicableTo
            ? { applicableTo: c.applicableTo as unknown as Prisma.InputJsonValue }
            : {}),
          // Bump de version automático: minor cuando cambia bodyTemplate, patch en otros casos
          version: c.version ?? (c.bodyTemplate ? bumpMinor(existing.version) : bumpPatch(existing.version)),
          active: true,
        },
      })
      return { code: c.code, action: 'MODIFY', status: 'OK' }
    }

    if (c.action === 'DEPRECATE') {
      if (!existing) {
        return { code: c.code, action: 'DEPRECATE', status: 'NOT_FOUND' }
      }
      if (!existing.active) {
        return { code: c.code, action: 'DEPRECATE', status: 'ALREADY_EXISTS' }
      }
      await tx.contractClause.update({
        where: { code: c.code },
        data: { active: false },
      })
      return { code: c.code, action: 'DEPRECATE', status: 'OK' }
    }

    return assertUnreachable(c.action)
  } catch (err) {
    return {
      code: c.code,
      action: c.action,
      status: 'ERROR',
      message: err instanceof Error ? err.message : 'unknown',
    }
  }
}

// Helpers exportados para test puro
export function deriveCategory(code: string): string {
  const prefix = code.split('-')[0]
  return prefix || 'OTRO'
}

export function bumpPatch(version: string): string {
  const parts = version.split('.').map((n) => parseInt(n, 10))
  if (parts.length !== 3 || parts.some(Number.isNaN)) return '1.0.1'
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`
}

export function bumpMinor(version: string): string {
  const parts = version.split('.').map((n) => parseInt(n, 10))
  if (parts.length !== 3 || parts.some(Number.isNaN)) return '1.1.0'
  return `${parts[0]}.${parts[1] + 1}.0`
}

function assertUnreachable(action: RuleAction | ClauseAction): never {
  throw new Error(`Acción no soportada: ${action}`)
}
