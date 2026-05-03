import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { prisma } from '@/lib/prisma'
import { getTree } from './tree-service'
import { computeSnapshotMetrics, hashSnapshotPayload } from './snapshot-service'
import { buildStructureAnalytics } from './structure-analytics'
import type { OrgChartTree } from './types'

export interface OrgChartPdfExport {
  buffer: Buffer
  fileName: string
}

export async function exportOrgChartPdf(orgId: string, asOf?: Date | null): Promise<OrgChartPdfExport> {
  const [org, tree] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, razonSocial: true, ruc: true, sector: true },
    }),
    getTree(orgId, asOf ?? null),
  ])

  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const ctx = new PdfContext(doc, regular, bold)

  const metrics = computeSnapshotMetrics(tree)
  const hash = hashSnapshotPayload(tree)
  const analytics = buildStructureAnalytics(tree)
  const orgName = org?.razonSocial ?? org?.name ?? 'Organización'

  ctx.addTitlePage({
    title: 'Reporte de Estructura Organizacional',
    subtitle: orgName,
    details: [
      ['RUC', org?.ruc ?? 'No registrado'],
      ['Sector', org?.sector ?? 'No registrado'],
      ['Fecha de emisión', formatDateTime(new Date())],
      ['Vista', asOf ? `Histórica al ${formatDateTime(asOf)}` : 'Estado actual'],
      ['Hash verificable', hash],
    ],
  })

  ctx.addSection('Resumen ejecutivo')
  ctx.addKeyValues([
    ['Score estructural', `${analytics.score}/100 (${structureHealthLabel(analytics.health)})`],
    ['Áreas/unidades', String(metrics.unitCount)],
    ['Cargos', String(tree.positions.length)],
    ['Trabajadores asignados', String(metrics.workerCount)],
    ['Asignaciones vigentes', String(tree.assignments.length)],
    ['Roles legales', String(tree.complianceRoles.length)],
    ['Profundidad máxima', String(metrics.depthMax)],
    ['Vacantes formales', `${analytics.totals.vacancies} (${formatPercent(analytics.totals.vacancyRate)})`],
    ['MOF pendiente', `${analytics.totals.missingMof} (${formatPercent(analytics.totals.missingMofRate)})`],
    ['Jefaturas con span alto', String(analytics.totals.overloadedManagers)],
  ])

  ctx.addSection('Riesgos estructurales priorizados')
  if (analytics.topRisks.length === 0) {
    ctx.addParagraph('No se detectan riesgos estructurales relevantes con los criterios actuales.', { color: rgb(0.04, 0.45, 0.25) })
  } else {
    for (const risk of analytics.topRisks) {
      ctx.addParagraph(`${risk.title} · ${spanSeverityLabel(risk.severity)}`, { bold: true, spacingAfter: 2 })
      ctx.addParagraph(risk.description, { size: 9, color: rgb(0.29, 0.34, 0.42), indent: 12 })
    }
  }

  ctx.addSection('Salud por área')
  for (const unit of analytics.unitScores.slice(0, 15)) {
    ctx.addParagraph(
      `${unit.unitName} · ${unit.score}/100 · ${structureHealthLabel(unit.health)}`,
      { bold: true, spacingAfter: 2 },
    )
    ctx.addParagraph(
      `${unit.positions} cargos · ${unit.occupants} ocupantes · ${unit.vacancies} vacante(s) · ${unit.missingMof} MOF pendiente(s) · span máx. ${unit.maxSpan}`,
      { size: 9, color: rgb(0.29, 0.34, 0.42), indent: 12 },
    )
    if (unit.flags.length > 0) {
      ctx.addParagraph(`Alertas: ${unit.flags.join(' · ')}`, { size: 8.5, color: rgb(0.7, 0.25, 0.1), indent: 12 })
    }
  }

  ctx.addSection('Span de control')
  const relevantSpans = analytics.spanRecords.filter(record => record.severity !== 'healthy').slice(0, 20)
  if (relevantSpans.length === 0) {
    ctx.addParagraph('No hay jefaturas con span fuera de rango.', { color: rgb(0.04, 0.45, 0.25) })
  } else {
    for (const record of relevantSpans) {
      ctx.addBullet(`${record.title} (${record.unitName}) · ${record.directReports} directos · ${record.totalSubtree} en subárbol · ${spanSeverityLabel(record.severity)}.`)
    }
  }

  ctx.addSection('Áreas y unidades')
  for (const unit of tree.units) {
    ctx.addBullet(`${indent(unit.level)}${unit.name} · ${formatEnum(unit.kind)}${unit.code ? ` · ${unit.code}` : ''}`)
  }

  ctx.addSection('Cargos y líneas de mando')
  const unitsById = new Map(tree.units.map(unit => [unit.id, unit]))
  const positionsById = new Map(tree.positions.map(position => [position.id, position]))
  const assignmentsByPosition = groupAssignments(tree)
  for (const position of [...tree.positions].sort((a, b) => {
    const unitA = unitsById.get(a.orgUnitId)?.name ?? ''
    const unitB = unitsById.get(b.orgUnitId)?.name ?? ''
    return `${unitA} ${a.title}`.localeCompare(`${unitB} ${b.title}`)
  })) {
    const unit = unitsById.get(position.orgUnitId)
    const manager = position.reportsToPositionId ? positionsById.get(position.reportsToPositionId) : null
    const occupants = assignmentsByPosition.get(position.id) ?? []
    const occupantText = occupants.length > 0
      ? occupants.map(item => `${item.worker.firstName} ${item.worker.lastName}`).join(', ')
      : 'Vacante'
    ctx.addParagraph(
      `${position.title} (${unit?.name ?? 'Sin área'})`,
      { bold: true, spacingAfter: 2 },
    )
    ctx.addParagraph(
      `Reporta a: ${manager?.title ?? 'Sin jefe inmediato'} · Ocupantes: ${occupantText} · MOF: ${hasMof(position) ? 'Completo' : 'Incompleto'}`,
      { size: 9, color: rgb(0.29, 0.34, 0.42), indent: 12 },
    )
    const flags = [
      position.isCritical ? 'Cargo crítico' : null,
      position.requiresSctr ? 'SCTR' : null,
      position.requiresMedicalExam ? 'Examen médico' : null,
      position.riskCategory ? `Riesgo ${position.riskCategory}` : null,
    ].filter(Boolean)
    if (flags.length > 0) ctx.addParagraph(flags.join(' · '), { size: 8, color: rgb(0.7, 0.25, 0.1), indent: 12 })
  }

  ctx.addSection('Roles legales')
  if (tree.complianceRoles.length === 0) {
    ctx.addParagraph('No hay roles legales asignados en el organigrama.', { color: rgb(0.55, 0.27, 0.07) })
  } else {
    for (const role of tree.complianceRoles) {
      const unit = role.unitId ? unitsById.get(role.unitId) : null
      ctx.addBullet(`${formatEnum(role.roleType)} · ${role.worker.firstName} ${role.worker.lastName} · ${unit?.name ?? 'Ámbito general'}${role.endsAt ? ` · vence ${formatDate(new Date(role.endsAt))}` : ''}`)
    }
  }

  ctx.addSection('Control de evidencia')
  ctx.addParagraph('Este reporte fue generado desde el módulo Organigrama de COMPLY360. Para inspección o due diligence, compare el hash indicado con el snapshot o Auditor Link correspondiente.')
  ctx.addKeyValues([
    ['Hash SHA-256', hash],
    ['Generado', formatDateTime(new Date())],
    ['Alcance', asOf ? 'Vista histórica' : 'Estado actual vigente'],
  ])

  const pages = doc.getPages()
  pages.forEach((page, index) => {
    page.drawText(`COMPLY360 · ${orgName}`, { x: 42, y: 24, size: 8, font: regular, color: rgb(0.45, 0.5, 0.58) })
    page.drawText(`Página ${index + 1}/${pages.length}`, { x: 520, y: 24, size: 8, font: regular, color: rgb(0.45, 0.5, 0.58) })
  })

  const bytes = await doc.save()
  const suffix = asOf ? `historico-${formatFileDate(asOf)}` : `actual-${formatFileDate(new Date())}`
  return {
    buffer: Buffer.from(bytes),
    fileName: `organigrama-${suffix}.pdf`,
  }
}

