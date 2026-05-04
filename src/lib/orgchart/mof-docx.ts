import JSZip from 'jszip'
import { prisma } from '@/lib/prisma'
import { getTree } from './tree-service'
import { analyzeMof } from './mof-analysis'
import type { OrgAssignmentDTO, OrgChartTree, OrgPositionDTO, OrgUnitDTO } from './types'

export interface PositionMofDocx {
  buffer: Buffer
  fileName: string
  title: string
  positionId: string
}

export interface OrgChartMofDocx {
  buffer: Buffer
  fileName: string
  title: string
  asOf: string | null
  unitId: string | null
  positionCount: number
  missingMofCount: number
}

export interface OrgChartMofSummary {
  unitCount: number
  positionCount: number
  assignmentCount: number
  vacancyCount: number
  completeCount: number
  usableCount: number
  incompleteCount: number
  criticalCount: number
  missingMofCount: number
  averageScore: number
}

interface MofOrganization {
  name: string
  razonSocial: string | null
  ruc: string | null
  sector: string | null
}

export class MofPositionNotFoundError extends Error {
  constructor() {
    super('Cargo no encontrado')
  }
}

export class MofOrganizationNotFoundError extends Error {
  constructor() {
    super('Organizacion no encontrada')
  }
}

export class MofUnitNotFoundError extends Error {
  constructor() {
    super('Unidad no encontrada')
  }
}

export async function generateOrgChartMofDocx(
  orgId: string,
  options: { asOf?: Date | null; unitId?: string | null; tree?: OrgChartTree } = {},
): Promise<OrgChartMofDocx> {
  const asOf = options.asOf ?? null
  const unitId = options.unitId ?? null
  const [tree, organization] = await Promise.all([
    options.tree ? Promise.resolve(options.tree) : getTree(orgId, asOf),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, razonSocial: true, ruc: true, sector: true },
    }),
  ])

  if (!organization) throw new MofOrganizationNotFoundError()

  const unitsById = new Map(tree.units.map(unit => [unit.id, unit]))
  const scopedUnit = unitId ? unitsById.get(unitId) ?? null : null
  if (unitId && !scopedUnit) throw new MofUnitNotFoundError()

  const includedUnitIds = unitId ? descendantUnitIds(tree.units, unitId) : new Set(tree.units.map(unit => unit.id))
  const positions = tree.positions
    .filter(position => includedUnitIds.has(position.orgUnitId))
    .sort((a, b) => {
      const unitA = unitsById.get(a.orgUnitId)
      const unitB = unitsById.get(b.orgUnitId)
      return (
        (unitA?.level ?? 0) - (unitB?.level ?? 0) ||
        (unitA?.name ?? '').localeCompare(unitB?.name ?? '', 'es') ||
        a.title.localeCompare(b.title, 'es')
      )
    })
  const summary = buildOrgChartMofSummary(tree, includedUnitIds)
  const generatedAt = new Date()
  const companyName = organization.razonSocial ?? organization.name
  const title = scopedUnit
    ? `MOF por area - ${scopedUnit.name}`
    : `MOF integral - ${companyName}`
  const body = buildOrgChartMofBody({
    tree,
    organization,
    positions,
    scopedUnit,
    summary,
    generatedAt,
    asOf,
  })
  const buffer = await buildDocxBuffer({
    title,
    subject: 'Manual de Organización y Funciones',
    creator: 'COMPLY360',
    documentXml: documentXml(body),
  })

  return {
    buffer,
    fileName: `${safeFileName(title)}${asOf ? `-${formatDateForFile(asOf)}` : ''}.docx`,
    title,
    asOf: asOf?.toISOString() ?? null,
    unitId,
    positionCount: summary.positionCount,
    missingMofCount: summary.missingMofCount,
  }
}

