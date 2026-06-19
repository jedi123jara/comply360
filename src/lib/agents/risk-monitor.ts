/**
 * Agente Monitor de Riesgo Proactivo.
 *
 * Este agente corre en modo barrido manual o cron y usa `LaborRiskEngine`
 * como fuente canonica. Asi, Riesgo Laboral, Plan anti-multas y el radar
 * automatico hablan el mismo idioma: exposicion, evidencia y acciones.
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { formatSoles } from '@/lib/format/peruvian'
import {
  evaluateLaborRisk,
  type LaborRiskArea,
  type LaborRiskFinding,
  type LaborRiskSeverity,
} from '@/lib/compliance/labor-risk-engine'
import type {
  AgentDefinition,
  AgentInput,
  AgentRunContext,
  AgentResult,
  AgentAction,
} from './types'

export interface RiskFinding {
  id: string
  categoria:
    | 'CONTRATO'
    | 'REMUNERACION'
    | 'PREVISIONAL'
    | 'VACACIONES'
    | 'DOCUMENTO'
    | 'SST'
    | 'OTRO'
  severidad: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'
  titulo: string
  descripcion: string
  entidadAfectada?: string
  multaPotencialSoles: number
  baseLegal: string
  fixSugerido: string
  fixUrl?: string
}

export interface RiskMonitorOutput {
  scanFecha: string
  totalTrabajadoresEvaluados: number
  totalContratosEvaluados: number
  findings: RiskFinding[]
  exposicionTotalSoles: number
  scoreRiesgo: number
  desglosePorSeveridad: {
    CRITICO: number
    ALTO: number
    MEDIO: number
    BAJO: number
  }
}

interface ContractLike {
  id: string
  type: string
  expiresAt: Date | null
  status: string
}

async function runRiskMonitor(
  _input: AgentInput,
  ctx: AgentRunContext,
): Promise<AgentResult<RiskMonitorOutput>> {
  const start = Date.now()
  const warnings: string[] = []
  const errors: string[] = []

  const [totalTrabajadores, contracts] = await Promise.all([
    prisma.worker.count({
      where: { orgId: ctx.orgId, status: { not: 'TERMINATED' } },
    }).catch((error: unknown) => {
      warnings.push(`No se pudieron contar trabajadores: ${errorMessage(error)}`)
      return 0
    }),
    prisma.contract.findMany({
      where: { orgId: ctx.orgId },
      select: { id: true, type: true, expiresAt: true, status: true },
    }).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        type: String(row.type),
        expiresAt: row.expiresAt ?? null,
        status: String(row.status),
      })),
    ).catch((error: unknown) => {
      warnings.push(`No se pudieron cargar contratos: ${errorMessage(error)}`)
      return [] as ContractLike[]
    }),
  ])

  let findings: RiskFinding[] = []
  let scoreRiesgo = 0
  let exposicionTotalSoles = 0
  let engineFindings = 0

  try {
    const snapshot = await evaluateLaborRisk(ctx.orgId, { mode: 'full' })
    engineFindings = snapshot.findings.length
    findings = snapshot.findings.map(laborFindingToRiskFinding)
    scoreRiesgo = snapshot.score.overall
    exposicionTotalSoles = snapshot.exposure.potentialFineSoles
  } catch (error) {
    errors.push(`LaborRiskEngine no pudo calcular el barrido: ${errorMessage(error)}`)
    warnings.push('Se devolvio un barrido parcial solo con senales preventivas disponibles.')
  }

  const preventiveFindings = checkContratoPorVencer(contracts)
  findings.push(...preventiveFindings)

  const desglosePorSeveridad = summarizeSeverity(findings)
  if (scoreRiesgo === 0 && findings.length > 0) {
    scoreRiesgo = scoreFromSeverity(desglosePorSeveridad)
  }
  exposicionTotalSoles += preventiveFindings.reduce((sum, finding) => sum + finding.multaPotencialSoles, 0)

  const data: RiskMonitorOutput = {
    scanFecha: new Date().toISOString(),
    totalTrabajadoresEvaluados: totalTrabajadores,
    totalContratosEvaluados: contracts.length,
    findings,
    exposicionTotalSoles,
    scoreRiesgo,
    desglosePorSeveridad,
  }

  const recommendedActions = buildRecommendedActions(desglosePorSeveridad, findings)
  const summary = `Barrido completado con el motor canonico: ${engineFindings} hallazgos LaborRisk y ${preventiveFindings.length} senales preventivas. Se evaluaron ${totalTrabajadores} trabajadores y ${contracts.length} contratos. Exposicion estimada: ${formatSoles(exposicionTotalSoles)}. Score: ${scoreRiesgo}/100.`

  return {
    agentSlug: 'risk-monitor',
    runId: ctx.runId,
    status: errors.length > 0 ? 'partial' : 'success',
    confidence: errors.length > 0 ? 65 : 92,
    data,
    summary,
    warnings,
    recommendedActions,
    model: 'labor-risk-engine',
    durationMs: Date.now() - start,
    errors: errors.length > 0 ? errors : undefined,
  }
}

function laborFindingToRiskFinding(finding: LaborRiskFinding): RiskFinding {
  const affected = finding.affectedEntities.slice(0, 3).map((item) => item.label).join(', ')
  const remaining = finding.affectedEntities.length > 3
    ? ` y ${finding.affectedEntities.length - 3} mas`
    : ''

  return {
    id: `labor-risk-${finding.id}`,
    categoria: categoryFromArea(finding.area),
    severidad: severityFromLabor(finding.severity),
    titulo: finding.title,
    descripcion: [
      finding.action,
      finding.missingEvidence.length > 0
        ? `Evidencia faltante: ${finding.missingEvidence.join(' ')}`
        : null,
    ].filter(Boolean).join(' '),
    entidadAfectada: affected ? `${affected}${remaining}` : undefined,
    multaPotencialSoles: finding.potentialFineSoles,
    baseLegal: finding.baseLegal,
    fixSugerido: finding.action,
    fixUrl: finding.route,
  }
}

function categoryFromArea(area: LaborRiskArea): RiskFinding['categoria'] {
  if (area === 'SST') return 'SST'
  if (area === 'CONTRATOS' || area === 'TERCEROS') return 'CONTRATO'
  if (area === 'PLANILLA' || area === 'BENEFICIOS') return 'REMUNERACION'
  if (area === 'SEGURIDAD_SOCIAL') return 'PREVISIONAL'
  if (area === 'DOCUMENTOS') return 'DOCUMENTO'
  if (area === 'JORNADA') return 'VACACIONES'
  return 'OTRO'
}

function severityFromLabor(severity: LaborRiskSeverity): RiskFinding['severidad'] {
  if (severity === 'CRITICAL') return 'CRITICO'
  if (severity === 'HIGH') return 'ALTO'
  if (severity === 'MEDIUM') return 'MEDIO'
  return 'BAJO'
}

function checkContratoPorVencer(contracts: ContractLike[]): RiskFinding[] {
  const now = new Date()
  const en30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000)

  return contracts
    .filter((contract) => contract.expiresAt && contract.expiresAt > now && contract.expiresAt <= en30)
    .map((contract) => {
      const expiresAt = contract.expiresAt!
      const dias = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 3600 * 1000))
      return {
        id: `contract-expiring-${contract.id}`,
        categoria: 'CONTRATO' as const,
        severidad: dias <= 7 ? 'ALTO' as const : 'MEDIO' as const,
        titulo: `Contrato vence en ${dias} dias`,
        descripcion: `Contrato ${contract.type} (${contract.id.slice(0, 8)}) vence el ${expiresAt.toISOString().slice(0, 10)}.`,
        multaPotencialSoles: 0,
        baseLegal: 'Riesgo preventivo de desnaturalizacion por continuidad laboral.',
        fixSugerido: 'Decidir entre renovar, finalizar o convertir antes del vencimiento.',
        fixUrl: `/dashboard/contratos/${contract.id}`,
      }
    })
}

function summarizeSeverity(findings: RiskFinding[]): RiskMonitorOutput['desglosePorSeveridad'] {
  return findings.reduce(
    (acc, finding) => {
      acc[finding.severidad] += 1
      return acc
    },
    { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 },
  )
}

function scoreFromSeverity(desglose: RiskMonitorOutput['desglosePorSeveridad']) {
  const penalty = desglose.CRITICO * 15 + desglose.ALTO * 8 + desglose.MEDIO * 3 + desglose.BAJO
  return Math.max(0, Math.min(100, 100 - penalty))
}

function buildRecommendedActions(
  desglose: RiskMonitorOutput['desglosePorSeveridad'],
  findings: RiskFinding[],
): AgentAction[] {
  const actions: AgentAction[] = []
  if (desglose.CRITICO > 0 || desglose.ALTO > 0) {
    actions.push({
      id: 'create-remediation-plan',
      label: 'Crear plan anti-multas',
      description: 'Convierte los hallazgos principales en tareas con responsable, plazo y evidencia.',
      type: 'navigate',
      payload: { url: '/dashboard/riesgo-laboral' },
      priority: 'critical',
    })
  }
  if (findings.some((finding) => finding.categoria === 'SST')) {
    actions.push({
      id: 'open-sst',
      label: 'Revisar SST preventivo',
      description: 'Atiende IPERC, EMO, EPP, comite y capacitaciones desde el modulo SST.',
      type: 'navigate',
      payload: { url: '/dashboard/sst' },
      priority: 'important',
    })
  }
  actions.push({
    id: 'open-labor-risk',
    label: 'Abrir Riesgo Laboral',
    description: 'Ver exposicion, evidencia y prioridades calculadas por el motor canonico.',
    type: 'navigate',
    payload: { url: '/dashboard/riesgo-laboral' },
    priority: 'info',
  })
  return actions
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'error desconocido'
}

const RiskFindingSchema = z.object({
  id: z.string(),
  categoria: z.enum(['CONTRATO', 'REMUNERACION', 'PREVISIONAL', 'VACACIONES', 'DOCUMENTO', 'SST', 'OTRO']),
  severidad: z.enum(['CRITICO', 'ALTO', 'MEDIO', 'BAJO']),
  titulo: z.string(),
  descripcion: z.string(),
  entidadAfectada: z.string().optional(),
  multaPotencialSoles: z.number().nonnegative(),
  baseLegal: z.string(),
  fixSugerido: z.string(),
  fixUrl: z.string().optional(),
})

const RiskMonitorOutputSchema = z.object({
  scanFecha: z.string(),
  totalTrabajadoresEvaluados: z.number().int().nonnegative(),
  totalContratosEvaluados: z.number().int().nonnegative(),
  findings: z.array(RiskFindingSchema),
  exposicionTotalSoles: z.number().nonnegative(),
  scoreRiesgo: z.number().min(0).max(100),
  desglosePorSeveridad: z.object({
    CRITICO: z.number().int().nonnegative(),
    ALTO: z.number().int().nonnegative(),
    MEDIO: z.number().int().nonnegative(),
    BAJO: z.number().int().nonnegative(),
  }),
})

export const riskMonitorAgent: AgentDefinition<AgentInput, RiskMonitorOutput> = {
  slug: 'risk-monitor',
  name: 'Monitor de Riesgo Proactivo',
  description:
    'Ejecuta un barrido canonico de riesgo laboral, evidencia, SST y exposicion SUNAFIL usando el mismo motor de Riesgo Laboral.',
  category: 'compliance',
  icon: 'Radar',
  status: 'beta',
  acceptedInputs: ['json'],
  estimatedTokens: 0,
  run: runRiskMonitor,
  outputSchema: RiskMonitorOutputSchema,
}
