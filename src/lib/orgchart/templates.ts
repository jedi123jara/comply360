import { prisma } from '@/lib/prisma'
import type { Prisma, UnitKind } from '@/generated/prisma/client'

export interface OrgTemplateSummary {
  id: string
  name: string
  description: string
  sector: string
  unitCount: number
  positionCount: number
  recommendedFor: string[]
  recommendation?: OrgTemplateRecommendation
}

export interface OrgTemplateRecommendation {
  score: number
  level: 'STRONG' | 'GOOD' | 'NEUTRAL'
  reasons: string[]
  signals: string[]
}

export interface OrgTemplateRecommendationSignals {
  organizationSector?: string | null
  ciiu?: string | null
  sizeRange?: string | null
  usesAgroInputs?: boolean | null
  currentProjectCostUIT?: number | string | null
  declaredWorkers?: number | null
  workerCount?: number | null
  departments?: string[]
  workerPositions?: string[]
  existingUnitNames?: string[]
  existingPositionTitles?: string[]
  sctrWorkerCount?: number
  highRiskWorkerCount?: number
  sstPositionCount?: number
}

export interface OrgTemplatePreview {
  template: OrgTemplateSummary
  totals: {
    units: number
    positions: number
    managerialPositions: number
    sstSensitivePositions: number
    unitsToCreate: number
    unitsToReactivate: number
    positionsToCreate: number
    positionsToLink: number
    reusedUnits: number
    reusedPositions: number
    warnings: number
  }
  units: Array<{
    key: string
    name: string
    kind: UnitKind
    parentKey: string | null
    status: 'CREATE' | 'REACTIVATE' | 'REUSE'
  }>
  positions: Array<{
    key: string
    title: string
    unitName: string
    reportsToKey: string | null
    status: 'CREATE' | 'REUSE'
    willLinkManager: boolean
    warning: string | null
  }>
}

export interface OrgTemplateApplyResult extends OrgTemplatePreview {
  applied: true
  created: {
    units: number
    positions: number
  }
  updated: {
    unitsReactivated: number
    positionsLinked: number
  }
}

interface OrgTemplate {
  id: string
  name: string
  description: string
  sector: string
  recommendedFor: string[]
  units: UnitTemplate[]
  positions: PositionTemplate[]
}

interface UnitTemplate {
  key: string
  name: string
  kind: UnitKind
  parentKey?: string
  description?: string
}

interface PositionTemplate {
  key: string
  title: string
  unitKey: string
  reportsToKey?: string
  level?: string
  category?: string
  riskCategory?: string
  requiresSctr?: boolean
  requiresMedicalExam?: boolean
  isCritical?: boolean
  isManagerial?: boolean
  seats?: number
  purpose: string
  functions: string[]
  responsibilities: string[]
  requirements: string[]
}

type UnitRecord = {
  id: string
  name: string
  slug: string
  parentId: string | null
  level: number
  isActive: boolean
  validTo: Date | null
}

type PositionRecord = {
  id: string
  orgUnitId: string
  title: string
  reportsToPositionId: string | null
}

export class OrgTemplateNotFoundError extends Error {
  constructor(templateId: string) {
    super(`Plantilla no encontrada: ${templateId}`)
  }
}

export function listOrgTemplates(): OrgTemplateSummary[] {
  return ORG_TEMPLATES.map(toSummary)
}

export async function recommendOrgTemplates(orgId: string): Promise<OrgTemplateSummary[]> {
  const [organization, workers, existingUnits, existingPositions] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        sector: true,
        sizeRange: true,
        ciiu: true,
        usesAgroInputs: true,
        currentProjectCostUIT: true,
        totalWorkersDeclared: true,
      },
    }),
    prisma.worker.findMany({
      where: { orgId, status: 'ACTIVE' },
      select: {
        department: true,
        position: true,
        sctr: true,
        sctrRiesgoNivel: true,
      },
    }),
    prisma.orgUnit.findMany({
      where: { orgId, isActive: true, validTo: null },
      select: { name: true },
    }),
    prisma.orgPosition.findMany({
      where: { orgId, validTo: null },
      select: {
        title: true,
        requiresSctr: true,
        requiresMedicalExam: true,
        isCritical: true,
        riskCategory: true,
      },
    }),
  ])

  if (!organization) return listOrgTemplates()

  return recommendOrgTemplatesFromSignals({
    organizationSector: organization.sector,
    sizeRange: organization.sizeRange,
    ciiu: organization.ciiu,
    usesAgroInputs: organization.usesAgroInputs,
    currentProjectCostUIT: organization.currentProjectCostUIT?.toString() ?? null,
    declaredWorkers: organization.totalWorkersDeclared,
    workerCount: workers.length,
    departments: workers.map(worker => worker.department).filter(isNonEmptyString),
    workerPositions: workers.map(worker => worker.position).filter(isNonEmptyString),
    existingUnitNames: existingUnits.map(unit => unit.name),
    existingPositionTitles: existingPositions.map(position => position.title),
    sctrWorkerCount: workers.filter(worker => worker.sctr).length,
    highRiskWorkerCount: workers.filter(worker => normalizeKey(worker.sctrRiesgoNivel ?? '').includes('alto')).length,
    sstPositionCount: existingPositions.filter(
      position =>
        position.requiresSctr ||
        position.requiresMedicalExam ||
        position.isCritical ||
        normalizeKey(position.riskCategory ?? '').includes('alto'),
    ).length,
  })
}