export function buildOrgChartMofSummary(
  tree: OrgChartTree,
  includedUnitIds: Set<string> = new Set(tree.units.map(unit => unit.id)),
): OrgChartMofSummary {
  const positions = tree.positions.filter(position => includedUnitIds.has(position.orgUnitId))
  const positionIds = new Set(positions.map(position => position.id))
  const assignments = tree.assignments.filter(assignment => positionIds.has(assignment.positionId))
  const reports = positions.map(position => analyzeMof(position))
  const totalScore = reports.reduce((sum, report) => sum + report.score, 0)
  const assignmentCountByPosition = new Map<string, number>()
  for (const assignment of assignments) {
    assignmentCountByPosition.set(
      assignment.positionId,
      (assignmentCountByPosition.get(assignment.positionId) ?? 0) + 1,
    )
  }

  return {
    unitCount: tree.units.filter(unit => includedUnitIds.has(unit.id)).length,
    positionCount: positions.length,
    assignmentCount: assignments.length,
    vacancyCount: positions.reduce((sum, position) => {
      const occupied = assignmentCountByPosition.get(position.id) ?? 0
      return sum + Math.max(0, position.seats - occupied)
    }, 0),
    completeCount: reports.filter(report => report.status === 'complete').length,
    usableCount: reports.filter(report => report.status === 'usable').length,
    incompleteCount: reports.filter(report => report.status === 'incomplete').length,
    criticalCount: reports.filter(report => report.status === 'critical').length,
    missingMofCount: reports.filter(report => report.status !== 'complete').length,
    averageScore: reports.length ? Math.round(totalScore / reports.length) : 100,
  }
}

