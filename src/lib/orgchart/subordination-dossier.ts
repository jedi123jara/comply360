import { prisma } from '@/lib/prisma'
import { getTree } from './tree-service'
import type { OrgChartTree } from './types'

export type SubordinationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAR'

export interface SubordinationProviderInput {
  id: string
  documentType: string
  documentNumber: string
  firstName: string
  lastName: string
  area: string | null
  servicioDescripcion: string
  startDate: Date | string
  endDate: Date | string | null
  monthlyAmount: number | string | { toString(): string }
  currency: string
  paymentFrequency: string
  hasSuspensionRetencion: boolean
  suspensionExpiryDate: Date | string | null
  hasFixedSchedule: boolean
  hasExclusivity: boolean
  worksOnPremises: boolean
  usesCompanyTools: boolean
  reportsToSupervisor: boolean
  receivesOrders: boolean
  desnaturalizacionRisk: number
  contractFileUrl: string | null
  status: string
  rhInvoices?: Array<{
    id: string
    issueDate: Date | string
    periodo: string
    grossAmount: number | string | { toString(): string }
    status: string
  }>
}

export interface SubordinationIndicator {
  code: string
  label: string
  weight: number
  present: boolean
  legalMeaning: string
}

export interface SubordinationCase {
  providerId: string
  providerName: string
  document: string
  serviceDescription: string
  areaName: string | null
  unitId: string | null
  unitName: string | null
  linkedPositionCount: number
  status: string
  severity: SubordinationSeverity
  score: number
  monthlyAmount: number
  currency: string
  startDate: string
  endDate: string | null
  indicators: SubordinationIndicator[]
  presentIndicators: SubordinationIndicator[]
  evidence: {
    hasContractFile: boolean
    invoiceCount: number
    latestInvoicePeriod: string | null
    hasAreaMapping: boolean
    hasFourthCategorySuspension: boolean
    suspensionExpiresAt: string | null
  }
  riskEnginePayload: {
    source: 'ORGCHART_SUBORDINATION_DOSSIER'
    riskType: 'DESNATURALIZACION_RELACION_CIVIL'
    score: number
    severity: Exclude<SubordinationSeverity, 'CLEAR'> | 'LOW'
    legalBasis: string[]
    factors: string[]
    affectedUnitId: string | null
    providerId: string
  }
  recommendedActions: string[]
}

export interface SubordinationDossier {
  generatedAt: string
  summary: {
    providers: number
    critical: number
    high: number
    medium: number
    low: number
    clear: number
    mappedToOrgUnits: number
    missingContracts: number
    estimatedMonthlyCivilSpendAtRisk: number
  }
  cases: SubordinationCase[]
}

const LEGAL_BASIS = [
  'Principio de primacia de la realidad',
  'D.S. 003-97-TR, art. 4',
  'Codigo Civil, art. 1764',
]

export async function getSubordinationDossier(orgId: string): Promise<SubordinationDossier> {
  const [tree, providers] = await Promise.all([
    getTree(orgId),
    prisma.serviceProvider.findMany({
      where: { orgId, status: { in: ['ACTIVE', 'AT_RISK'] } },
      include: {
        rhInvoices: {
          select: {
            id: true,
            issueDate: true,
            periodo: true,
            grossAmount: true,
            status: true,
          },
          orderBy: { issueDate: 'desc' },
          take: 12,
        },
      },
      orderBy: [{ desnaturalizacionRisk: 'desc' }, { updatedAt: 'desc' }],
    }),
  ])

  return buildSubordinationDossier(tree, providers)
}

export function buildSubordinationDossier(
  tree: OrgChartTree,
  providers: SubordinationProviderInput[],
  generatedAt = new Date().toISOString(),
): SubordinationDossier {
  const cases = providers
    .map(provider => buildCase(tree, provider))
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || b.score - a.score)

  return {
    generatedAt,
    summary: {
      providers: cases.length,
      critical: cases.filter(item => item.severity === 'CRITICAL').length,
      high: cases.filter(item => item.severity === 'HIGH').length,
      medium: cases.filter(item => item.severity === 'MEDIUM').length,
      low: cases.filter(item => item.severity === 'LOW').length,
      clear: cases.filter(item => item.severity === 'CLEAR').length,
      mappedToOrgUnits: cases.filter(item => item.unitId).length,
      missingContracts: cases.filter(item => !item.evidence.hasContractFile).length,
      estimatedMonthlyCivilSpendAtRisk: roundMoney(
        cases
          .filter(item => item.severity !== 'CLEAR')
          .reduce((sum, item) => sum + item.monthlyAmount, 0),
      ),
    },
    cases,
  }
}

