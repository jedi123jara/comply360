import { NextRequest, NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { InfracGravedad } from '@/generated/prisma/enums'
import {
  evaluateLaborRisk,
  loadLaborRiskTrend,
  persistLaborRiskSnapshot,
  type LaborRiskArea,
  type LaborRiskEvidenceRequirement,
  type LaborRiskFinding,
  type LaborRiskMode,
  type LaborRiskSeverity,
} from '@/lib/compliance/labor-risk-engine'

export const runtime = 'nodejs'

type RemediationScope = 'top' | 'critical' | 'all'

export const GET = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const modeParam = new URL(req.url).searchParams.get('mode')
    const mode: LaborRiskMode =
      modeParam === 'quick' || modeParam === 'inspection' || modeParam === 'full'
        ? modeParam
        : 'full'
    const snapshot = await evaluateLaborRisk(ctx.orgId, { mode })
    const persistMode = req.nextUrl.searchParams.get('persist')
    let trend = null
    try {
      await persistLaborRiskSnapshot(snapshot, { force: persistMode === 'force' })
      trend = await loadLaborRiskTrend(ctx.orgId, 14)
    } catch (historyError) {
      console.warn('[labor-risk history]', historyError)
    }
    return NextResponse.json({ ok: true, snapshot, trend })
  } catch (error) {
    console.error('[labor-risk GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Error al calcular el riesgo laboral canonico' },
      { status: 500 },
    )
  }
})

export const POST = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = (await req.json().catch(() => ({}))) as { scope?: RemediationScope }
    const scope: RemediationScope =
      body.scope === 'critical' || body.scope === 'all' || body.scope === 'top'
        ? body.scope
        : 'top'
    const snapshot = await evaluateLaborRisk(ctx.orgId, { mode: 'full' })
    const findings = selectFindingsForPlan(snapshot.findings, scope)
    const evidenceRequirements = selectEvidenceForPlan(snapshot.evidenceRequirements, scope)

    let created = 0
    let updated = 0
    let skipped = 0
    const tasks: Array<{ id: string; sourceId: string | null; title: string; status: string }> = []

    for (const finding of findings) {
      const sourceId = `labor-risk:${finding.id}`
      const existing = await prisma.complianceTask.findFirst({
        where: { orgId: ctx.orgId, sourceId },
        select: { id: true, sourceId: true, title: true, status: true },
      })

      if (existing?.status === 'COMPLETED' || existing?.status === 'DISMISSED') {
        skipped += 1
        tasks.push(existing)
        continue
      }

      const taskData = {
        area: taskAreaForFinding(finding.area),
        priority: priorityForFinding(finding),
        title: finding.action.slice(0, 255),
        description: descriptionForFinding(finding),
        baseLegal: finding.baseLegal,
        gravedad: gravedadForSeverity(finding.severity),
        multaEvitable: finding.avoidableAmountSoles,
        plazoSugerido: plazoForSeverity(finding.severity),
        dueDate: new Date(finding.suggestedDueDate),
        assignedTo: finding.suggestedOwnerRole,
        notes: `Generada desde Riesgo Laboral el ${new Date().toISOString()}. Evidencia esperada: ${finding.missingEvidence.join(' ')}`,
      }

      if (existing) {
        const task = await prisma.complianceTask.update({
          where: { id: existing.id },
          data: {
            ...taskData,
            status: existing.status === 'PENDING' ? 'PENDING' : 'IN_PROGRESS',
          },
          select: { id: true, sourceId: true, title: true, status: true },
        })
        updated += 1
        tasks.push(task)
      } else {
        const task = await prisma.complianceTask.create({
          data: {
            orgId: ctx.orgId,
            sourceId,
            ...taskData,
          },
          select: { id: true, sourceId: true, title: true, status: true },
        })
        created += 1
        tasks.push(task)
      }
    }

    for (const requirement of evidenceRequirements) {
      const sourceId = `labor-risk:evidence:${requirement.id}`
      const existing = await prisma.complianceTask.findFirst({
        where: { orgId: ctx.orgId, sourceId },
        select: { id: true, sourceId: true, title: true, status: true },
      })

      if (existing?.status === 'COMPLETED' || existing?.status === 'DISMISSED') {
        skipped += 1
        tasks.push(existing)
        continue
      }

      const taskData = {
        area: taskAreaForFinding(requirement.area),
        priority: priorityForEvidence(requirement),
        title: `Preparar evidencia SUNAFIL: ${requirement.title}`.slice(0, 255),
        description: descriptionForEvidence(requirement),
        baseLegal: requirement.baseLegal,
        gravedad: gravedadForSeverity(requirement.severity),
        multaEvitable: requirement.avoidableAmountSoles,
        plazoSugerido: plazoForSeverity(requirement.severity),
        dueDate: dueDateForSeverity(requirement.severity),
        assignedTo: ownerForEvidence(requirement.area),
        notes: `Generada desde Riesgo Laboral el ${new Date().toISOString()}. Estado documental: ${requirement.status}. Ruta sugerida: ${requirement.route}.`,
      }

      if (existing) {
        const task = await prisma.complianceTask.update({
          where: { id: existing.id },
          data: {
            ...taskData,
            status: existing.status === 'PENDING' ? 'PENDING' : 'IN_PROGRESS',
          },
          select: { id: true, sourceId: true, title: true, status: true },
        })
        updated += 1
        tasks.push(task)
      } else {
        const task = await prisma.complianceTask.create({
          data: {
            orgId: ctx.orgId,
            sourceId,
            ...taskData,
          },
          select: { id: true, sourceId: true, title: true, status: true },
        })
        created += 1
        tasks.push(task)
      }
    }

    return NextResponse.json({
      ok: true,
      scope,
      created,
      updated,
      skipped,
      total: tasks.length,
      tasks,
    })
  } catch (error) {
    console.error('[labor-risk POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Error al crear el plan de subsanacion' },
      { status: 500 },
    )
  }
})