function buildOrgChartMofBody(input: {
  tree: OrgChartTree
  organization: MofOrganization
  positions: OrgPositionDTO[]
  scopedUnit: OrgUnitDTO | null
  summary: OrgChartMofSummary
  generatedAt: Date
  asOf: Date | null
}) {
  const { tree, organization, positions, scopedUnit, summary, generatedAt, asOf } = input
  const companyName = organization.razonSocial ?? organization.name
  const unitsById = new Map(tree.units.map(unit => [unit.id, unit]))
  const positionsById = new Map(tree.positions.map(position => [position.id, position]))
  const assignmentsByPosition = groupAssignmentsByPosition(tree.assignments)
  const reportCountByPosition = countReportsByPosition(tree.positions)
  const title = scopedUnit
    ? `Manual de Organizacion y Funciones - ${scopedUnit.name}`
    : 'Manual de Organizacion y Funciones Integral'

  return [
    heading(title, 'Title'),
    paragraph('Documento generado desde el modulo Estructura Organizacional de COMPLY360.', true),
    paragraph('Base documentaria para revision interna, aprobacion, comunicacion a trabajadores y atencion de requerimientos inspectivos.'),
    spacer(),
    heading('1. Identificacion del documento'),
    keyValue('Empresa', companyName),
    keyValue('RUC', organization.ruc),
    keyValue('Sector', organization.sector),
    keyValue('Alcance', scopedUnit ? `${scopedUnit.name} y subunidades` : 'Toda la estructura organizacional vigente'),
    keyValue('Fecha de generacion', formatDate(generatedAt)),
    keyValue('Corte del organigrama', asOf ? formatDate(asOf) : 'Vigente a la fecha de generacion'),
    spacer(),
    heading('2. Resumen ejecutivo MOF'),
    keyValue('Unidades incluidas', String(summary.unitCount)),
    keyValue('Puestos formales incluidos', String(summary.positionCount)),
    keyValue('Asignaciones vigentes', String(summary.assignmentCount)),
    keyValue('Vacantes formales', String(summary.vacancyCount)),
    keyValue('Score promedio MOF', `${summary.averageScore}/100`),
    keyValue('MOF completos', String(summary.completeCount)),
    keyValue('MOF usables', String(summary.usableCount)),
    keyValue('MOF incompletos', String(summary.incompleteCount)),
    keyValue('MOF criticos', String(summary.criticalCount)),
    keyValue('Puestos con MOF pendiente', String(summary.missingMofCount)),
    spacer(),
    heading('3. Alertas de completitud'),
    listOrMissing(buildMofCompletenessLines(positions, unitsById), 'alertas de completitud MOF'),
    spacer(),
    heading('4. Indice de puestos'),
    listOrMissing(
      positions.map(position => {
        const unit = unitsById.get(position.orgUnitId)?.name ?? 'Unidad no encontrada'
        const report = analyzeMof(position)
        const parent = position.reportsToPositionId ? positionsById.get(position.reportsToPositionId)?.title : null
        return `${position.title} | ${unit} | ${report.score}/100 (${mofStatusLabel(report.status)}) | jefe inmediato: ${parent ?? 'sin jefe inmediato'}`
      }),
      'puestos incluidos',
    ),
    spacer(),
    ...positions.flatMap((position, index) => {
      const unit = unitsById.get(position.orgUnitId)
      const parent = position.reportsToPositionId ? positionsById.get(position.reportsToPositionId) : null
      const backup = position.backupPositionId ? positionsById.get(position.backupPositionId) : null
      const assignments = assignmentsByPosition.get(position.id) ?? []
      const report = analyzeMof(position)
      return [
        heading(`${index + 1}. ${position.title}`),
        keyValue('Area / unidad', unit ? `${unit.name} (${formatEnum(unit.kind)})` : null),
        keyValue('Codigo', position.code),
        keyValue('Descripcion general', position.description),
        keyValue('Score MOF', `${report.score}/100 (${mofStatusLabel(report.status)})`),
        keyValue('Jefe inmediato', parent ? parent.title : null),
        keyValue('Backup / sucesor', backup ? backup.title : null),
        keyValue('Nivel', position.level),
        keyValue('Categoria', position.category),
        keyValue('Cupos aprobados', String(position.seats)),
        keyValue('Ocupantes vigentes', assignments.length ? assignments.map(workerLine).join('; ') : 'Vacante'),
        keyValue('Reportes directos', String(reportCountByPosition.get(position.id) ?? 0)),
        keyValue('Banda salarial', formatSalaryBandText(position.salaryBandMin, position.salaryBandMax)),
        paragraph('Proposito del cargo', true),
        paragraph(position.purpose ?? missing('proposito del cargo')),
        paragraph('Funciones principales', true),
        listOrMissing(listFromJson(position.functions), 'funciones principales'),
        paragraph('Responsabilidades', true),
        listOrMissing(listFromJson(position.responsibilities), 'responsabilidades'),
        paragraph('Requisitos del puesto', true),
        listOrMissing(listFromJson(position.requirements), 'requisitos del puesto'),
        paragraph('Condiciones SST y cumplimiento', true),
        keyValue('Nivel de riesgo SST', position.riskCategory),
        keyValue('Requiere SCTR', position.requiresSctr ? 'Si' : 'No'),
        keyValue('Requiere examen medico ocupacional', position.requiresMedicalExam ? 'Si' : 'No'),
        keyValue('Cargo critico', position.isCritical ? 'Si' : 'No'),
        keyValue('Cargo con mando', position.isManagerial ? 'Si' : 'No'),
        ...(report.issues.length > 0
          ? [
              paragraph('Observaciones de completitud', true),
              listOrMissing(
                report.issues.map(issue => `${issue.label}: ${issue.detail}`),
                'observaciones de completitud',
              ),
            ].flat()
          : [paragraph('MOF completo para uso documental y evidencia interna.')]),
        spacer(),
      ].flat()
    }),
    heading('Control documentario'),
    keyValue('Fuente', 'Modulo Organigrama COMPLY360'),
    keyValue('Fecha tecnica de extraccion', tree.generatedAt),
    keyValue('Modo de consulta', tree.asOf ? 'Historico' : 'Vigente'),
    paragraph('Este documento es un entregable de trabajo. La fuente maestra permanece en el organigrama versionado; toda modificacion estructural debe registrarse en COMPLY360 para conservar trazabilidad.'),
  ].flat()
}