export function recommendOrgTemplatesFromSignals(
  signals: OrgTemplateRecommendationSignals,
): OrgTemplateSummary[] {
  const signalBag = buildRecommendationSignalBag(signals)

  return ORG_TEMPLATES.map((template, index) => ({
    summary: {
      ...toSummary(template),
      recommendation: scoreTemplateRecommendation(template, signals, signalBag),
    },
    index,
  }))
    .sort((left, right) => {
      const scoreDiff = (right.summary.recommendation?.score ?? 0) - (left.summary.recommendation?.score ?? 0)
      return scoreDiff || left.index - right.index
    })
    .map(item => item.summary)
}

export async function previewOrgTemplate(orgId: string, templateId: string): Promise<OrgTemplatePreview> {
  const template = getTemplate(templateId)
  const [existingUnits, existingPositions] = await Promise.all([
    prisma.orgUnit.findMany({
      where: { orgId },
      select: { id: true, name: true, slug: true, parentId: true, level: true, isActive: true, validTo: true },
    }),
    prisma.orgPosition.findMany({
      where: { orgId, validTo: null },
      select: { id: true, orgUnitId: true, title: true, reportsToPositionId: true },
    }),
  ])

  return buildPreview(template, existingUnits, existingPositions)
}

export async function applyOrgTemplate(
  orgId: string,
  templateId: string,
  options: { userId?: string | null; ipAddress?: string | null } = {},
): Promise<OrgTemplateApplyResult> {
  const template = getTemplate(templateId)
  const [existingUnits, existingPositions] = await Promise.all([
    prisma.orgUnit.findMany({
      where: { orgId },
      select: { id: true, name: true, slug: true, parentId: true, level: true, isActive: true, validTo: true },
    }),
    prisma.orgPosition.findMany({
      where: { orgId, validTo: null },
      select: { id: true, orgUnitId: true, title: true, reportsToPositionId: true },
    }),
  ])
  const preview = buildPreview(template, existingUnits, existingPositions)
  const now = new Date()

  const result = await prisma.$transaction(async tx => {
    const created = { units: 0, positions: 0 }
    const updated = { unitsReactivated: 0, positionsLinked: 0 }

    const unitIdByKey = new Map<string, string>()
    const unitLevelByKey = new Map<string, number>()
    const unitBySlug = new Map(existingUnits.map(unit => [unit.slug, unit]))

    for (const unitTemplate of template.units) {
      const slug = slugify(unitTemplate.name)
      const existing = unitBySlug.get(slug)
      if (existing) {
        if (!existing.isActive || existing.validTo) {
          await tx.orgUnit.update({
            where: { id: existing.id },
            data: { isActive: true, validTo: null, version: { increment: 1 } },
          })
          updated.unitsReactivated++
        }
        unitIdByKey.set(unitTemplate.key, existing.id)
        unitLevelByKey.set(unitTemplate.key, existing.level)
        continue
      }

      const parentId = unitTemplate.parentKey ? unitIdByKey.get(unitTemplate.parentKey) ?? null : null
      const parentLevel = unitTemplate.parentKey ? unitLevelByKey.get(unitTemplate.parentKey) ?? -1 : -1
      const unit = await tx.orgUnit.create({
        data: {
          orgId,
          parentId,
          name: unitTemplate.name,
          slug,
          kind: unitTemplate.kind,
          description: unitTemplate.description ?? null,
          level: parentId ? parentLevel + 1 : 0,
          validFrom: now,
        },
      })
      await insertClosureRow(tx, unit.id, parentId)
      unitIdByKey.set(unitTemplate.key, unit.id)
      unitLevelByKey.set(unitTemplate.key, unit.level)
      created.units++
    }

    const positionIdByKey = new Map<string, string>()
    const existingPositionByKey = buildExistingPositionKeyMap(existingUnits, existingPositions)
    for (const positionTemplate of template.positions) {
      const unitTemplate = template.units.find(unit => unit.key === positionTemplate.unitKey)
      if (!unitTemplate) continue
      const key = positionKey(unitTemplate.name, positionTemplate.title)
      const existing = existingPositionByKey.get(key)
      if (existing) {
        positionIdByKey.set(positionTemplate.key, existing.id)
        continue
      }

      const unitId = unitIdByKey.get(positionTemplate.unitKey)
      if (!unitId) continue
      const position = await tx.orgPosition.create({
        data: {
          orgId,
          orgUnitId: unitId,
          title: positionTemplate.title,
          level: positionTemplate.level ?? null,
          category: positionTemplate.category ?? null,
          riskCategory: positionTemplate.riskCategory ?? null,
          requiresSctr: positionTemplate.requiresSctr ?? false,
          requiresMedicalExam: positionTemplate.requiresMedicalExam ?? false,
          isCritical: positionTemplate.isCritical ?? false,
          isManagerial: positionTemplate.isManagerial ?? Boolean(positionTemplate.reportsToKey),
          seats: positionTemplate.seats ?? 1,
          purpose: positionTemplate.purpose,
          functions: positionTemplate.functions,
          responsibilities: positionTemplate.responsibilities,
          requirements: positionTemplate.requirements,
          validFrom: now,
        },
      })
      positionIdByKey.set(positionTemplate.key, position.id)
      created.positions++
    }

    for (const positionTemplate of template.positions) {
      if (!positionTemplate.reportsToKey) continue
      const positionId = positionIdByKey.get(positionTemplate.key)
      const managerId = positionIdByKey.get(positionTemplate.reportsToKey)
      if (!positionId || !managerId || positionId === managerId) continue

      const existing = existingPositions.find(position => position.id === positionId)
      if (existing?.reportsToPositionId && existing.reportsToPositionId !== managerId) continue
      if (existing?.reportsToPositionId === managerId) continue

      await tx.orgPosition.update({
        where: { id: positionId },
        data: { reportsToPositionId: managerId },
      })
      updated.positionsLinked++
    }

    return { created, updated }
  })

  await prisma.orgStructureChangeLog.create({
    data: {
      orgId,
      type: result.created.positions > 0 ? 'POSITION_CREATE' : result.created.units > 0 ? 'UNIT_CREATE' : 'POSITION_UPDATE',
      entityType: 'OrgTemplate',
      entityId: template.id,
      afterJson: {
        templateId: template.id,
        templateName: template.name,
        created: result.created,
        updated: result.updated,
        totals: preview.totals,
      },
      performedById: options.userId ?? null,
      ipAddress: options.ipAddress ?? null,
      reason: 'Aplicación de plantilla organizacional',
    },
  }).catch(() => {})

  await prisma.auditLog.create({
    data: {
      orgId,
      userId: options.userId ?? null,
      action: 'orgchart.template.applied',
      metadataJson: {
        templateId: template.id,
        templateName: template.name,
        created: result.created,
        updated: result.updated,
      } as object,
    },
  }).catch(() => {})

  return {
    ...preview,
    applied: true,
    created: result.created,
    updated: result.updated,
  }
}

