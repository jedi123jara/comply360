import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { recordStructureChange } from './change-log'
import { diffSnapshots, takeSnapshot } from './snapshot-service'
import { getTree } from './tree-service'
import type { DoctorSeverity, OrgChartTree, OrgPositionDTO } from './types'
import { buildWhatIfCostImpact, type WhatIfCostImpact } from './what-if-cost'

export interface WhatIfRisk {
  severity: DoctorSeverity
  title: string
  description: string
}

export interface WhatIfImpactReport {
  generatedAt: string
  blocked: boolean
  scenario: {
    positionId: string
    positionTitle: string
    unitId: string
    unitName: string | null
    fromParentId: string | null
    fromParentTitle: string | null
    toParentId: string
    toParentTitle: string
  }
  metrics: {
    occupants: number
    directReportsMoved: number
    projectedSpanOfControl: number
    risks: number
  }
  costImpact: WhatIfCostImpact
  risks: WhatIfRisk[]
}

export interface CreateWhatIfDraftInput {
  name: string
  positionId: string
  newParentId: string
  createdById: string
  ipAddress?: string | null
}

export async function listWhatIfDrafts(orgId: string, limit = 30) {
  const drafts = await prisma.orgChartDraft.findMany({
    where: { orgId },
    orderBy: { updatedAt: 'desc' },
    take: Math.max(1, Math.min(100, limit)),
  })
  const actorIds = Array.from(
    new Set(
      drafts
        .flatMap(draft => [draft.createdById, draft.appliedById])
        .filter(Boolean) as string[],
    ),
  )
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : []
  const actorById = new Map(actors.map(actor => [actor.id, actor]))

  return drafts.map(draft => ({
    id: draft.id,
    name: draft.name,
    status: draft.status,
    baseSnapshotId: draft.baseSnapshotId,
    diffSummary: draft.diffSummary,
    impactReport: draft.impactReport,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    appliedAt: draft.appliedAt?.toISOString() ?? null,
    createdBy: userSummary(actorById.get(draft.createdById)),
    appliedBy: draft.appliedById ? userSummary(actorById.get(draft.appliedById)) : null,
  }))
}

export async function createWhatIfDraft(orgId: string, input: CreateWhatIfDraftInput) {
  const tree = await getTree(orgId)
  const evaluation = evaluatePositionReparentScenario(tree, input.positionId, input.newParentId)
  if (evaluation.impact.blocked) {
    throw new WhatIfScenarioError('El escenario no puede guardarse porque contiene un ciclo jerárquico.')
  }

  const baseSnapshot = await takeSnapshot(orgId, {
    label: `Base What-If - ${input.name}`.slice(0, 120),
    reason: 'Snapshot base automático para escenario What-If',
    takenById: input.createdById,
    isAuto: true,
  }).catch(() => null)

  const draft = await prisma.orgChartDraft.create({
    data: {
      orgId,
      name: input.name.trim(),
      baseSnapshotId: baseSnapshot?.id ?? null,
      payload: evaluation.simulatedTree as unknown as Prisma.InputJsonValue,
      diffSummary: evaluation.diff as unknown as Prisma.InputJsonValue,
      impactReport: evaluation.impact as unknown as Prisma.InputJsonValue,
      createdById: input.createdById,
      status: 'DRAFT',
    },
  })

  await recordStructureChange({
    orgId,
    type: 'DRAFT_CREATE',
    entityType: 'OrgChartDraft',
    entityId: draft.id,
    afterJson: {
      id: draft.id,
      name: draft.name,
      status: draft.status,
      baseSnapshotId: draft.baseSnapshotId,
      impactReport: evaluation.impact,
    },
    performedById: input.createdById,
    ipAddress: input.ipAddress ?? null,
    reason: 'Escenario What-If creado',
  }).catch(() => {})

  return {
    id: draft.id,
    name: draft.name,
    status: draft.status,
    baseSnapshotId: draft.baseSnapshotId,
    diffSummary: draft.diffSummary,
    impactReport: draft.impactReport,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    appliedAt: null,
  }
}

export async function discardWhatIfDraft(orgId: string, draftId: string, opts: { userId: string; ipAddress?: string | null }) {
  const current = await prisma.orgChartDraft.findFirst({ where: { id: draftId, orgId } })
  if (!current) throw new WhatIfDraftNotFoundError()
  if (current.status === 'APPLIED') throw new WhatIfScenarioError('No se puede descartar un escenario ya aplicado.')

  const updated = await prisma.orgChartDraft.update({
    where: { id: draftId },
    data: { status: 'DISCARDED' },
  })

  await recordStructureChange({
    orgId,
    type: 'DRAFT_DISCARD',
    entityType: 'OrgChartDraft',
    entityId: updated.id,
    beforeJson: current,
    afterJson: updated,
    performedById: opts.userId,
    ipAddress: opts.ipAddress ?? null,
    reason: 'Escenario What-If descartado',
  }).catch(() => {})

  return updated
}