export async function generatePositionMofDocx(
  orgId: string,
  positionId: string,
): Promise<PositionMofDocx> {
  const position = await prisma.orgPosition.findFirst({
    where: { id: positionId, orgId, validTo: null },
    include: {
      organization: {
        select: { name: true, razonSocial: true, ruc: true, sector: true },
      },
      orgUnit: {
        select: { name: true, kind: true, code: true },
      },
      reportsTo: {
        select: {
          id: true,
          title: true,
          orgUnit: { select: { name: true } },
        },
      },
      backup: {
        select: {
          id: true,
          title: true,
          orgUnit: { select: { name: true } },
        },
      },
      reportees: {
        where: { validTo: null },
        select: { id: true, title: true },
        orderBy: { title: 'asc' },
      },
      assignments: {
        where: { endedAt: null },
        include: {
          worker: {
            select: {
              firstName: true,
              lastName: true,
              dni: true,
              regimenLaboral: true,
              tipoContrato: true,
              fechaIngreso: true,
            },
          },
        },
        orderBy: { startedAt: 'asc' },
      },
    },
  })

  if (!position) throw new MofPositionNotFoundError()

  const title = `MOF - ${position.title}`
  const generatedAt = new Date()
  const mofReport = analyzeMof({
    title: position.title,
    description: position.description,
    level: position.level,
    category: position.category,
    purpose: position.purpose,
    functions: position.functions,
    responsibilities: position.responsibilities,
    requirements: position.requirements,
    riskCategory: position.riskCategory,
    requiresSctr: position.requiresSctr,
    requiresMedicalExam: position.requiresMedicalExam,
    isCritical: position.isCritical,
    isManagerial: position.isManagerial,
    reportsToPositionId: position.reportsToPositionId,
    backupPositionId: position.backupPositionId,
  })
  const sections = [
    heading('Manual de Organización y Funciones (MOF)', 'Title'),
    paragraph(title, true),
    paragraph(`Empresa: ${position.organization.razonSocial ?? position.organization.name}`),
    paragraph(`RUC: ${position.organization.ruc ?? 'Pendiente de registrar'}`),
    paragraph(`Fecha de generación: ${formatDate(generatedAt)}`),
    spacer(),
    heading('Estado de completitud MOF'),
    keyValue('Score', `${mofReport.score}/100 (${mofStatusLabel(mofReport.status)})`),
    keyValue('Criterios completos', `${mofReport.completed}/${mofReport.total}`),
    listOrMissing(
      mofReport.issues.length > 0
        ? mofReport.issues.map(item => `${item.label}: ${item.detail}`)
        : ['MOF completo para uso documental y evidencia interna.'],
      'observaciones de completitud',
    ),
    spacer(),
    heading('1. Identificación del cargo'),
    keyValue('Cargo', position.title),
    keyValue('Código', position.code),
    keyValue('Descripción general', position.description),
    keyValue('Área / unidad', `${position.orgUnit.name} (${formatEnum(position.orgUnit.kind)})`),
    keyValue('Jefe inmediato', position.reportsTo ? `${position.reportsTo.title} - ${position.reportsTo.orgUnit.name}` : null),
    keyValue('Backup / sucesor', position.backup ? `${position.backup.title} - ${position.backup.orgUnit.name}` : null),
    keyValue('Nivel', position.level),
    keyValue('Categoría', position.category),
    keyValue('Cupos aprobados', String(position.seats)),
    keyValue('Banda salarial', formatSalaryBand(position.salaryBandMin, position.salaryBandMax)),
    keyValue('Vigencia', `${formatDate(position.validFrom)}${position.validTo ? ` a ${formatDate(position.validTo)}` : ' en adelante'}`),
    spacer(),
    heading('2. Propósito del cargo'),
    paragraph(position.purpose ?? missing('propósito del cargo')),
    spacer(),
    heading('3. Funciones principales'),
    listOrMissing(listFromJson(position.functions), 'funciones principales'),
    spacer(),
    heading('4. Responsabilidades'),
    listOrMissing(listFromJson(position.responsibilities), 'responsabilidades'),
    spacer(),
    heading('5. Requisitos del puesto'),
    listOrMissing(listFromJson(position.requirements), 'requisitos del puesto'),
    spacer(),
    heading('6. Condiciones SST y cumplimiento'),
    keyValue('Nivel de riesgo SST', position.riskCategory),
    keyValue('Requiere SCTR', position.requiresSctr ? 'Sí' : 'No'),
    keyValue('Requiere examen médico ocupacional', position.requiresMedicalExam ? 'Sí' : 'No'),
    keyValue('Cargo crítico', position.isCritical ? 'Sí' : 'No'),
    keyValue('Cargo con mando', position.isManagerial ? 'Sí' : 'No'),
    spacer(),
    heading('7. Ocupantes vigentes'),
    listOrMissing(
      position.assignments.map(assignment => {
        const worker = assignment.worker
        return `${worker.firstName} ${worker.lastName} - DNI ${worker.dni} - ${formatEnum(worker.tipoContrato)} - ingreso ${formatDate(worker.fechaIngreso)}`
      }),
      'ocupantes vigentes',
    ),
    spacer(),
    heading('8. Cargos subordinados'),
    listOrMissing(position.reportees.map(reportee => reportee.title), 'cargos subordinados'),
    spacer(),
    heading('9. Control documentario'),
    keyValue('Fuente', 'Módulo Organigrama COMPLY360'),
    keyValue('ID del cargo', position.id),
    keyValue('ID del jefe inmediato', position.reportsTo?.id ?? null),
    paragraph('Este MOF debe ser revisado y aprobado por la organización antes de su publicación o firma por trabajadores.'),
  ].flat()

  const buffer = await buildDocxBuffer({
    title,
    subject: 'Manual de Organización y Funciones',
    creator: 'COMPLY360',
    documentXml: documentXml(sections),
  })

  return {
    buffer,
    fileName: `${safeFileName(title)}.docx`,
    title,
    positionId: position.id,
  }
}