function buildPreview(
  template: OrgTemplate,
  existingUnits: UnitRecord[],
  existingPositions: PositionRecord[],
): OrgTemplatePreview {
  const unitBySlug = new Map(existingUnits.map(unit => [unit.slug, unit]))
  const existingPositionByKey = buildExistingPositionKeyMap(existingUnits, existingPositions)

  const unitRows = template.units.map(unit => {
    const existing = unitBySlug.get(slugify(unit.name))
    const status: 'CREATE' | 'REACTIVATE' | 'REUSE' = existing
      ? (!existing.isActive || existing.validTo ? 'REACTIVATE' : 'REUSE')
      : 'CREATE'
    return {
      key: unit.key,
      name: unit.name,
      kind: unit.kind,
      parentKey: unit.parentKey ?? null,
      status,
    }
  })

  const positionRows = template.positions.map(position => {
    const unit = template.units.find(item => item.key === position.unitKey)
    const key = unit ? positionKey(unit.name, position.title) : position.key
    const existing = existingPositionByKey.get(key)
    const managerTemplate = position.reportsToKey
      ? template.positions.find(item => item.key === position.reportsToKey)
      : null
    const managerUnit = managerTemplate
      ? template.units.find(item => item.key === managerTemplate.unitKey)
      : null
    const managerExisting = managerTemplate && managerUnit
      ? existingPositionByKey.get(positionKey(managerUnit.name, managerTemplate.title))
      : null
    const willLinkManager = Boolean(position.reportsToKey && (!existing || !existing.reportsToPositionId))
    const warning = existing?.reportsToPositionId && managerExisting && existing.reportsToPositionId !== managerExisting.id
      ? 'Ya tiene jefe inmediato. La plantilla no lo reemplazará.'
      : null
    const status: 'CREATE' | 'REUSE' = existing ? 'REUSE' : 'CREATE'

    return {
      key: position.key,
      title: position.title,
      unitName: unit?.name ?? 'Unidad no encontrada',
      reportsToKey: position.reportsToKey ?? null,
      status,
      willLinkManager,
      warning,
    }
  })

  const totals = {
    units: template.units.length,
    positions: template.positions.length,
    managerialPositions: template.positions.filter(position => position.isManagerial || position.reportsToKey).length,
    sstSensitivePositions: template.positions.filter(position => position.requiresSctr || position.requiresMedicalExam || position.isCritical).length,
    unitsToCreate: unitRows.filter(unit => unit.status === 'CREATE').length,
    unitsToReactivate: unitRows.filter(unit => unit.status === 'REACTIVATE').length,
    positionsToCreate: positionRows.filter(position => position.status === 'CREATE').length,
    positionsToLink: positionRows.filter(position => position.willLinkManager).length,
    reusedUnits: unitRows.filter(unit => unit.status === 'REUSE').length,
    reusedPositions: positionRows.filter(position => position.status === 'REUSE').length,
    warnings: positionRows.filter(position => position.warning).length,
  }

  return {
    template: toSummary(template),
    totals,
    units: unitRows,
    positions: positionRows,
  }
}

