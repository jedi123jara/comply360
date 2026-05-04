import JSZip from 'jszip'
import { prisma } from '@/lib/prisma'
import { getTree } from './tree-service'
import { buildStructureAnalytics, type StructureAnalyticsSummary } from './structure-analytics'
import type { OrgChartTree, OrgPositionDTO } from './types'

export interface OrgChartRitDocx {
  buffer: Buffer
  fileName: string
  title: string
  asOf: string | null
}

export interface RitSummary {
  unitCount: number
  positionCount: number
  assignmentCount: number
  vacancyCount: number
  missingMofCount: number
  criticalPositionCount: number
  sstSensitiveCount: number
  complianceRoleCount: number
  maxDepth: number
  structureScore: number
  structureHealth: string
  overloadedManagers: number
  criticalManagers: number
  maxSpan: number
  averageSpan: number
}

interface RitOrganization {
  name: string
  razonSocial: string | null
  ruc: string | null
  sector: string | null
  sizeRange: string | null
  city: string | null
  district: string | null
}

export class RitOrganizationNotFoundError extends Error {
  constructor() {
    super('Organizacion no encontrada')
  }
}

export async function generateOrgChartRitDocx(
  orgId: string,
  asOf?: Date | null,
  treeOverride?: OrgChartTree,
): Promise<OrgChartRitDocx> {
  const [tree, organization] = await Promise.all([
    treeOverride ? Promise.resolve(treeOverride) : getTree(orgId, asOf),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        razonSocial: true,
        ruc: true,
        sector: true,
        sizeRange: true,
        city: true,
        district: true,
      },
    }),
  ])

  if (!organization) throw new RitOrganizationNotFoundError()

  const generatedAt = new Date()
  const title = 'RIT estructural - Organigrama y lineas de mando'
  const analytics = buildStructureAnalytics(tree)
  const summary = buildRitSummary(tree, analytics)
  const body = buildRitBody({
    tree,
    organization,
    summary,
    analytics,
    generatedAt,
    asOf: asOf ?? null,
  })
  const buffer = await buildDocxBuffer({
    title,
    subject: 'Anexo estructural del Reglamento Interno de Trabajo',
    creator: 'COMPLY360',
    documentXml: documentXml(body),
  })

  return {
    buffer,
    fileName: `${safeFileName(title)}${asOf ? `-${formatDateForFile(asOf)}` : ''}.docx`,
    title,
    asOf: asOf?.toISOString() ?? null,
  }
}

export function buildRitSummary(
  tree: OrgChartTree,
  analytics: StructureAnalyticsSummary = buildStructureAnalytics(tree),
): RitSummary {
  const assignmentCountByPosition = new Map<string, number>()
  for (const assignment of tree.assignments) {
    assignmentCountByPosition.set(
      assignment.positionId,
      (assignmentCountByPosition.get(assignment.positionId) ?? 0) + 1,
    )
  }

  return {
    unitCount: tree.units.length,
    positionCount: tree.positions.length,
    assignmentCount: tree.assignments.length,
    vacancyCount: tree.positions.reduce((sum, position) => {
      const occupied = assignmentCountByPosition.get(position.id) ?? 0
      return sum + Math.max(0, position.seats - occupied)
    }, 0),
    missingMofCount: tree.positions.filter(position => !hasMof(position)).length,
    criticalPositionCount: tree.positions.filter(position => position.isCritical).length,
    sstSensitiveCount: tree.positions.filter(isSstSensitive).length,
    complianceRoleCount: tree.complianceRoles.length,
    maxDepth: tree.units.reduce((max, unit) => Math.max(max, unit.level), 0),
    structureScore: analytics.score,
    structureHealth: structureHealthLabel(analytics.health),
    overloadedManagers: analytics.totals.overloadedManagers,
    criticalManagers: analytics.totals.criticalManagers,
    maxSpan: Math.max(0, ...analytics.spanRecords.map(record => record.directReports)),
    averageSpan: analytics.totals.averageSpan,
  }
}