function descendantUnitIds(units: OrgUnitDTO[], rootId: string) {
  const ids = new Set<string>([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const unit of units) {
      if (unit.parentId && ids.has(unit.parentId) && !ids.has(unit.id)) {
        ids.add(unit.id)
        changed = true
      }
    }
  }
  return ids
}

function groupAssignmentsByPosition(assignments: OrgAssignmentDTO[]) {
  const grouped = new Map<string, OrgAssignmentDTO[]>()
  for (const assignment of assignments) {
    grouped.set(assignment.positionId, [...(grouped.get(assignment.positionId) ?? []), assignment])
  }
  return grouped
}

function countReportsByPosition(positions: OrgPositionDTO[]) {
  const counts = new Map<string, number>()
  for (const position of positions) {
    if (!position.reportsToPositionId) continue
    counts.set(position.reportsToPositionId, (counts.get(position.reportsToPositionId) ?? 0) + 1)
  }
  return counts
}

function buildMofCompletenessLines(positions: OrgPositionDTO[], unitsById: Map<string, OrgUnitDTO>) {
  return positions
    .map(position => ({ position, report: analyzeMof(position) }))
    .filter(item => item.report.status !== 'complete')
    .sort((a, b) => a.report.score - b.report.score || a.position.title.localeCompare(b.position.title, 'es'))
    .slice(0, 40)
    .map(({ position, report }) => {
      const unit = unitsById.get(position.orgUnitId)?.name ?? 'Unidad no encontrada'
      const issue = report.issues[0]
      const issueText = issue ? ` | principal: ${issue.label}` : ''
      return `${position.title} | ${unit} | ${report.score}/100 (${mofStatusLabel(report.status)})${issueText}`
    })
}

function workerLine(assignment: OrgAssignmentDTO) {
  const worker = assignment.worker
  return `${worker.firstName} ${worker.lastName} - DNI ${worker.dni} - ${formatEnum(worker.tipoContrato)}`
}

function documentXml(body: string[]) {
  return xmlDeclaration(`<?mso-application progid="Word.Document"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${body.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`)
}