function buildCase(tree: OrgChartTree, provider: SubordinationProviderInput): SubordinationCase {
  const unit = provider.area ? findUnitByArea(tree, provider.area) : null
  const linkedPositions = unit ? tree.positions.filter(position => position.orgUnitId === unit.id) : []
  const indicators = buildIndicators(provider)
  const presentIndicators = indicators.filter(indicator => indicator.present)
  const computedScore = presentIndicators.reduce((sum, indicator) => sum + indicator.weight, 0)
  const score = Math.max(provider.desnaturalizacionRisk, Math.min(100, computedScore))
  const severity = severityFor(provider, score, presentIndicators.length)
  const latestInvoice = latestInvoiceFor(provider)

  return {
    providerId: provider.id,
    providerName: `${provider.firstName} ${provider.lastName}`.trim(),
    document: `${provider.documentType} ${provider.documentNumber}`.trim(),
    serviceDescription: provider.servicioDescripcion,
    areaName: provider.area,
    unitId: unit?.id ?? null,
    unitName: unit?.name ?? null,
    linkedPositionCount: linkedPositions.length,
    status: provider.status,
    severity,
    score,
    monthlyAmount: parseMoney(provider.monthlyAmount),
    currency: provider.currency,
    startDate: toIso(provider.startDate),
    endDate: provider.endDate ? toIso(provider.endDate) : null,
    indicators,
    presentIndicators,
    evidence: {
      hasContractFile: Boolean(provider.contractFileUrl),
      invoiceCount: provider.rhInvoices?.length ?? 0,
      latestInvoicePeriod: latestInvoice?.periodo ?? null,
      hasAreaMapping: Boolean(unit),
      hasFourthCategorySuspension: provider.hasSuspensionRetencion,
      suspensionExpiresAt: provider.suspensionExpiryDate ? toIso(provider.suspensionExpiryDate) : null,
    },
    riskEnginePayload: {
      source: 'ORGCHART_SUBORDINATION_DOSSIER',
      riskType: 'DESNATURALIZACION_RELACION_CIVIL',
      score,
      severity: severity === 'CLEAR' ? 'LOW' : severity,
      legalBasis: LEGAL_BASIS,
      factors: presentIndicators.map(indicator => indicator.label),
      affectedUnitId: unit?.id ?? null,
      providerId: provider.id,
    },
    recommendedActions: recommendedActionsFor(provider, severity, unit?.id ?? null),
  }
}

function buildIndicators(provider: SubordinationProviderInput): SubordinationIndicator[] {
  return [
    {
      code: 'REPORTS_TO_SUPERVISOR',
      label: 'Reporta a supervisor',
      weight: 25,
      present: provider.reportsToSupervisor,
      legalMeaning: 'Puede acreditar dependencia funcional dentro de la organizacion.',
    },
    {
      code: 'RECEIVES_ORDERS',
      label: 'Recibe ordenes directas',
      weight: 25,
      present: provider.receivesOrders,
      legalMeaning: 'Es el indicador mas sensible de subordinacion juridica.',
    },
    {
      code: 'FIXED_SCHEDULE',
      label: 'Horario fijo impuesto',
      weight: 20,
      present: provider.hasFixedSchedule,
      legalMeaning: 'Reduce autonomia propia de la locacion de servicios.',
    },
    {
      code: 'WORKS_ON_PREMISES',
      label: 'Trabaja en instalaciones',
      weight: 10,
      present: provider.worksOnPremises,
      legalMeaning: 'Puede reforzar integracion operativa al centro laboral.',
    },
    {
      code: 'COMPANY_TOOLS',
      label: 'Usa herramientas de la empresa',
      weight: 10,
      present: provider.usesCompanyTools,
      legalMeaning: 'Puede indicar insercion en la organizacion empresarial.',
    },
    {
      code: 'EXCLUSIVITY',
      label: 'Exclusividad',
      weight: 10,
      present: provider.hasExclusivity,
      legalMeaning: 'Debilita la independencia economica del prestador.',
    },
  ]
}

function severityFor(provider: SubordinationProviderInput, score: number, indicatorCount: number): SubordinationSeverity {
  if (score >= 80 || (provider.hasFixedSchedule && provider.reportsToSupervisor && provider.receivesOrders)) {
    return 'CRITICAL'
  }
  if (score >= 60 || indicatorCount >= 3) return 'HIGH'
  if (score >= 40 || indicatorCount >= 2) return 'MEDIUM'
  if (score > 0 || indicatorCount === 1) return 'LOW'
  return 'CLEAR'
}

function recommendedActionsFor(
  provider: SubordinationProviderInput,
  severity: SubordinationSeverity,
  unitId: string | null,
) {
  const actions: string[] = []
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    actions.push('Revisar regularizacion laboral o redisenar la relacion civil antes de una inspeccion.')
  }
  if (provider.reportsToSupervisor || provider.receivesOrders) {
    actions.push('Eliminar jefatura operativa, ordenes directas y aprobaciones internas del flujo del prestador.')
  }
  if (provider.hasFixedSchedule) actions.push('Retirar horario fijo impuesto y documentar entregables por resultado.')
  if (!provider.contractFileUrl) actions.push('Adjuntar contrato de locacion de servicios vigente y firmado.')
  if (!unitId && provider.area) actions.push('Normalizar el nombre del area para vincular evidencia con el organigrama.')
  if (actions.length === 0) actions.push('Mantener evidencia de autonomia: entregables, pagos por recibo y ausencia de dependencia funcional.')
  return actions
}

function findUnitByArea(tree: OrgChartTree, area: string) {
  const normalizedArea = normalize(area)
  return tree.units.find(unit => normalize(unit.name) === normalizedArea || normalize(unit.code ?? '') === normalizedArea) ?? null
}

function latestInvoiceFor(provider: SubordinationProviderInput) {
  return [...(provider.rhInvoices ?? [])].sort((a, b) => dateMs(b.issueDate) - dateMs(a.issueDate))[0] ?? null
}

function severityRank(severity: SubordinationSeverity) {
  const rank: Record<SubordinationSeverity, number> = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
    CLEAR: 5,
  }
  return rank[severity]
}

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function parseMoney(value: SubordinationProviderInput['monthlyAmount']) {
  const parsed = typeof value === 'number' ? value : Number(value.toString())
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function dateMs(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
