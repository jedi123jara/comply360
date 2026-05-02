// =============================================
// CONTRACT RISK SERVICE
// Generador de Contratos / Chunk 5
//
// Lee de los chunks 1, 3, 2 y produce el risk-profile completo.
// =============================================

import { prisma } from '@/lib/prisma'
import { computeRiskScore, validationsToRiskInput, type RiskScoreResult } from './score'
import { detectRegimeForOrg } from '@/lib/contracts/regime/service'
import { verifyContractChain } from '@/lib/contracts/versioning/service'

const UIT_2026 = 5500

export interface ContractRiskProfile extends RiskScoreResult {
  contractId: string
  contractTitle: string
  contractType: string
  contractStatus: string
  validations: {
    total: number
    passed: number
    failed: number
    blockers: number
    warnings: number
    infos: number
    blockerUnacked: number
    warningUnacked: number
    blockerCodes: string[]
    warningCodes: string[]
  }
  regime: {
    declared: string | null
    detected: string
    hasConflict: boolean
  }
  chain: {
    versions: number
    valid: boolean
    breakAt?: number
    reason?: string
  }
  computedAt: string
}

/**
 * Computa el risk-profile completo de un contrato.
 * Combina validation + regime detection + chain verification.
 */
export async function computeContractRiskProfile(
  contractId: string,
  orgId: string,
): Promise<ContractRiskProfile> {
  // Cargar contrato base
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, orgId },
    select: { id: true, title: true, type: true, status: true },
  })
  if (!contract) {
    throw new Error(`Contract ${contractId} no encontrado para org ${orgId}`)
  }

  // Disparar las 3 lecturas en paralelo
  const [validations, chainCheck, regimeResult] = await Promise.all([
    prisma.contractValidation.findMany({
      where: { contractId, orgId },
      select: { severity: true, passed: true, acknowledged: true, ruleCode: true },
    }),
    verifyContractChain(contractId, orgId).catch(() => ({
      versions: 0,
      result: { valid: true as const, checkedVersions: 0 },
    })),
    detectRegimeForOrg(orgId).catch(() => null),
  ])

  const validationInput = validationsToRiskInput(validations)
  const allValidations = await prisma.contractValidation.count({
    where: { contractId, orgId },
  })

  // Detectar conflict de régimen — comparamos con regimenPrincipal declarado.
  const declared = regimeResult?.org.declaredRegimen ?? null
  const detected = regimeResult?.primaryRegime ?? 'GENERAL'
  const hasRegimeConflict = !!declared && declared !== detected

  // Score
  const score = computeRiskScore({
    validations: validationInput,
    regime: { hasConflict: hasRegimeConflict },
    chain: { valid: chainCheck.result.valid },
    uitValue: UIT_2026,
  })

  return {
    ...score,
    contractId: contract.id,
    contractTitle: contract.title,
    contractType: contract.type,
    contractStatus: contract.status,
    validations: {
      total: allValidations,
      passed: validations.filter((v) => v.passed).length,
      failed: validations.filter((v) => !v.passed).length,
      ...validationInput,
    },
    regime: {
      declared,
      detected,
      hasConflict: hasRegimeConflict,
    },
    chain: {
      versions: chainCheck.versions,
      valid: chainCheck.result.valid,
      ...(chainCheck.result.valid
        ? {}
        : { breakAt: chainCheck.result.breakAt, reason: chainCheck.result.reason }),
    },
    computedAt: new Date().toISOString(),
  }
}

/**
 * Risk-profile agregado para todos los contratos del tenant. Útil para que
 * SUNAFIL Diagnostic muestre la lista priorizada por riesgo.
 *
 * Esta versión es liviana: NO recomputa la chain ni el régimen (que
 * son globales del tenant) salvo una vez al inicio. Solo agrega los
 * counts persistidos en `contract_validations`.
 */
export async function listContractsRiskSummary(orgId: string, options: {
  limit?: number
  status?: string
} = {}) {
  // Régimen + chain check global del tenant (1 sola vez)
  const regimeResult = await detectRegimeForOrg(orgId).catch(() => null)
  const declared = regimeResult?.org.declaredRegimen ?? null
  const detected = regimeResult?.primaryRegime ?? 'GENERAL'
  const hasRegimeConflict = !!declared && declared !== detected

  // Lista de contratos
  const contracts = await prisma.contract.findMany({
    where: {
      orgId,
      ...(options.status ? { status: options.status as 'DRAFT' } : {}),
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      validations: {
        select: { severity: true, passed: true, acknowledged: true, ruleCode: true },
      },
    },
    take: options.limit ?? 100,
    orderBy: { updatedAt: 'desc' },
  })

  return contracts.map((c) => {
    const v = validationsToRiskInput(c.validations)
    const score = computeRiskScore({
      validations: v,
      regime: { hasConflict: hasRegimeConflict },
      uitValue: UIT_2026,
    })
    return {
      contractId: c.id,
      title: c.title,
      type: c.type,
      status: c.status,
      score: score.score,
      level: score.level,
      hasBlockingIssues: score.hasBlockingIssues,
      estimatedFineUIT: score.estimatedFineUIT,
      estimatedFinePEN: score.estimatedFinePEN,
      blockers: v.blockers,
      warnings: v.warnings,
      infos: v.infos,
    }
  })
}