async function buildDocxBuffer(input: {
  title: string
  subject: string
  creator: string
  documentXml: string
}) {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', contentTypesXml())
  zip.file('_rels/.rels', relsXml())
  zip.file('word/document.xml', input.documentXml)
  zip.file('word/styles.xml', stylesXml())
  zip.file('word/_rels/document.xml.rels', documentRelsXml())
  zip.file('docProps/core.xml', coreXml(input))
  zip.file('docProps/app.xml', appXml())
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

function heading(text: string, style: 'Title' | 'Heading1' = 'Heading1') {
  return paragraphXml(text, { style, bold: style !== 'Title' })
}

function paragraph(text: string, bold = false) {
  return paragraphXml(text, { bold })
}

function keyValue(label: string, value: string | null | undefined) {
  return paragraphXml(`${label}: ${value || 'Pendiente de completar'}`, { boldLabel: `${label}:` })
}

function spacer() {
  return paragraphXml('', {})
}

function listOrMissing(items: string[], fieldName: string) {
  const values = items.length > 0 ? items : [missing(fieldName)]
  return values.map(item => paragraphXml(`- ${item}`, { indent: true }))
}

function paragraphXml(
  text: string,
  options: { style?: 'Title' | 'Heading1'; bold?: boolean; boldLabel?: string; indent?: boolean },
) {
  const style = options.style ? `<w:pStyle w:val="${options.style}"/>` : ''
  const spacing = '<w:spacing w:after="120"/>'
  const indent = options.indent ? '<w:ind w:left="360"/>' : ''
  const pPr = style || indent ? `<w:pPr>${style}${spacing}${indent}</w:pPr>` : `<w:pPr>${spacing}</w:pPr>`

  if (options.boldLabel && text.startsWith(options.boldLabel)) {
    const rest = text.slice(options.boldLabel.length)
    return `<w:p>${pPr}<w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(options.boldLabel)}</w:t></w:r><w:r><w:t xml:space="preserve">${escapeXml(rest)}</w:t></w:r></w:p>`
  }

  const rPr = options.bold ? '<w:rPr><w:b/></w:rPr>' : ''
  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
}

function listFromJson(value: unknown): string[] {
  if (!value) return []
  if (typeof value === 'string') return splitTextList(value)
  if (Array.isArray(value)) {
    return value.flatMap(item => {
      if (typeof item === 'string') return splitTextList(item)
      if (item && typeof item === 'object') return [Object.values(item).map(String).join(' - ')]
      return []
    })
  }
  if (typeof value === 'object') {
    const maybeItems = (value as { items?: unknown }).items
    if (Array.isArray(maybeItems)) return listFromJson(maybeItems)
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${String(item)}`)
      .filter(Boolean)
  }
  return []
}

function splitTextList(value: string) {
  return value
    .split(/\r?\n|;|\u2022/g)
    .map(item => item.trim())
    .filter(Boolean)
}

function missing(fieldName: string) {
  return `Pendiente de completar ${fieldName}.`
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function formatDateForFile(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatSalaryBand(min: { toString(): string } | null, max: { toString(): string } | null) {
  if (!min && !max) return null
  if (min && max) return `${min.toString()} - ${max.toString()}`
  if (min) return `Desde ${min.toString()}`
  return `Hasta ${max!.toString()}`
}

function formatSalaryBandText(min: string | null | undefined, max: string | null | undefined) {
  if (!min && !max) return null
  if (min && max) return `${min} - ${max}`
  if (min) return `Desde ${min}`
  return `Hasta ${max}`
}

function mofStatusLabel(status: 'complete' | 'usable' | 'incomplete' | 'critical') {
  if (status === 'complete') return 'Completo'
  if (status === 'usable') return 'Usable'
  if (status === 'incomplete') return 'Incompleto'
  return 'Crítico'
}

function safeFileName(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

function escapeXml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function xmlDeclaration(xml: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${xml}`
}

function contentTypesXml() {
  return xmlDeclaration(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`)
}

function relsXml() {
  return xmlDeclaration(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`)
}

function documentRelsXml() {
  return xmlDeclaration(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`)
}

function stylesXml() {
  return xmlDeclaration(`<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="065F46"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="0F172A"/></w:rPr>
  </w:style>
</w:styles>`)
}

function coreXml(input: { title: string; subject: string; creator: string }) {
  const now = new Date().toISOString()
  return xmlDeclaration(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(input.title)}</dc:title>
  <dc:subject>${escapeXml(input.subject)}</dc:subject>
  <dc:creator>${escapeXml(input.creator)}</dc:creator>
  <cp:lastModifiedBy>${escapeXml(input.creator)}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`)
}

function appXml() {
  return xmlDeclaration(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>COMPLY360</Application>
</Properties>`)
}