async function insertClosureRow(tx: Prisma.TransactionClient, unitId: string, parentId: string | null) {
  await tx.orgUnitClosure.create({
    data: { ancestorId: unitId, descendantId: unitId, depth: 0 },
  })
  if (!parentId) return

  const parentAncestors = await tx.orgUnitClosure.findMany({
    where: { descendantId: parentId },
    select: { ancestorId: true, depth: true },
  })
  if (parentAncestors.length === 0) return

  await tx.orgUnitClosure.createMany({
    data: parentAncestors.map(ancestor => ({
      ancestorId: ancestor.ancestorId,
      descendantId: unitId,
      depth: ancestor.depth + 1,
    })),
    skipDuplicates: true,
  })
}

function buildExistingPositionKeyMap(units: UnitRecord[], positions: PositionRecord[]) {
  const unitById = new Map(units.map(unit => [unit.id, unit]))
  const map = new Map<string, PositionRecord>()
  for (const position of positions) {
    const unit = unitById.get(position.orgUnitId)
    if (!unit) continue
    map.set(positionKey(unit.name, position.title), position)
  }
  return map
}

function getTemplate(templateId: string) {
  const template = ORG_TEMPLATES.find(item => item.id === templateId)
  if (!template) throw new OrgTemplateNotFoundError(templateId)
  return template
}

function toSummary(template: OrgTemplate): OrgTemplateSummary {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    sector: template.sector,
    unitCount: template.units.length,
    positionCount: template.positions.length,
    recommendedFor: template.recommendedFor,
  }
}

function positionKey(areaName: string, title: string) {
  return `${slugify(areaName)}::${normalizeKey(title)}`
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'unidad'
}

function normalizeKey(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function buildRecommendationSignalBag(signals: OrgTemplateRecommendationSignals) {
  const values = [
    signals.organizationSector,
    signals.ciiu,
    signals.sizeRange,
    ...(signals.departments ?? []),
    ...(signals.workerPositions ?? []),
    ...(signals.existingUnitNames ?? []),
    ...(signals.existingPositionTitles ?? []),
  ].filter(isNonEmptyString)

  return normalizeKey(values.join(' '))
}

function scoreTemplateRecommendation(
  template: OrgTemplate,
  signals: OrgTemplateRecommendationSignals,
  signalBag: string,
): OrgTemplateRecommendation {
  const profile = TEMPLATE_RECOMMENDATION_PROFILES[template.id]
  let score = 35
  const reasons: string[] = []
  const detectedSignals: string[] = []

  const sectorMatch = matchesAny(signalBag, profile.sectorKeywords)
  if (sectorMatch) {
    score += 26
    reasons.push(`Sector compatible: ${sectorMatch}`)
    detectedSignals.push('sector')
  }

  const keywordMatches = unique(profile.contextKeywords.filter(keyword => signalBag.includes(normalizeKey(keyword))))
  if (keywordMatches.length > 0) {
    score += Math.min(30, keywordMatches.length * 6)
    reasons.push(`Coincidencias operativas: ${keywordMatches.slice(0, 4).join(', ')}`)
    detectedSignals.push('cargos/departamentos')
  }

  const ciiu = normalizeKey(signals.ciiu ?? '').replace(/\s+/g, '')
  if (ciiu && profile.ciiuPrefixes.some(prefix => ciiu.startsWith(prefix))) {
    score += 22
    reasons.push(`CIIU compatible (${signals.ciiu})`)
    detectedSignals.push('CIIU')
  }

  if (profile.prefersAgro && signals.usesAgroInputs) {
    score += 24
    reasons.push('Marca agroindustrial activa en la organización')
    detectedSignals.push('agro')
  }

  if (profile.prefersConstructionProject && Number(signals.currentProjectCostUIT ?? 0) > 50) {
    score += 20
    reasons.push('Proyecto de construcción supera 50 UIT')
    detectedSignals.push('obra')
  }

  const declaredWorkers = signals.declaredWorkers ?? signals.workerCount ?? 0
  const workerCount = Math.max(declaredWorkers, signals.workerCount ?? 0)
  if (workerCount >= profile.minWorkerCount) {
    score += 8
    reasons.push(`Escala compatible con ${workerCount} trabajador(es)`)
    detectedSignals.push('tamaño')
  }

  if (profile.prefersSst && hasSstExposure(signals)) {
    score += 15
    reasons.push('Tiene exposición SST/SCTR o cargos de riesgo')
    detectedSignals.push('SST')
  }

  if (!profile.prefersSst && hasSstExposure(signals)) score -= 8
  if (!profile.prefersAgro && signals.usesAgroInputs) score -= 8
  if (!profile.prefersConstructionProject && Number(signals.currentProjectCostUIT ?? 0) > 50) score -= 8

  const normalizedScore = Math.max(20, Math.min(100, Math.round(score)))
  const fallbackReason = template.recommendedFor[0] ? `Aplicable a ${template.recommendedFor[0].toLowerCase()}` : template.sector
  const level: OrgTemplateRecommendation['level'] =
    normalizedScore >= 78 ? 'STRONG' : normalizedScore >= 60 ? 'GOOD' : 'NEUTRAL'

  return {
    score: normalizedScore,
    level,
    reasons: unique(reasons).slice(0, 4).length > 0 ? unique(reasons).slice(0, 4) : [fallbackReason],
    signals: unique(detectedSignals).slice(0, 5),
  }
}

function hasSstExposure(signals: OrgTemplateRecommendationSignals) {
  return Boolean(
    (signals.sctrWorkerCount ?? 0) > 0 ||
      (signals.highRiskWorkerCount ?? 0) > 0 ||
      (signals.sstPositionCount ?? 0) > 0,
  )
}

function matchesAny(signalBag: string, keywords: string[]) {
  return keywords.find(keyword => signalBag.includes(normalizeKey(keyword))) ?? null
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items))
}