class PdfContext {
  private page: PDFPage
  private y = 0
  private readonly margin = 42
  private readonly width = 595.28
  private readonly height = 841.89

  constructor(
    private readonly doc: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
  ) {
    this.page = this.doc.addPage([this.width, this.height])
    this.y = this.height - this.margin
  }

  addTitlePage(input: { title: string; subtitle: string; details: Array<[string, string]> }) {
    this.page.drawRectangle({ x: 0, y: this.height - 180, width: this.width, height: 180, color: rgb(0.91, 0.98, 0.94) })
    this.page.drawText(input.title, { x: this.margin, y: this.height - 90, size: 24, font: this.bold, color: rgb(0.02, 0.37, 0.27) })
    this.page.drawText(input.subtitle, { x: this.margin, y: this.height - 122, size: 14, font: this.regular, color: rgb(0.1, 0.16, 0.24) })
    this.y = this.height - 220
    this.addKeyValues(input.details)
    this.newPage()
  }

  addSection(title: string) {
    this.ensureSpace(48)
    this.page.drawText(title, { x: this.margin, y: this.y, size: 15, font: this.bold, color: rgb(0.02, 0.37, 0.27) })
    this.y -= 24
  }

  addKeyValues(values: Array<[string, string]>) {
    for (const [label, value] of values) {
      this.ensureSpace(22)
      this.page.drawText(`${label}:`, { x: this.margin, y: this.y, size: 10, font: this.bold, color: rgb(0.1, 0.16, 0.24) })
      this.addWrappedText(value, this.margin + 135, this.y, 370, 10, this.regular, rgb(0.1, 0.16, 0.24))
      this.y -= 18
    }
    this.y -= 8
  }