function buildRitBody(input: {
  tree: OrgChartTree
  organization: RitOrganization
  summary: RitSummary
  analytics: StructureAnalyticsSummary
  generatedAt: Date
  asOf: Date | null
}) {
  const { tree, organization, summary, analytics, generatedAt, asOf } = input
  const companyName = organization.razonSocial ?? organization.name
  const unitsById = new Map(tree.units.map(unit => [unit.id, unit]))
  const positionsById = new Map(tree.positions.map(position => [position.id, position]))
  const assignmentsByPosition = groupAssignmentsByPosition(tree)
  const reportCountByPosition = countReportsByPosition(tree)

  return [
    heading('RIT estructural: organigrama y lineas de mando', 'Title'),
    paragraph('Anexo generado desde el modulo Estructura Organizacional de COMPLY360.', true),
    paragraph('Documento base para revision, aprobacion interna y control de cambios del Reglamento Interno de Trabajo.'),
    spacer(),
    heading('1. Identificacion del documento'),
    keyValue('Empresa', companyName),
    keyValue('RUC', organization.ruc),
    keyValue('Sector', organization.sector),
    keyValue('Tamano declarado', organization.sizeRange),
    keyValue('Ubicacion', [organization.district, organization.city].filter(Boolean).join(', ') || null),
    keyValue('Fecha de generacion', formatDate(generatedAt)),
    keyValue('Corte del organigrama', asOf ? formatDate(asOf) : 'Vigente a la fecha de generacion'),
    spacer(),
    heading('2. Resumen ejecutivo de estructura'),
    keyValue('Unidades organizacionales', String(summary.unitCount)),
    keyValue('Puestos formales', String(summary.positionCount)),
    keyValue('Asignaciones vigentes', String(summary.assignmentCount)),
    keyValue('Vacantes formales', String(summary.vacancyCount)),
    keyValue('Puestos con MOF pendiente', String(summary.missingMofCount)),
    keyValue('Puestos criticos', String(summary.criticalPositionCount)),
    keyValue('Puestos sensibles SST', String(summary.sstSensitiveCount)),
    keyValue('Roles legales/SST asignados', String(summary.complianceRoleCount)),
    keyValue('Score estructural', `${summary.structureScore}/100 (${summary.structureHealth})`),
    keyValue('Jefaturas con span alto', String(summary.overloadedManagers)),
    keyValue('Span maximo detectado', String(summary.maxSpan)),
    keyValue('Span promedio de jefaturas', String(summary.averageSpan)),
    spacer(),
    heading('3. Riesgos estructurales priorizados'),
    listOrMissing(
      analytics.topRisks.map(risk => `${risk.title} (${spanSeverityLabel(risk.severity)}): ${risk.description}`),
      'riesgos estructurales priorizados',
    ),
    spacer(),
    heading('4. Salud estructural por area'),
    listOrMissing(
      analytics.unitScores.slice(0, 20).map(unit => {
        const flags = unit.flags.length > 0 ? ` | alertas: ${unit.flags.join(', ')}` : ''
        return `${unit.unitName} | score ${unit.score}/100 (${structureHealthLabel(unit.health)}) | cargos: ${unit.positions} | vacantes: ${unit.vacancies} | MOF pendiente: ${unit.missingMof} | span maximo: ${unit.maxSpan}${flags}`
      }),
      'salud estructural por area',
    ),
    spacer(),
    heading('5. Unidades y dependencias'),
    listOrMissing(
      tree.units
        .slice()
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
        .map(unit => {
          const parent = unit.parentId ? unitsById.get(unit.parentId)?.name : null
          const prefix = unit.level > 0 ? `${'  '.repeat(unit.level)}- ` : '- '
          return `${prefix}${unit.name} (${formatEnum(unit.kind)})${parent ? `; depende de ${parent}` : '; unidad raiz'}`
        }),
      'unidades organizacionales',
    ),
    spacer(),
    heading('6. Lineas de mando y puestos'),
    listOrMissing(
      tree.positions
        .slice()
        .sort((a, b) => {
          const unitA = unitsById.get(a.orgUnitId)?.name ?? ''
          const unitB = unitsById.get(b.orgUnitId)?.name ?? ''
          return unitA.localeCompare(unitB) || a.title.localeCompare(b.title)
        })
        .map(position => {
          const unit = unitsById.get(position.orgUnitId)?.name ?? 'Unidad no encontrada'
          const parent = position.reportsToPositionId ? positionsById.get(position.reportsToPositionId)?.title : null
          const occupants = (assignmentsByPosition.get(position.id) ?? [])
            .map(assignment => `${assignment.worker.firstName} ${assignment.worker.lastName}`)
            .join(', ')
          return `${position.title} | ${unit} | jefe inmediato: ${parent ?? 'sin jefe inmediato'} | ocupante(s): ${occupants || 'vacante'} | reportes directos: ${reportCountByPosition.get(position.id) ?? 0}`
        }),
      'puestos y lineas de mando',
    ),
    spacer(),
    heading('7. Puestos criticos, vacantes y MOF'),
    listOrMissing(buildRiskAndMofLines(tree, unitsById, assignmentsByPosition), 'controles de puestos criticos, vacantes y MOF'),
    spacer(),
    heading('8. Roles legales, SST y comites'),
    listOrMissing(
      tree.complianceRoles.map(role => {
        const unit = role.unitId ? unitsById.get(role.unitId)?.name : null
        return `${formatEnum(role.roleType)} - ${role.worker.firstName} ${role.worker.lastName}${unit ? ` - ${unit}` : ''}${role.endsAt ? ` - vence ${formatDate(new Date(role.endsAt))}` : ''}`
      }),
      'roles legales o SST vigentes',
    ),
    spacer(),
    heading('9. Redaccion base sugerida para RIT'),
    listOrMissing(defaultRitClauses(companyName), 'clausulas estructurales sugeridas'),
    spacer(),
    heading('10. Control documental'),
    keyValue('Fuente', 'Modulo Organigrama COMPLY360'),
    keyValue('Fecha tecnica de extraccion', tree.generatedAt),
    keyValue('Modo de consulta', tree.asOf ? 'Historico' : 'Vigente'),
    paragraph('Este documento no debe editarse manualmente como fuente maestra. La fuente viva es el organigrama versionado de COMPLY360. Los cambios estructurales deben registrarse desde el modulo para conservar trazabilidad.'),
  ].flat()
}

