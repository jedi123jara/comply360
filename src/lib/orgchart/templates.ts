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