  addBullet(text: string) {
    this.addParagraph(`- ${text}`, { size: 9.5, indent: 10 })
  }

  addParagraph(
    text: string,
    options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number; spacingAfter?: number } = {},
  ) {
    const size = options.size ?? 10
    const font = options.bold ? this.bold : this.regular
    const x = this.margin + (options.indent ?? 0)
    const maxWidth = this.width - this.margin * 2 - (options.indent ?? 0)
    const lines = wrapText(text, font, size, maxWidth)
    this.ensureSpace(lines.length * (size + 4) + 8)
    for (const line of lines) {
      this.page.drawText(line, { x, y: this.y, size, font, color: options.color ?? rgb(0.1, 0.16, 0.24) })
      this.y -= size + 4
    }
    this.y -= options.spacingAfter ?? 6
  }

  private addWrappedText(text: string, x: number, y: number, maxWidth: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>) {
    const lines = wrapText(text, font, size, maxWidth)
    let cursor = y
    for (const line of lines.slice(0, 3)) {
      this.page.drawText(line, { x, y: cursor, size, font, color })
      cursor -= size + 3
    }
  }

  private ensureSpace(required: number) {
    if (this.y - required < 56) this.newPage()
  }

  private newPage() {
    this.page = this.doc.addPage([this.width, this.height])
    this.y = this.height - this.margin
  }
}

function groupAssignments(tree: OrgChartTree) {
  const map = new Map<string, OrgChartTree['assignments']>()
  for (const assignment of tree.assignments) {
    const list = map.get(assignment.positionId) ?? []
    list.push(assignment)
    map.set(assignment.positionId, list)
  }
  return map
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/g).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next
    } else {
      if (line) lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.length > 0 ? lines : ['']
}

function hasMof(position: OrgChartTree['positions'][number]) {
  return Boolean(position.purpose && position.functions && position.responsibilities && position.requirements)
}

function indent(level: number) {
  return level > 0 ? `${'  '.repeat(level)}-> ` : ''
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

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function structureHealthLabel(health: 'excellent' | 'stable' | 'attention' | 'critical') {
  if (health === 'excellent') return 'Excelente'
  if (health === 'stable') return 'Estable'
  if (health === 'attention') return 'Atención'
  return 'Crítico'
}

function spanSeverityLabel(severity: 'healthy' | 'watch' | 'high' | 'critical') {
  if (severity === 'healthy') return 'Saludable'
  if (severity === 'watch') return 'Vigilar'
  if (severity === 'high') return 'Alto'
  return 'Crítico'
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatFileDate(date: Date) {
  return date.toISOString().slice(0, 10)
}