function buildRiskAndMofLines(
  tree: OrgChartTree,
  unitsById: Map<string, OrgChartTree['units'][number]>,
  assignmentsByPosition: Map<string, OrgChartTree['assignments']>,
) {
  return tree.positions
    .filter(position => {
      const occupied = assignmentsByPosition.get(position.id)?.length ?? 0
      return position.isCritical || isSstSensitive(position) || !hasMof(position) || occupied < position.seats
    })
    .map(position => {
      const unit = unitsById.get(position.orgUnitId)?.name ?? 'Unidad no encontrada'
      const occupied = assignmentsByPosition.get(position.id)?.length ?? 0
      const tags = [
        position.isCritical ? 'critico' : null,
        isSstSensitive(position) ? 'SST sensible' : null,
        !hasMof(position) ? 'MOF pendiente' : null,
        occupied < position.seats ? `vacante(s): ${position.seats - occupied}` : null,
      ].filter(Boolean)
      return `${position.title} | ${unit} | ${tags.join(', ')}`
    })
}

function defaultRitClauses(companyName: string) {
  return [
    `La estructura organizacional de ${companyName} se rige por el organigrama vigente aprobado por la empresa y administrado en COMPLY360.`,
    'Todo trabajador debe cumplir las funciones del puesto asignado en su MOF, sin perjuicio de encargos compatibles con su categoria, regimen y normativa laboral aplicable.',
    'La linea de mando formal se determina por el puesto jefe inmediato registrado en el organigrama. Cualquier cambio de dependencia debe quedar documentado antes de su aplicacion operativa.',
    'Las unidades y puestos con obligaciones de Seguridad y Salud en el Trabajo deben cumplir las designaciones, vigencias y actas exigidas por la Ley 29783 y su reglamento.',
    'Los prestadores civiles no deben incorporarse a lineas de subordinacion propias de trabajadores dependientes salvo revision legal previa y regularizacion contractual correspondiente.',
  ]
}

function groupAssignmentsByPosition(tree: OrgChartTree) {
  const grouped = new Map<string, OrgChartTree['assignments']>()
  for (const assignment of tree.assignments) {
    grouped.set(assignment.positionId, [...(grouped.get(assignment.positionId) ?? []), assignment])
  }
  return grouped
}

function countReportsByPosition(tree: OrgChartTree) {
  const counts = new Map<string, number>()
  for (const position of tree.positions) {
    if (!position.reportsToPositionId) continue
    counts.set(position.reportsToPositionId, (counts.get(position.reportsToPositionId) ?? 0) + 1)
  }
  return counts
}

function hasMof(position: OrgPositionDTO) {
  return Boolean(position.purpose && position.functions && position.responsibilities && position.requirements)
}

function isSstSensitive(position: OrgPositionDTO) {
  const risk = (position.riskCategory ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return Boolean(
    position.requiresSctr ||
    position.requiresMedicalExam ||
    position.isCritical ||
    ['ALTO', 'CRITICO'].includes(risk),
  )
}

function structureHealthLabel(health: 'excellent' | 'stable' | 'attention' | 'critical') {
  if (health === 'excellent') return 'Excelente'
  if (health === 'stable') return 'Estable'
  if (health === 'attention') return 'Atencion'
  return 'Critico'
}

function spanSeverityLabel(severity: 'healthy' | 'watch' | 'high' | 'critical') {
  if (severity === 'healthy') return 'Saludable'
  if (severity === 'watch') return 'Vigilar'
  if (severity === 'high') return 'Alto'
  return 'Critico'
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
  const values = items.length > 0 ? items : [`Pendiente de completar ${fieldName}.`]
  return values.map(item => paragraphXml(item, { indent: true }))
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