const TEMPLATE_RECOMMENDATION_PROFILES: Record<
  string,
  {
    sectorKeywords: string[]
    contextKeywords: string[]
    ciiuPrefixes: string[]
    minWorkerCount: number
    prefersSst?: boolean
    prefersAgro?: boolean
    prefersConstructionProject?: boolean
  }
> = {
  'retail-operaciones': {
    sectorKeywords: ['retail', 'comercio', 'restaurante', 'tienda', 'sucursal'],
    contextKeywords: ['ventas', 'vendedor', 'caja', 'tienda', 'sucursal', 'atencion', 'cliente', 'operaciones'],
    ciiuPrefixes: ['47', '56'],
    minWorkerCount: 8,
  },
  'manufactura-sst': {
    sectorKeywords: ['manufactura', 'industria', 'planta', 'produccion'],
    contextKeywords: ['planta', 'produccion', 'mantenimiento', 'calidad', 'almacen', 'operario', 'supervisor'],
    ciiuPrefixes: ['10', '11', '12', '13', '14', '15', '16', '17', '18', '20', '22', '25', '28', '31', '32'],
    minWorkerCount: 20,
    prefersSst: true,
  },
  'servicios-profesionales': {
    sectorKeywords: ['servicios', 'consultoria', 'software', 'agencia', 'estudio'],
    contextKeywords: ['proyecto', 'consultor', 'comercial', 'administracion', 'personas', 'cultura', 'software'],
    ciiuPrefixes: ['62', '63', '69', '70', '71', '73', '74'],
    minWorkerCount: 3,
  },
  'transporte-logistica': {
    sectorKeywords: ['transporte', 'logistica', 'courier', 'distribucion'],
    contextKeywords: ['flota', 'conductor', 'despacho', 'gps', 'almacen', 'vehicular', 'distribucion'],
    ciiuPrefixes: ['49', '50', '51', '52', '53'],
    minWorkerCount: 12,
    prefersSst: true,
  },
  'construccion-obras': {
    sectorKeywords: ['construccion', 'obra', 'contratista', 'civil'],
    contextKeywords: ['obra', 'ssoma', 'residente', 'maestro', 'prevencionista', 'almacen de obra', 'proyecto'],
    ciiuPrefixes: ['41', '42', '43'],
    minWorkerCount: 10,
    prefersSst: true,
    prefersConstructionProject: true,
  },
  'agroindustria-campo': {
    sectorKeywords: ['agro', 'agrario', 'agricola', 'agroindustria', 'campo'],
    contextKeywords: ['campo', 'packing', 'fundo', 'cosecha', 'cuadrilla', 'agricola', 'inocuidad', 'temporada'],
    ciiuPrefixes: ['01', '02', '03'],
    minWorkerCount: 15,
    prefersSst: true,
    prefersAgro: true,
  },
}