export async function applyWhatIfDraft(orgId: string, draftId: string, opts: { userId: string; ipAddress?: string | null }) {
  const draft = await prisma.orgChartDraft.findFirst({ where: { id: draftId, orgId } })
  if (!draft) throw new WhatIfDraftNotFoundError()
  if (draft.status === 'APPLIED') throw new WhatIfScenarioError('El escenario ya fue aplicado.')
  if (draft.status === 'DISCARDED') throw new WhatIfScenarioError('No se puede aplicar un escenario descartado.')

  const impact = draft.impactReport as unknown as WhatIfImpactReport | null
  const positionId = impact?.scenario.positionId
  const newParentId = impact?.scenario.toParentId
  if (!impact || !positionId || !newParentId) {
    throw new WhatIfScenarioError('El escenario no contiene una acción aplicable.')
  }

  const currentPosition = await prisma.orgPosition.findFirst({ where: { id: positionId, orgId, validTo: null } })
  if (!currentPosition) throw new WhatIfScenarioError('El cargo del escenario ya no existe o no está vigente.')
  assertWhatIfDraftStillMatchesCurrentParent(impact, currentPosition.reportsToPositionId)

  const parent = await prisma.orgPosition.findFirst({
    where: { id: newParentId, orgId, validTo: null },
    select: { id: true },
  })
  if (!parent) throw new WhatIfScenarioError('El nuevo jefe inmediato ya no existe o no está vigente.')

  const tree = await getTree(orgId)
  if (wouldCreatePositionCycle(tree, positionId, newParentId)) {
    throw new WhatIfScenarioError('No se puede aplicar: crearía un ciclo jerárquico.')
  }

  const appliedAt = new Date()
  const { updatedPosition, updatedDraft } = await prisma.$transaction(async tx => {
    const updatedPosition = await tx.orgPosition.update({
      where: { id: positionId },
      data: { reportsToPositionId: newParentId },
    })

    const updatedDraft = await tx.orgChartDraft.update({
      where: { id: draft.id },
      data: {
        status: 'APPLIED',
        appliedAt,
        appliedById: opts.userId,
      },
    })

    return { updatedPosition, updatedDraft }
  })

  await recordStructureChange({
    orgId,
    type: 'POSITION_REPARENT',
    entityType: 'OrgPosition',
    entityId: positionId,
    beforeJson: currentPosition,
    afterJson: updatedPosition,
    performedById: opts.userId,
    ipAddress: opts.ipAddress ?? null,
    reason: `Aplicación de escenario What-If: ${draft.name}`,
  }).catch(() => {})

  await recordStructureChange({
    orgId,
    type: 'DRAFT_APPLY',
    entityType: 'OrgChartDraft',
    entityId: draft.id,
    beforeJson: draft,
    afterJson: updatedDraft,
    performedById: opts.userId,
    ipAddress: opts.ipAddress ?? null,
    reason: 'Escenario What-If aplicado',
  }).catch(() => {})

  await takeSnapshot(orgId, {
    label: `Aplicación What-If - ${draft.name}`.slice(0, 120),
    reason: 'Snapshot automático posterior a aplicación de escenario What-If',
    takenById: opts.userId,
    isAuto: true,
  }).catch(() => {})

  return updatedDraft
}

export function evaluatePositionReparentScenario(tree: OrgChartTree, positionId: string, newParentId: string) {
  const position = tree.positions.find(candidate => candidate.id === positionId)
  const newParent = tree.positions.find(candidate => candidate.id === newParentId)
  if (!position) throw new WhatIfScenarioError('Cargo a mover no encontrado.')
  if (!newParent) throw new WhatIfScenarioError('Nuevo jefe inmediato no encontrado.')
  if (position.id === newParent.id) throw new WhatIfScenarioError('Un cargo no puede reportarse a sí mismo.')

  const simulatedTree: OrgChartTree = {
    ...tree,
    positions: tree.positions.map(candidate =>
      candidate.id === positionId ? { ...candidate, reportsToPositionId: newParentId } : candidate,
    ),
  }
  const diff = diffSnapshots(tree, simulatedTree)
  const impact = buildImpactReport(tree, position, newParent)

  return { simulatedTree, diff, impact }
}

export function assertWhatIfDraftStillMatchesCurrentParent(
  impact: Pick<WhatIfImpactReport, 'blocked' | 'scenario'>,
  currentParentId: string | null,
) {
  if (impact.blocked) {
    throw new WhatIfScenarioError('No se puede aplicar un escenario bloqueado.')
  }

  if (currentParentId !== impact.scenario.fromParentId) {
    throw new WhatIfScenarioError(
      'La estructura cambió desde que se creó el escenario. Vuelve a simularlo antes de aplicarlo.',
    )
  }
}