function selectFindingsForPlan(findings: LaborRiskFinding[], scope: RemediationScope) {
  const sorted = [...findings].sort((a, b) => b.riskScore - a.riskScore || b.avoidableAmountSoles - a.avoidableAmountSoles)
  if (scope === 'critical') return sorted.filter((finding) => finding.severity === 'CRITICAL' || finding.severity === 'HIGH').slice(0, 50)
  if (scope === 'all') return sorted.slice(0, 80)
  return sorted.slice(0, 5)
}

function selectEvidenceForPlan(requirements: LaborRiskEvidenceRequirement[], scope: RemediationScope) {
  const sorted = [...requirements].sort((a, b) => b.riskScore - a.riskScore || b.avoidableAmountSoles - a.avoidableAmountSoles)
  if (scope === 'critical') {
    return sorted
      .filter((requirement) => requirement.severity === 'CRITICAL' || requirement.severity === 'HIGH' || requirement.status === 'VENCIDO')
      .slice(0, 50)
  }
  if (scope === 'all') return sorted.slice(0, 80)
  return sorted.slice(0, 5)
}

function taskAreaForFinding(area: LaborRiskArea) {
  const map: Record<LaborRiskArea, string> = {
    SST: 'sst',
    CONTRATOS: 'contratos_registro',
    PLANILLA: 'remuneraciones_beneficios',
    BENEFICIOS: 'remuneraciones_beneficios',
    JORNADA: 'jornada_descansos',
    SEGURIDAD_SOCIAL: 'documentos_obligatorios',
    IGUALDAD: 'igualdad_nodiscriminacion',
    HSL: 'hostigamiento_sexual_detallado',
    TERCEROS: 'tercerizacion_intermediacion',
    DOCUMENTOS: 'documentos_obligatorios',
  }
  return map[area]
}

function gravedadForSeverity(severity: LaborRiskSeverity): InfracGravedad {
  if (severity === 'CRITICAL') return 'MUY_GRAVE'
  if (severity === 'HIGH') return 'GRAVE'
  return 'LEVE'
}

function priorityForFinding(finding: LaborRiskFinding) {
  if (finding.severity === 'CRITICAL') return 1
  if (finding.severity === 'HIGH') return 5
  if (finding.severity === 'MEDIUM') return 15
  return 30
}

function priorityForEvidence(requirement: LaborRiskEvidenceRequirement) {
  if (requirement.status === 'VENCIDO' || requirement.severity === 'CRITICAL') return 1
  if (requirement.severity === 'HIGH') return 5
  if (requirement.status === 'FALTANTE') return 10
  return 20
}

function plazoForSeverity(severity: LaborRiskSeverity) {
  if (severity === 'CRITICAL') return 'Inmediato (3 dias)'
  if (severity === 'HIGH') return 'Urgente (7 dias)'
  if (severity === 'MEDIUM') return 'Programado (30 dias)'
  return 'Seguimiento (60 dias)'
}

function dueDateForSeverity(severity: LaborRiskSeverity) {
  const due = new Date()
  due.setDate(due.getDate() + (severity === 'CRITICAL' ? 3 : severity === 'HIGH' ? 7 : severity === 'MEDIUM' ? 30 : 60))
  return due
}

function descriptionForFinding(finding: LaborRiskFinding) {
  const affected = finding.affectedEntities.length
    ? `Afecta a: ${finding.affectedEntities.map((item) => item.label).join(', ')}.`
    : 'Afecta a la organizacion.'
  const evidence = finding.missingEvidence.length
    ? `Evidencia requerida: ${finding.missingEvidence.join(' ')}`
    : 'Evidencia requerida: documento de subsanacion y sustento trazable.'
  return `${finding.title}. ${affected} ${finding.action} ${evidence}`.slice(0, 4000)
}

function descriptionForEvidence(requirement: LaborRiskEvidenceRequirement) {
  const coverage = requirement.coverage.total > 0
    ? `Cobertura actual: ${requirement.coverage.present}/${requirement.coverage.total}.`
    : 'Documento corporativo requerido para el expediente.'
  return `${requirement.title}. Estado: ${requirement.status}. ${coverage} Accion requerida: ${requirement.actionHint} Evidencia esperada con trazabilidad y fecha de carga. Ruta sugerida: ${requirement.route}.`.slice(0, 4000)
}

function ownerForEvidence(area: LaborRiskArea): string {
  if (area === 'SST') return 'Responsable SST'
  if (area === 'PLANILLA' || area === 'BENEFICIOS') return 'Planilla / RR.HH.'
  if (area === 'CONTRATOS' || area === 'SEGURIDAD_SOCIAL') return 'RR.HH. / Planilla'
  if (area === 'IGUALDAD' || area === 'HSL') return 'RR.HH. / Legal'
  return 'Administrador de cumplimiento'
}