const ORG_TEMPLATES: OrgTemplate[] = [
  {
    id: 'retail-operaciones',
    name: 'Retail y sucursales',
    description: 'Estructura base para empresas con tiendas, sucursales, vendedores y jefaturas operativas.',
    sector: 'Retail',
    recommendedFor: ['Tiendas', 'Restaurantes', 'Cadenas de servicios', 'Operaciones multi-sede'],
    units: [
      { key: 'direccion', name: 'Dirección General', kind: 'GERENCIA' },
      { key: 'operaciones', name: 'Operaciones', kind: 'GERENCIA', parentKey: 'direccion' },
      { key: 'tiendas', name: 'Tiendas y Sucursales', kind: 'AREA', parentKey: 'operaciones' },
      { key: 'rrhh', name: 'Recursos Humanos', kind: 'AREA', parentKey: 'direccion' },
      { key: 'admin', name: 'Administración y Finanzas', kind: 'AREA', parentKey: 'direccion' },
      { key: 'compliance', name: 'Legal y Cumplimiento', kind: 'AREA', parentKey: 'direccion' },
    ],
    positions: [
      basePosition('gerente-general', 'Gerente General', 'direccion', undefined, 'Dirección', true),
      basePosition('gerente-operaciones', 'Gerente de Operaciones', 'operaciones', 'gerente-general', 'Gerencia', true),
      basePosition('jefe-tienda', 'Jefe de Tienda', 'tiendas', 'gerente-operaciones', 'Jefatura', true),
      basePosition('vendedor', 'Vendedor', 'tiendas', 'jefe-tienda', 'Operativo', false),
      basePosition('jefe-rrhh', 'Jefe de Recursos Humanos', 'rrhh', 'gerente-general', 'Jefatura', true),
      basePosition('contador', 'Responsable de Administración y Finanzas', 'admin', 'gerente-general', 'Administrativo', true),
      basePosition('responsable-compliance', 'Responsable de Cumplimiento', 'compliance', 'gerente-general', 'Compliance', true, {
        isCritical: true,
      }),
    ],
  },
  {
    id: 'manufactura-sst',
    name: 'Manufactura con SST',
    description: 'Base para planta, producción, mantenimiento, calidad y seguridad ocupacional.',
    sector: 'Manufactura',
    recommendedFor: ['Plantas industriales', 'Almacenes', 'Agroindustria', 'Operaciones con SCTR'],
    units: [
      { key: 'direccion', name: 'Dirección General', kind: 'GERENCIA' },
      { key: 'planta', name: 'Planta y Producción', kind: 'GERENCIA', parentKey: 'direccion' },
      { key: 'sst', name: 'Seguridad y Salud en el Trabajo', kind: 'AREA', parentKey: 'planta' },
      { key: 'mantenimiento', name: 'Mantenimiento', kind: 'AREA', parentKey: 'planta' },
      { key: 'calidad', name: 'Calidad', kind: 'AREA', parentKey: 'planta' },
      { key: 'logistica', name: 'Logística y Almacén', kind: 'AREA', parentKey: 'planta' },
      { key: 'rrhh', name: 'Recursos Humanos', kind: 'AREA', parentKey: 'direccion' },
    ],
    positions: [
      basePosition('gerente-general', 'Gerente General', 'direccion', undefined, 'Dirección', true),
      basePosition('gerente-planta', 'Gerente de Planta', 'planta', 'gerente-general', 'Gerencia', true, { isCritical: true }),
      basePosition('jefe-produccion', 'Jefe de Producción', 'planta', 'gerente-planta', 'Jefatura', true, { isCritical: true }),
      basePosition('supervisor-turno', 'Supervisor de Turno', 'planta', 'jefe-produccion', 'Supervisión', true, {
        requiresMedicalExam: true,
        requiresSctr: true,
      }),
      basePosition('operario-produccion', 'Operario de Producción', 'planta', 'supervisor-turno', 'Operativo', false, {
        requiresMedicalExam: true,
        requiresSctr: true,
        riskCategory: 'ALTO',
      }),
      basePosition('jefe-sst', 'Jefe de SST', 'sst', 'gerente-planta', 'Jefatura', true, {
        isCritical: true,
        requiresMedicalExam: true,
      }),
      basePosition('tecnico-mantenimiento', 'Técnico de Mantenimiento', 'mantenimiento', 'gerente-planta', 'Técnico', false, {
        requiresMedicalExam: true,
        requiresSctr: true,
        riskCategory: 'ALTO',
      }),
      basePosition('responsable-calidad', 'Responsable de Calidad', 'calidad', 'gerente-planta', 'Especialista', true),
      basePosition('jefe-logistica', 'Jefe de Logística y Almacén', 'logistica', 'gerente-planta', 'Jefatura', true, {
        requiresMedicalExam: true,
      }),
      basePosition('jefe-rrhh', 'Jefe de Recursos Humanos', 'rrhh', 'gerente-general', 'Jefatura', true),
    ],
  },
  {
    id: 'servicios-profesionales',
    name: 'Servicios profesionales',
    description: 'Estructura liviana para consultoras, estudios, agencias y equipos de proyectos.',
    sector: 'Servicios',
    recommendedFor: ['Consultoras', 'Estudios contables', 'Agencias', 'Software y proyectos'],
    units: [
      { key: 'direccion', name: 'Dirección General', kind: 'GERENCIA' },
      { key: 'proyectos', name: 'Operaciones y Proyectos', kind: 'AREA', parentKey: 'direccion' },
      { key: 'comercial', name: 'Comercial', kind: 'AREA', parentKey: 'direccion' },
      { key: 'admin', name: 'Administración', kind: 'AREA', parentKey: 'direccion' },
      { key: 'personas', name: 'Personas y Cultura', kind: 'AREA', parentKey: 'direccion' },
      { key: 'compliance', name: 'Legal y Cumplimiento', kind: 'AREA', parentKey: 'direccion' },
    ],
    positions: [
      basePosition('gerente-general', 'Gerente General', 'direccion', undefined, 'Dirección', true),
      basePosition('gerente-proyectos', 'Gerente de Proyectos', 'proyectos', 'gerente-general', 'Gerencia', true),
      basePosition('lider-proyecto', 'Líder de Proyecto', 'proyectos', 'gerente-proyectos', 'Liderazgo', true),
      basePosition('consultor', 'Consultor', 'proyectos', 'lider-proyecto', 'Especialista', false),
      basePosition('ejecutivo-comercial', 'Ejecutivo Comercial', 'comercial', 'gerente-general', 'Comercial', false),
      basePosition('responsable-admin', 'Responsable de Administración', 'admin', 'gerente-general', 'Administrativo', true),
      basePosition('responsable-personas', 'Responsable de Personas y Cultura', 'personas', 'gerente-general', 'Jefatura', true),
      basePosition('responsable-compliance', 'Responsable de Cumplimiento', 'compliance', 'gerente-general', 'Compliance', true, {
        isCritical: true,
      }),
    ],
  },
  {
    id: 'transporte-logistica',
    name: 'Transporte y logística',
    description: 'Estructura base para flotas, despachos, almacenes, mantenimiento vehicular y control SST.',
    sector: 'Transporte',
    recommendedFor: ['Transporte terrestre', 'Courier', 'Distribución', 'Operadores logísticos'],
    units: [
      { key: 'direccion', name: 'Dirección General', kind: 'GERENCIA' },
      { key: 'operaciones', name: 'Operaciones de Transporte', kind: 'GERENCIA', parentKey: 'direccion' },
      { key: 'flota', name: 'Flota y Conductores', kind: 'AREA', parentKey: 'operaciones' },
      { key: 'despacho', name: 'Despacho y Monitoreo', kind: 'AREA', parentKey: 'operaciones' },
      { key: 'almacen', name: 'Almacén y Distribución', kind: 'AREA', parentKey: 'operaciones' },
      { key: 'mantenimiento', name: 'Mantenimiento Vehicular', kind: 'AREA', parentKey: 'operaciones' },
      { key: 'sst', name: 'SST y Seguridad Vial', kind: 'AREA', parentKey: 'direccion' },
      { key: 'admin', name: 'Administración y Finanzas', kind: 'AREA', parentKey: 'direccion' },
    ],
    positions: [
      basePosition('gerente-general', 'Gerente General', 'direccion', undefined, 'Dirección', true),
      basePosition('gerente-operaciones', 'Gerente de Operaciones de Transporte', 'operaciones', 'gerente-general', 'Gerencia', true, { isCritical: true }),
      basePosition('jefe-flota', 'Jefe de Flota', 'flota', 'gerente-operaciones', 'Jefatura', true, { isCritical: true }),
      basePosition('conductor', 'Conductor Profesional', 'flota', 'jefe-flota', 'Operativo', false, {
        requiresMedicalExam: true,
        requiresSctr: true,
        riskCategory: 'ALTO',
        seats: 6,
      }),
      basePosition('coordinador-despacho', 'Coordinador de Despacho', 'despacho', 'gerente-operaciones', 'Coordinación', true),
      basePosition('monitor-gps', 'Monitor GPS', 'despacho', 'coordinador-despacho', 'Operativo', false),
      basePosition('jefe-almacen', 'Jefe de Almacén', 'almacen', 'gerente-operaciones', 'Jefatura', true, { requiresMedicalExam: true }),
      basePosition('tecnico-mantenimiento', 'Técnico de Mantenimiento Vehicular', 'mantenimiento', 'gerente-operaciones', 'Técnico', false, {
        requiresMedicalExam: true,
        requiresSctr: true,
        riskCategory: 'ALTO',
      }),
      basePosition('responsable-sst', 'Responsable SST y Seguridad Vial', 'sst', 'gerente-general', 'Compliance', true, {
        isCritical: true,
        requiresMedicalExam: true,
      }),
      basePosition('responsable-admin', 'Responsable de Administración y Finanzas', 'admin', 'gerente-general', 'Administrativo', true),
    ],
  },
  {
    id: 'construccion-obras',
    name: 'Construcción y obras',
    description: 'Organigrama para obras, residentes, supervisión en campo, almacén, SSOMA y administración de proyecto.',
    sector: 'Construcción',
    recommendedFor: ['Constructoras', 'Contratistas', 'Obras civiles', 'Mantenimiento industrial'],
    units: [
      { key: 'direccion', name: 'Dirección General', kind: 'GERENCIA' },
      { key: 'proyectos', name: 'Gestión de Proyectos', kind: 'GERENCIA', parentKey: 'direccion' },
      { key: 'obra', name: 'Obra y Producción', kind: 'AREA', parentKey: 'proyectos' },
      { key: 'ssoma', name: 'SSOMA', kind: 'AREA', parentKey: 'proyectos' },
      { key: 'calidad', name: 'Calidad y Oficina Técnica', kind: 'AREA', parentKey: 'proyectos' },
      { key: 'almacen', name: 'Almacén de Obra', kind: 'AREA', parentKey: 'proyectos' },
      { key: 'adminobra', name: 'Administración de Obra', kind: 'AREA', parentKey: 'direccion' },
    ],
    positions: [
      basePosition('gerente-general', 'Gerente General', 'direccion', undefined, 'Dirección', true),
      basePosition('gerente-proyectos', 'Gerente de Proyectos', 'proyectos', 'gerente-general', 'Gerencia', true, { isCritical: true }),
      basePosition('residente-obra', 'Residente de Obra', 'obra', 'gerente-proyectos', 'Jefatura', true, {
        isCritical: true,
        requiresMedicalExam: true,
        requiresSctr: true,
        riskCategory: 'ALTO',
      }),
      basePosition('maestro-obra', 'Maestro de Obra', 'obra', 'residente-obra', 'Supervisión', true, {
        requiresMedicalExam: true,
        requiresSctr: true,
        riskCategory: 'ALTO',
      }),
      basePosition('operario-construccion', 'Operario de Construcción Civil', 'obra', 'maestro-obra', 'Operativo', false, {
        requiresMedicalExam: true,
        requiresSctr: true,
        riskCategory: 'ALTO',
        seats: 8,
      }),
      basePosition('jefe-ssoma', 'Jefe SSOMA', 'ssoma', 'gerente-proyectos', 'Compliance', true, {
        isCritical: true,
        requiresMedicalExam: true,
      }),
      basePosition('prevencionista', 'Prevencionista de Riesgos', 'ssoma', 'jefe-ssoma', 'Técnico', false, {
        requiresMedicalExam: true,
        requiresSctr: true,
        riskCategory: 'ALTO',
      }),
      basePosition('responsable-calidad', 'Responsable de Calidad', 'calidad', 'gerente-proyectos', 'Especialista', true),
      basePosition('almacenero-obra', 'Almacenero de Obra', 'almacen', 'residente-obra', 'Operativo', false, { requiresMedicalExam: true }),
      basePosition('administrador-obra', 'Administrador de Obra', 'adminobra', 'gerente-general', 'Administrativo', true),
    ],
  },
  {
    id: 'agroindustria-campo',
    name: 'Agroindustria y campo',
    description: 'Base para operaciones agrícolas, packing, calidad, mantenimiento, SST y administración de temporada.',
    sector: 'Agroindustria',
    recommendedFor: ['Empresas agrarias', 'Packing', 'Fundos', 'Procesamiento de alimentos'],
    units: [
      { key: 'direccion', name: 'Dirección General', kind: 'GERENCIA' },
      { key: 'campo', name: 'Operaciones de Campo', kind: 'GERENCIA', parentKey: 'direccion' },
      { key: 'packing', name: 'Packing y Planta', kind: 'AREA', parentKey: 'campo' },
      { key: 'calidad', name: 'Calidad e Inocuidad', kind: 'AREA', parentKey: 'campo' },
      { key: 'mantenimiento', name: 'Mantenimiento Agrícola', kind: 'AREA', parentKey: 'campo' },
      { key: 'sst', name: 'SST y Salud Ocupacional', kind: 'AREA', parentKey: 'direccion' },
      { key: 'rrhh', name: 'Recursos Humanos y Campaña', kind: 'AREA', parentKey: 'direccion' },
    ],
    positions: [
      basePosition('gerente-general', 'Gerente General', 'direccion', undefined, 'Dirección', true),
      basePosition('gerente-campo', 'Gerente de Campo', 'campo', 'gerente-general', 'Gerencia', true, { isCritical: true }),
      basePosition('jefe-campo', 'Jefe de Campo', 'campo', 'gerente-campo', 'Jefatura', true, {
        requiresMedicalExam: true,
        riskCategory: 'MEDIO',
      }),
      basePosition('supervisor-cuadrilla', 'Supervisor de Cuadrilla', 'campo', 'jefe-campo', 'Supervisión', true, {
        requiresMedicalExam: true,
        requiresSctr: true,
        riskCategory: 'ALTO',
      }),
      basePosition('operario-agricola', 'Operario Agrícola', 'campo', 'supervisor-cuadrilla', 'Operativo', false, {
        requiresMedicalExam: true,
        requiresSctr: true,
        riskCategory: 'ALTO',
        seats: 12,
      }),
      basePosition('jefe-packing', 'Jefe de Packing', 'packing', 'gerente-campo', 'Jefatura', true, { requiresMedicalExam: true }),
      basePosition('operario-packing', 'Operario de Packing', 'packing', 'jefe-packing', 'Operativo', false, {
        requiresMedicalExam: true,
        seats: 10,
      }),
      basePosition('responsable-calidad', 'Responsable de Calidad e Inocuidad', 'calidad', 'gerente-campo', 'Especialista', true),
      basePosition('tecnico-mantenimiento', 'Técnico de Mantenimiento Agrícola', 'mantenimiento', 'gerente-campo', 'Técnico', false, {
        requiresMedicalExam: true,
        requiresSctr: true,
        riskCategory: 'ALTO',
      }),
      basePosition('responsable-sst', 'Responsable SST y Salud Ocupacional', 'sst', 'gerente-general', 'Compliance', true, {
        isCritical: true,
        requiresMedicalExam: true,
      }),
      basePosition('jefe-rrhh-campana', 'Jefe de RRHH y Campaña', 'rrhh', 'gerente-general', 'Jefatura', true),
    ],
  },
]