function buildImpactReport(tree: OrgChartTree, position: OrgPositionDTO, newParent: OrgPositionDTO): WhatIfImpactReport {
  const positionsById = new Map(tree.positions.map(item => [item.id, item]))
  const unitsById = new Map(tree.units.map(unit => [unit.id, unit]))
  const assignments = tree.assignments.filter(assignment => assignment.positionId === position.id)
  const directReports = tree.positions.filter(candidate => candidate.reportsToPositionId === position.id)
  const projectedSpan = tree.positions.filter(candidate =>
    candidate.reportsToPositionId === newParent.id && candidate.id !== position.id,
  ).length + 1
  const cycle = wouldCreatePositionCycle(tree, position.id, newParent.id)
  const civilContractRisk = assignments.some(assignment => isCivilContractLike(assignment.worker.tipoContrato))
  const sensitivePosition = isSensitivePosition(position)
  const missingMof = !hasMof(position)
  const risks = buildWhatIfRisks({
    cycle,
    civilContractRisk,
    sensitivePosition,
    missingMof,
    directReports: directReports.length,
    projectedSpan,
  })

  return {
    generatedAt: tree.generatedAt,
    blocked: cycle,
    scenario: {
      positionId: position.id,
      positionTitle: position.title,
      unitId: position.orgUnitId,
      unitName: unitsById.get(position.orgUnitId)?.name ?? null,
      fromParentId: position.reportsToPositionId,
      fromParentTitle: position.reportsToPositionId
        ? positionsById.get(position.reportsToPositionId)?.title ?? null
        : null,
      toParentId: newParent.id,
      toParentTitle: newParent.title,
    },
    metrics: {
      occupants: assignments.length,
      directReportsMoved: directReports.length,
      projectedSpanOfControl: projectedSpan,
      risks: risks.length,
    },
    costImpact: buildWhatIfCostImpact(tree, position.id),
    risks,
  }
}

function buildWhatIfRisks({
  cycle,
  civilContractRisk,
  sensitivePosition,
  missingMof,
  directReports,
  projectedSpan,
}: {
  cycle: boolean
  civilContractRisk: boolean
  sensitivePosition: boolean
  missingMof: boolean
  directReports: number
  projectedSpan: number
}) {
  const risks: WhatIfRisk[] = []
  if (cycle) {
    risks.push({
      severity: 'CRITICAL',
      title: 'Ciclo jerárquico',
      description: 'El cambio haría que el cargo dependa de sí mismo directa o indirectamente.',
    })
  }
  if (civilContractRisk) {
    risks.push({
      severity: 'CRITICAL',
      title: 'Subordinación civil',
      description: 'El cargo tiene ocupantes con contrato civil o de servicios; documentar una jefatura puede elevar el riesgo laboral.',
    })
  }
  if (projectedSpan >= 25) {
    risks.push({
      severity: 'HIGH',
      title: 'Span de control alto',
      description: `El nuevo jefe quedaría con ${projectedSpan} reportes directos.`,
    })
  } else if (projectedSpan >= 12) {
    risks.push({
      severity: 'MEDIUM',
      title: 'Span de control exigente',
      description: `El nuevo jefe quedaría con ${projectedSpan} reportes directos.`,
    })
  }
  if (sensitivePosition) {
    risks.push({
      severity: 'HIGH',
      title: 'Cargo sensible',
      description: 'El cargo es gerencial, crítico o tiene marcadores SST; el cambio debe quedar sustentado.',
    })
  }
  if (missingMof) {
    risks.push({
      severity: 'MEDIUM',
      title: 'MOF incompleto',
      description: 'Conviene completar el MOF antes de usar esta relación como evidencia formal.',
    })
  }
  if (directReports > 0) {
    risks.push({
      severity: 'LOW',
      title: 'Arrastre de equipo',
      description: `El cambio movería indirectamente a ${directReports} reporte(s) del cargo seleccionado.`,
    })
  }
  return risks
}

function wouldCreatePositionCycle(tree: OrgChartTree, positionId: string, newParentId: string) {
  let cursor: string | null = newParentId
  const seen = new Set<string>()
  const positionsById = new Map(tree.positions.map(position => [position.id, position]))

  while (cursor) {
    if (cursor === positionId) return true
    if (seen.has(cursor)) return true
    seen.add(cursor)
    cursor = positionsById.get(cursor)?.reportsToPositionId ?? null
  }

  return false
}

function isCivilContractLike(contractType: string) {
  return contractType.includes('LOCACION') || contractType.includes('SERVICIO') || contractType.includes('CIVIL')
}

function isSensitivePosition(position: OrgPositionDTO) {
  const risk = (position.riskCategory ?? '').toUpperCase()
  return Boolean(
    position.isManagerial ||
      position.isCritical ||
      position.requiresSctr ||
      position.requiresMedicalExam ||
      risk.includes('ALTO') ||
      risk.includes('CRITICO') ||
      risk.includes('CRÍTICO'),
  )
}

function hasMof(position: OrgPositionDTO) {
  return Boolean(position.purpose && position.functions && position.responsibilities && position.requirements)
}

function userSummary(user?: { firstName: string | null; lastName: string | null; email: string } | null) {
  if (!user) return null
  return {
    name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
    email: user.email,
  }
}

export class WhatIfScenarioError extends Error {}
export class WhatIfDraftNotFoundError extends Error {}
