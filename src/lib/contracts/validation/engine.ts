// =============================================
// CONTRACT VALIDATION ENGINE — ORCHESTRATOR
//
// Lee reglas activas (filtradas por appliesTo), evalúa cada una contra el
// contexto del contrato y persiste los resultados en ContractValidation.
//
// Estrategia de persistencia: borra resultados anteriores del contrato y
// escribe la corrida nueva. La auditoría completa vive en AuditLog
// (acción "contract.validated").
// =============================================

import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { Prisma } from '@/generated/prisma/client'
import { evaluateRule } from './rule-evaluator'
import { buildValidationContext, ContractNotFoundError } from './context-builder'
import type {
  RuleAppliesTo,
  RuleSpec,
  ValidationContext,
  ValidationRunResult,
} from './types'
import type { ContractType, RegimenLaboral } from '@/generated/prisma/client'

interface RunOptions {
  triggeredBy?: string // userId que disparó la validación (para audit)
  trigger?: 'manual' | 'create' | 'update' | 'sign'
}

/**
 * Decide si una regla aplica al contexto actual basándose en su `appliesTo`.
 * `null` o vacío = aplica siempre.
 */
function ruleApplies(
  appliesTo: RuleAppliesTo | null,
  ctx: ValidationContext,
): boolean {
  if (!appliesTo) return true
  if (appliesTo.contractTypes && appliesTo.contractTypes.length > 0) {
    if (!appliesTo.contractTypes.includes(ctx.contract.type)) return false
  }
  if (appliesTo.regimes && appliesTo.regimes.length > 0) {
    // Si NINGÚN worker vinculado pertenece a un régimen aplicable, la regla no corre.
    const workerRegimes = new Set(ctx.workers.map((w) => w.regimenLaboral))
    const overlap = appliesTo.regimes.some((r) => workerRegimes.has(r as RegimenLaboral))
    if (!overlap) return false
  }
  return true
}

/**
 * Corre el pipeline completo de validación para un contrato.
 * Persiste los resultados (reemplazando los anteriores) y retorna un resumen.
 */