function basePosition(
  key: string,
  title: string,
  unitKey: string,
  reportsToKey: string | undefined,
  category: string,
  isManagerial: boolean,
  overrides: Partial<PositionTemplate> = {},
): PositionTemplate {
  return {
    key,
    title,
    unitKey,
    reportsToKey,
    category,
    isManagerial,
    level: category,
    riskCategory: overrides.riskCategory ?? 'BAJO',
    purpose: `Ejecutar y documentar las responsabilidades del cargo ${title} dentro de la estructura organizacional.`,
    functions: [
      'Cumplir las funciones asignadas por la organización según su rol.',
      'Mantener coordinación formal con su línea de mando.',
      'Reportar incidencias relevantes para cumplimiento laboral y SST.',
    ],
    responsibilities: [
      'Actuar conforme a las políticas internas vigentes.',
      'Preservar evidencia documental de decisiones, reportes y aprobaciones relevantes.',
      'Cumplir las obligaciones de seguridad, salud y confidencialidad aplicables.',
    ],
    requirements: [
      'Experiencia y competencias acordes al nivel del cargo.',
      'Conocimiento de políticas internas y obligaciones laborales aplicables.',
      'Disponibilidad para completar inducciones, capacitaciones y documentos del legajo.',
    ],
    ...overrides,
  }
}