export async function runValidationPipeline(
  contractId: string,
  orgId: string,
  options: RunOptions = {},
): Promise<ValidationRunResult> {
  const ctx = await buildValidationContext(contractId, orgId)

  const allRules = await prisma.contractValidationRule.findMany({
    where: { active: true },
  })

  type EvalRow = {
    ruleId: string
    ruleCode: string
    ruleVersion: string
    severity: ValidationRunResult['results'][number]['severity']
    passed: boolean
    message: string
    evidence?: Record<string, unknown>
  }

  const results: EvalRow[] = []
  for (const rule of allRules) {
    const appliesTo = rule.appliesTo as RuleAppliesTo | null
    if (!ruleApplies(appliesTo, ctx)) continue
    const spec = rule.ruleSpec as unknown as RuleSpec
    let evalResult
    try {
      evalResult = evaluateRule(spec, ctx)
    } catch (err) {
      // Falla del evaluador → trazamos como INFO no-bloqueante para no romper el flujo.
      console.error(`[validation] Rule ${rule.code} threw:`, err)
      evalResult = {
        passed: false,
        message: `Error interno evaluando regla: ${err instanceof Error ? err.message : 'unknown'}`,
        evidence: { error: true },
      }
    }
    results.push({
      ruleId: rule.id,
      ruleCode: rule.code,
      ruleVersion: rule.version,
      severity: rule.severity,
      passed: evalResult.passed,
      message: evalResult.message,
      evidence: evalResult.evidence,
    })
  }

  // Persistir: reemplazar corrida anterior con la nueva.
  await prisma.$transaction([
    prisma.contractValidation.deleteMany({ where: { contractId } }),
    prisma.contractValidation.createMany({
      data: results.map((r) => ({
        orgId,
        contractId,
        ruleId: r.ruleId,
        ruleCode: r.ruleCode,
        ruleVersion: r.ruleVersion,
        severity: r.severity,
        passed: r.passed,
        message: r.message,
        evidence: r.evidence
          ? (r.evidence as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      })),
    }),
  ])

  const failed = results.filter((r) => !r.passed)
  const blockers = failed.filter((r) => r.severity === 'BLOCKER').length
  const warnings = failed.filter((r) => r.severity === 'WARNING').length
  const infos = failed.filter((r) => r.severity === 'INFO').length

  // Audit
  await logAudit({
    orgId,
    userId: options.triggeredBy,
    action: 'contract.validated',
    entityType: 'Contract',
    entityId: contractId,
    metadata: {
      trigger: options.trigger ?? 'manual',
      totalRules: results.length,
      blockers,
      warnings,
      infos,
    },
  })

  return {
    contractId,
    totalRules: results.length,
    blockers,
    warnings,
    infos,
    passed: results.filter((r) => r.passed).length,
    failed: failed.length,
    results,
  }
}

/**
 * Wrapper "fire-and-forget" para invocar desde POST /api/contracts sin bloquear.
 * Loggea pero nunca rompe el flujo de creación.
 */
export function runValidationPipelineFireAndForget(
  contractId: string,
  orgId: string,
  options: RunOptions = {},
): void {
  runValidationPipeline(contractId, orgId, options).catch((err) => {
    if (err instanceof ContractNotFoundError) {
      console.warn(`[validation] contrato ${contractId} no encontrado al validar`)
      return
    }
    console.error(`[validation] pipeline failed for ${contractId}:`, err)
  })
}

/**
 * Carga las validaciones persistidas de un contrato, ordenadas por severidad
 * (BLOCKER > WARNING > INFO) y con datos de la regla.
 */
export async function getContractValidations(
  contractId: string,
  orgId: string,
) {
  return prisma.contractValidation.findMany({
    where: { contractId, orgId },
    include: {
      rule: {
        select: { code: true, title: true, legalBasis: true, category: true },
      },
    },
    orderBy: [
      { passed: 'asc' }, // failures first
      { severity: 'asc' }, // BLOCKER < WARNING < INFO en orden alfabético, pero…
      { createdAt: 'asc' },
    ],
  })
}

/**
 * Devuelve true si el contrato tiene al menos un BLOCKER no acknowledged.
 * Útil para gate de firma ("no se puede firmar con bloqueos").
 */
export async function hasBlockingValidations(
  contractId: string,
  orgId: string,
): Promise<boolean> {
  const count = await prisma.contractValidation.count({
    where: {
      contractId,
      orgId,
      severity: 'BLOCKER',
      passed: false,
      acknowledged: false,
    },
  })
  return count > 0
}

/**
 * Para uso en el módulo SUNAFIL Diagnostic — devuelve el risk-profile del
 * contrato (resumen agregado).
 */
export async function getContractRiskProfile(
  contractId: string,
  orgId: string,
): Promise<{
  contractId: string
  blockers: number
  warnings: number
  infos: number
  blockerCodes: string[]
  warningCodes: string[]
  hasUnacknowledgedBlockers: boolean
}> {
  const validations = await prisma.contractValidation.findMany({
    where: { contractId, orgId, passed: false },
    select: {
      severity: true,
      ruleCode: true,
      acknowledged: true,
    },
  })
  const blockers = validations.filter((v) => v.severity === 'BLOCKER')
  const warnings = validations.filter((v) => v.severity === 'WARNING')
  const infos = validations.filter((v) => v.severity === 'INFO')
  return {
    contractId,
    blockers: blockers.length,
    warnings: warnings.length,
    infos: infos.length,
    blockerCodes: blockers.map((b) => b.ruleCode),
    warningCodes: warnings.map((w) => w.ruleCode),
    hasUnacknowledgedBlockers: blockers.some((b) => !b.acknowledged),
  }
}

// Re-exports útiles
export { ContractNotFoundError } from './context-builder'
export type { ValidationRunResult } from './types'
export type ContractTypeAlias = ContractType
