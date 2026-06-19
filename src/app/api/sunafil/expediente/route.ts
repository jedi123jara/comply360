import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import JSZip from 'jszip'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { scanOrgRisks, type OrgRiskReport, type RiesgoDetectado } from '@/lib/compliance/risk-scanner'
import { evaluateLaborRisk, type LaborRiskSnapshot } from '@/lib/compliance/labor-risk-engine'
import { formatSoles } from '@/lib/format/peruvian'
import {
  addHeader,
  addPageNumbers,
  checkPageBreak,
  createPDFDoc,
  drawTable,
  kv,
  pdfResponse,
  sectionTitle,
  type JsPDFDoc,
} from '@/lib/pdf/server-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  RELACIONES_LABORALES: 'Relaciones laborales',
  SST: 'Seguridad y salud',
  SEGURIDAD_SOCIAL: 'Seguridad social',
  EMPLEO_COLOCACION: 'Empleo y colocacion',
  REMUNERACIONES: 'Remuneraciones',
  JORNADA_DESCANSO: 'Jornada y descanso',
  DOCUMENTOS_REGISTROS: 'Documentos y registros',
  IGUALDAD: 'Igualdad y no discriminacion',
  MODALIDADES_FORMATIVAS: 'Modalidades formativas',
}

type OrgInfo = NonNullable<Awaited<ReturnType<typeof loadOrganization>>>
type SunafilTask = Awaited<ReturnType<typeof loadSunafilTasks>>[number]

interface ExpedienteData {
  org: OrgInfo
  report: OrgRiskReport
  snapshot: LaborRiskSnapshot
  tasks: SunafilTask[]
  taskBySourceId: Map<string, SunafilTask>
  generatedAt: Date
}

export const GET = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const format = req.nextUrl.searchParams.get('format') === 'zip' ? 'zip' : 'pdf'
    const data = await buildExpedienteData(ctx.orgId)
    const filenameBase = buildFilenameBase(data.org)
    const pdf = await buildExpedientePdf(data)

    if (format === 'zip') {
      const zipBuffer = await buildExpedienteZip(data, pdf.buffer, filenameBase)
      const filename = `${filenameBase}-expediente-sunafil.zip`
      await recordExpedienteExport(ctx, data, 'zip', filename, pdf.buffer, zipBuffer)
      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(zipBuffer.byteLength),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    const filename = `${filenameBase}-expediente-sunafil.pdf`
    await recordExpedienteExport(ctx, data, 'pdf', filename, pdf.buffer)
    return pdfResponse(pdf.buffer, filename)
  } catch (error) {
    console.error('[sunafil expediente]', error)
    return NextResponse.json(
      { error: 'No se pudo generar el expediente SUNAFIL.' },
      { status: 500 },
    )
  }
})

async function loadOrganization(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      razonSocial: true,
      ruc: true,
      sector: true,
      sizeRange: true,
      regimenPrincipal: true,
    },
  })
}

async function loadSunafilTasks(orgId: string, sourceIds: string[]) {
  if (sourceIds.length === 0) return []
  return prisma.complianceTask.findMany({
    where: {
      orgId,
      sourceId: { in: sourceIds },
    },
    include: {
      evidences: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: [
      { priority: 'asc' },
      { updatedAt: 'desc' },
    ],
    take: 300,
  })
}

async function buildExpedienteData(orgId: string): Promise<ExpedienteData> {
  const [report, snapshot] = await Promise.all([
    scanOrgRisks(orgId),
    evaluateLaborRisk(orgId, { mode: 'inspection' }),
  ])
  const sourceIds = uniqueStrings([
    ...report.riesgos.map(sourceIdForRisk),
    ...snapshot.findings.map((finding) => `labor-risk:${finding.id}`),
    ...snapshot.evidenceRequirements.map((requirement) => `labor-risk:evidence:${requirement.id}`),
  ])
  const [org, tasks] = await Promise.all([
    loadOrganization(orgId),
    loadSunafilTasks(orgId, sourceIds),
  ])

  if (!org) {
    throw new Error('Organizacion no encontrada')
  }

  const taskBySourceId = new Map<string, SunafilTask>()
  for (const task of tasks) {
    if (task.sourceId && !taskBySourceId.has(task.sourceId)) {
      taskBySourceId.set(task.sourceId, task)
    }
  }

  return {
    org,
    report,
    snapshot,
    tasks,
    taskBySourceId,
    generatedAt: new Date(),
  }
}

async function buildExpedientePdf(data: ExpedienteData): Promise<{ buffer: ArrayBuffer }> {
  const doc = await createPDFDoc()
  const headerArgs = {
    title: 'Expediente SUNAFIL',
    org: { name: data.org.name, razonSocial: data.org.razonSocial, ruc: data.org.ruc },
    subtitle: 'Riesgos, subsanacion y evidencias',
  }

  addHeader(doc, headerArgs.title, headerArgs.org, headerArgs.subtitle)
  let y = 56

  y = sectionTitle(doc, 'Resumen ejecutivo', y)
  y = kv(doc, 'Empresa', data.org.razonSocial ?? data.org.name, 14, y)
  if (data.org.ruc) y = kv(doc, 'RUC', data.org.ruc, 14, y)
  y = kv(doc, 'Fecha de expediente', formatDateTime(data.generatedAt), 14, y)
  y = kv(doc, 'Trabajadores evaluados', String(data.report.totalTrabajadores), 14, y)
  y = kv(doc, 'Tipo SUNAFIL', data.report.tipoEmpresa, 14, y)
  if (data.org.sector) y = kv(doc, 'Sector', data.org.sector, 14, y)
  y += 2

  y = drawExposureBand(doc, data, y)
  y += 6

  y = checkPageBreak(doc, y, 190, headerArgs)
  y = sectionTitle(doc, 'Estado documental del expediente', y)
  const status = summarizeTasks(data)
  const statusRows = [
    ['Brechas detectadas', String(data.snapshot.findings.length), 'Hallazgos activos del motor canonico'],
    ['Docs SUNAFIL incompletos', String(data.snapshot.inspectionPack.incompleteDocs), 'Evidencia faltante, parcial o vencida'],
    ['Tareas creadas', String(data.tasks.length), 'Brechas que ya tienen responsable o seguimiento'],
    ['En subsanacion', String(status.inProgress), 'Tareas abiertas con avance documentado'],
    ['Cerradas con evidencia', String(status.completed), 'Tareas listas para sustento inspectivo'],
    ['Con evidencia cargada', String(status.withEvidence), `${status.evidenceCount} archivo(s) asociados al expediente`],
    ['Version exportada', `${expedienteScore(data)}%`, 'Snapshot guardado en historial de exportaciones'],
  ]
  y = drawTable(doc, [
    { header: 'Indicador', x: 14 },
    { header: 'Valor', x: 80 },
    { header: 'Lectura', x: 110 },
  ], statusRows, y, { headerArgs, rowHeight: 7, zebraFill: true })
  y += 8

  y = checkPageBreak(doc, y, 170, headerArgs)
  y = sectionTitle(doc, `Evidencia SUNAFIL-Ready priorizada (${Math.min(data.snapshot.evidenceRequirements.length, 18)} de ${data.snapshot.evidenceRequirements.length})`, y)
  if (data.snapshot.evidenceRequirements.length > 0) {
    const rows = data.snapshot.evidenceRequirements.slice(0, 18).map((requirement, index) => {
      const task = data.taskBySourceId.get(`labor-risk:evidence:${requirement.id}`)
      return [
        String(index + 1),
        truncate(requirement.title, 44),
        requirement.status,
        requirement.coverage.total > 0 ? `${requirement.coverage.present}/${requirement.coverage.total}` : 'Empresa',
        formatSolesCompact(requirement.potentialFineSoles),
        task ? `${taskStatusLabel(task.status)} · ${taskEvidenceCount(task)} ev.` : 'Sin tarea',
      ]
    })
    y = drawTable(doc, [
      { header: '#', x: 14 },
      { header: 'Documento', x: 22 },
      { header: 'Estado', x: 94 },
      { header: 'Cob.', x: 122 },
      { header: 'Multa', x: 144 },
      { header: 'Tarea', x: 170 },
    ], rows, y, { headerArgs, rowHeight: 6.5, fontSize: 7, zebraFill: true })
  } else {
    doc.setFontSize(9)
    doc.text('No hay documentos SUNAFIL-Ready incompletos segun la evidencia disponible.', 14, y)
    y += 8
  }
  y += 8

  y = checkPageBreak(doc, y, 170, headerArgs)
  y = sectionTitle(doc, `Brechas priorizadas (${Math.min(data.report.riesgos.length, 25)} de ${data.report.riesgos.length})`, y)
  if (data.report.riesgos.length > 0) {
    const rows = data.report.riesgos.slice(0, 25).map((risk, index) => {
      const task = taskForRisk(data, risk)
      return [
        String(index + 1),
        truncate(risk.infraccion.codigo, 15),
        truncate(risk.infraccion.titulo, 42),
        severityLabel(risk.infraccion.severidad),
        formatSolesCompact(risk.multaEstimadaSoles),
        task ? `${taskStatusLabel(task.status)} · ${taskEvidenceCount(task)} ev.` : 'Sin tarea',
      ]
    })
    y = drawTable(doc, [
      { header: '#', x: 14 },
      { header: 'Codigo', x: 22 },
      { header: 'Hallazgo', x: 48 },
      { header: 'Grav.', x: 126 },
      { header: 'Multa', x: 148 },
      { header: 'Estado', x: 174 },
    ], rows, y, { headerArgs, rowHeight: 6.4, fontSize: 7.2, zebraFill: true })
  } else {
    doc.setFontSize(9)
    doc.text('No se detectaron brechas SUNAFIL en el ultimo escaneo.', 14, y)
    y += 8
  }
  y += 8

  y = checkPageBreak(doc, y, 170, headerArgs)
  y = sectionTitle(doc, 'Plan de subsanacion y trazabilidad', y)
  const planRows = data.report.riesgos.slice(0, 18).map((risk, index) => {
    const task = taskForRisk(data, risk)
    const dueDate = task?.dueDate ? formatDate(task.dueDate) : suggestedDueDate(risk)
    return [
      String(index + 1),
      truncate(CATEGORY_LABELS[risk.infraccion.categoria] ?? risk.infraccion.categoria, 28),
      truncate(risk.accionInmediata, 58),
      dueDate,
      task ? evidenceLabel(task) : 'Pendiente',
    ]
  })
  if (planRows.length > 0) {
    y = drawTable(doc, [
      { header: '#', x: 14 },
      { header: 'Area', x: 22 },
      { header: 'Accion inmediata', x: 66 },
      { header: 'Plazo', x: 150 },
      { header: 'Evid.', x: 176 },
    ], planRows, y, { headerArgs, rowHeight: 6.8, fontSize: 7, zebraFill: true })
  } else {
    doc.setFontSize(9)
    doc.text('Sin plan de subsanacion pendiente.', 14, y)
    y += 8
  }
  y += 8

  y = checkPageBreak(doc, y, 155, headerArgs)
  y = sectionTitle(doc, 'Bitacora y evidencias cargadas', y)
  const evidenceTasks = data.tasks.filter((task) => task.notes || taskHasEvidence(task) || task.completedAt)
  if (evidenceTasks.length > 0) {
    for (const task of evidenceTasks.slice(0, 18)) {
      y = checkPageBreak(doc, y, 252, headerArgs)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 58, 110)
      doc.text(truncate(task.title, 92), 14, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      y += 4
      doc.text(`Estado: ${taskStatusLabel(task.status)} | Actualizado: ${formatDate(task.updatedAt)}`, 14, y)
      y += 4
      const taskEvidences = taskEvidenceItems(task)
      if (taskEvidences.length > 0) {
        doc.text(`Evidencias registradas: ${taskEvidences.length}`, 14, y)
        y += 4
        for (const evidence of taskEvidences.slice(0, 3)) {
          doc.text(`- ${truncate(evidence.title || evidence.fileName || evidence.fileUrl, 115)}`, 18, y)
          y += 4
        }
      }
      if (task.notes) {
        const notes = doc.splitTextToSize(`Bitacora: ${task.notes}`, 176)
        doc.text(notes.slice(0, 3), 14, y)
        y += Math.min(notes.length, 3) * 4
      }
      doc.setDrawColor(230, 230, 230)
      doc.line(14, y + 1, 196, y + 1)
      y += 6
    }
  } else {
    doc.setFontSize(9)
    doc.text('Aun no hay bitacoras o evidencias cargadas para estas brechas.', 14, y)
    y += 8
  }

  y = checkPageBreak(doc, y, 230, headerArgs)
  y = sectionTitle(doc, 'Nota de uso inspectivo', y)
  doc.setFontSize(8)
  doc.setTextColor(70, 70, 70)
  const disclaimer = [
    'Este expediente consolida informacion interna generada por COMPLY360 para preparar una fiscalizacion laboral.',
    'No sustituye la evaluacion legal del caso concreto ni la presentacion formal ante SUNAFIL, MTPE u otra autoridad.',
    'Los montos son estimaciones referenciales con base en la informacion registrada en la plataforma y deben revisarse antes de cualquier descargo.',
  ]
  doc.text(doc.splitTextToSize(disclaimer.join(' '), 176), 14, y)

  addPageNumbers(doc)
  return { buffer: doc.output('arraybuffer') }
}

async function recordExpedienteExport(
  ctx: AuthContext,
  data: ExpedienteData,
  format: 'pdf' | 'zip',
  filename: string,
  pdfBuffer: ArrayBuffer,
  zipBuffer?: Buffer,
) {
  try {
    await prisma.sunafilExpedienteExport.create({
      data: {
        orgId: ctx.orgId,
        format,
        filename,
        score: expedienteScore(data),
        totalRisks: data.snapshot.findings.length + data.snapshot.evidenceRequirements.length,
        tasksCount: data.tasks.length,
        evidenceCount: summarizeTasks(data).evidenceCount,
        pdfHashSha256: hashBuffer(pdfBuffer),
        zipHashSha256: zipBuffer ? hashBuffer(zipBuffer) : null,
        manifest: buildManifest(data) as unknown as Prisma.InputJsonValue,
        createdBy: ctx.userId,
      },
    })
  } catch (error) {
    console.warn('[sunafil expediente export history]', error)
  }
}

function drawExposureBand(doc: JsPDFDoc, data: ExpedienteData, y: number): number {
  const cards = [
    { label: 'Exposicion estimada', value: formatSoles(data.snapshot.exposure.potentialFineSoles), color: [239, 68, 68] as const },
    { label: 'Ahorro por subsanar', value: formatSoles(data.snapshot.exposure.avoidableAmountSoles), color: [34, 197, 94] as const },
    { label: 'SUNAFIL-Ready', value: `${data.snapshot.inspectionPack.readinessScore}/100`, color: [6, 182, 212] as const },
  ]

  const xPositions = [14, 76, 138]
  for (let index = 0; index < cards.length; index++) {
    const card = cards[index]
    const [red, green, blue] = card.color
    doc.setFillColor(245, 247, 250)
    doc.rect(xPositions[index], y, 56, 22, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text(card.label, xPositions[index] + 3, y + 6)
    doc.setFontSize(9)
    doc.setTextColor(red, green, blue)
    doc.text(truncate(card.value, 30), xPositions[index] + 3, y + 14)
    doc.setFont('helvetica', 'normal')
  }

  doc.setTextColor(60, 60, 60)
  return y + 26
}

async function buildExpedienteZip(data: ExpedienteData, pdfBuffer: ArrayBuffer, filenameBase: string) {
  const zip = new JSZip()
  zip.file(`${filenameBase}-expediente-sunafil.pdf`, Buffer.from(pdfBuffer))
  zip.file('manifest.json', JSON.stringify(buildManifest(data), null, 2))
  zip.file('brechas.csv', rowsToCsv(buildRiskRows(data)))
  zip.file('evidencia-sunafil-ready.csv', rowsToCsv(buildSunafilReadyRows(data)))
  zip.file('tareas.csv', rowsToCsv(buildTaskRows(data)))
  zip.file('evidencias.csv', rowsToCsv(buildEvidenceRows(data)))
  zip.file('README.txt', buildReadme(data))
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

function buildManifest(data: ExpedienteData) {
  const status = summarizeTasks(data)
  return {
    generatedAt: data.generatedAt.toISOString(),
    organization: {
      id: data.org.id,
      name: data.org.name,
      razonSocial: data.org.razonSocial,
      ruc: data.org.ruc,
      sector: data.org.sector,
      sizeRange: data.org.sizeRange,
      regimenPrincipal: data.org.regimenPrincipal,
    },
    scan: {
      scanDate: data.report.scanDate.toISOString(),
      tipoEmpresa: data.report.tipoEmpresa,
      totalTrabajadores: data.report.totalTrabajadores,
      totalRiesgos: data.report.riesgos.length,
      totalMultaSoles: data.report.totalMultaSoles,
      totalMultaConSubsanacionSoles: data.report.totalMultaConSubsanacionSoles,
      ahorroTotalSoles: data.report.ahorroTotalSoles,
      resumen: {
        muyGraves: data.report.resumen.muyGraves,
        graves: data.report.resumen.graves,
        leves: data.report.resumen.leves,
        areasMasRiesgosas: data.report.resumen.areasMasRiesgosas,
      },
    },
    laborRisk: {
      calculatedAt: data.snapshot.calculatedAt,
      score: data.snapshot.score,
      exposure: data.snapshot.exposure,
      defense: data.snapshot.defense,
      inspectionPack: {
        readinessScore: data.snapshot.inspectionPack.readinessScore,
        totalDocs: data.snapshot.inspectionPack.totalDocs,
        applicableDocs: data.snapshot.inspectionPack.applicableDocs,
        incompleteDocs: data.snapshot.inspectionPack.incompleteDocs,
        missingCriticalDocs: data.snapshot.inspectionPack.missingCriticalDocs,
        potentialFineSoles: data.snapshot.inspectionPack.potentialFineSoles,
        avoidableAmountSoles: data.snapshot.inspectionPack.avoidableAmountSoles,
      },
      topActions: data.snapshot.nextActions,
    },
    expediente: status,
  }
}

function buildRiskRows(data: ExpedienteData): string[][] {
  return [
    ['orden', 'codigo', 'categoria', 'gravedad', 'titulo', 'base_legal', 'multa_estimada_soles', 'multa_post_subsanacion_soles', 'ahorro_subsanacion_soles', 'urgencia', 'estado_tarea', 'evidencias'],
    ...data.report.riesgos.map((risk, index) => {
      const task = taskForRisk(data, risk)
      return [
        String(index + 1),
        risk.infraccion.codigo,
        CATEGORY_LABELS[risk.infraccion.categoria] ?? risk.infraccion.categoria,
        severityLabel(risk.infraccion.severidad),
        risk.infraccion.titulo,
        risk.infraccion.baseLegal,
        String(risk.multaEstimadaSoles),
        String(risk.multaConSubsanacionSoles),
        String(risk.ahorroSubsanacion),
        String(risk.urgencia),
        task ? taskStatusLabel(task.status) : 'Sin tarea',
        task ? String(taskEvidenceCount(task)) : '0',
      ]
    }),
  ]
}

function buildSunafilReadyRows(data: ExpedienteData): string[][] {
  return [
    ['orden', 'documento_id', 'documento', 'categoria', 'estado', 'gravedad', 'base_legal', 'cobertura', 'multa_estimada_soles', 'ahorro_subsanacion_soles', 'accion', 'ruta', 'estado_tarea', 'evidencias'],
    ...data.snapshot.evidenceRequirements.map((requirement, index) => {
      const task = data.taskBySourceId.get(`labor-risk:evidence:${requirement.id}`)
      return [
        String(index + 1),
        requirement.id,
        requirement.title,
        requirement.categoryLabel,
        requirement.status,
        requirement.gravity,
        requirement.baseLegal,
        requirement.coverage.total > 0 ? `${requirement.coverage.present}/${requirement.coverage.total}` : 'empresa',
        String(requirement.potentialFineSoles),
        String(requirement.avoidableAmountSoles),
        requirement.actionHint,
        requirement.route,
        task ? taskStatusLabel(task.status) : 'Sin tarea',
        task ? String(taskEvidenceCount(task)) : '0',
      ]
    }),
  ]
}

function buildTaskRows(data: ExpedienteData): string[][] {
  return [
    ['id', 'source_id', 'estado', 'prioridad', 'area', 'titulo', 'base_legal', 'multa_evitable', 'plazo_sugerido', 'fecha_objetivo', 'responsable', 'fecha_cierre', 'evidencias', 'notas'],
    ...data.tasks.map((task) => [
      task.id,
      task.sourceId ?? '',
      taskStatusLabel(task.status),
      String(task.priority),
      task.area,
      task.title,
      task.baseLegal ?? '',
      task.multaEvitable ? String(Number(task.multaEvitable)) : '',
      task.plazoSugerido ?? '',
      task.dueDate ? task.dueDate.toISOString() : '',
      task.assignedTo ?? '',
      task.completedAt ? task.completedAt.toISOString() : '',
      String(taskEvidenceCount(task)),
      task.notes ?? '',
    ]),
  ]
}

function buildEvidenceRows(data: ExpedienteData): string[][] {
  return [
    ['evidence_id', 'task_id', 'source_id', 'titulo_tarea', 'estado', 'titulo_evidencia', 'archivo', 'url', 'mime_type', 'size_bytes', 'hash_sha256', 'uploaded_by', 'created_at', 'notes'],
    ...data.tasks.flatMap((task) =>
      taskEvidenceItems(task).map((evidence) => [
        evidence.id,
        task.id,
        task.sourceId ?? '',
        task.title,
        taskStatusLabel(task.status),
        evidence.title ?? '',
        evidence.fileName ?? '',
        evidence.fileUrl,
        evidence.mimeType ?? '',
        evidence.sizeBytes ? String(evidence.sizeBytes) : '',
        evidence.hashSha256 ?? '',
        evidence.uploadedBy ?? '',
        evidence.createdAt.toISOString(),
        evidence.notes ?? '',
      ]),
    ),
  ]
}

function buildReadme(data: ExpedienteData) {
  return [
    'EXPEDIENTE SUNAFIL - COMPLY360',
    '',
    `Empresa: ${data.org.razonSocial ?? data.org.name}`,
    data.org.ruc ? `RUC: ${data.org.ruc}` : null,
    `Generado: ${formatDateTime(data.generatedAt)}`,
    '',
    'Contenido:',
    '- PDF: resumen ejecutivo, brechas, plan y bitacora.',
    '- manifest.json: metadatos del escaneo y del expediente.',
    '- brechas.csv: matriz exportable de hallazgos SUNAFIL.',
    '- evidencia-sunafil-ready.csv: documentos faltantes, parciales o vencidos.',
    '- tareas.csv: tareas de subsanacion vinculadas.',
    '- evidencias.csv: enlaces de evidencia cargada.',
    '- Historial interno: cada export queda versionado con hash SHA-256.',
    '',
    'Uso recomendado:',
    '1. Revisar el PDF con gerencia/RRHH/legal antes de responder una fiscalizacion.',
    '2. Completar tareas sin evidencia y volver a exportar el expediente.',
    '3. Adjuntar archivos originales cuando el inspector o asesor lo solicite.',
  ].filter(Boolean).join('\n')
}

function summarizeTasks(data: ExpedienteData) {
  const tasks = data.tasks
  return {
    pending: tasks.filter((task) => task.status === 'PENDING').length,
    inProgress: tasks.filter((task) => task.status === 'IN_PROGRESS').length,
    completed: tasks.filter((task) => task.status === 'COMPLETED').length,
    dismissed: tasks.filter((task) => task.status === 'DISMISSED').length,
    withEvidence: tasks.filter(taskHasEvidence).length,
    evidenceCount: tasks.reduce((total, task) => total + taskEvidenceCount(task), 0),
    withoutTask:
      data.report.riesgos.filter((risk) => !taskForRisk(data, risk)).length +
      data.snapshot.evidenceRequirements.filter((requirement) => !data.taskBySourceId.has(`labor-risk:evidence:${requirement.id}`)).length,
  }
}

function expedienteScore(data: ExpedienteData) {
  if (data.report.riesgos.length === 0) return 100
  const total = data.report.riesgos.reduce((sum, risk) => {
    const task = taskForRisk(data, risk)
    if (!task) return sum + 20
    if (task.status === 'COMPLETED') return sum + (taskHasEvidence(task) ? 100 : 75)
    if (task.status === 'DISMISSED') return sum + (taskHasEvidence(task) || task.notes ? 90 : 70)
    if (taskHasEvidence(task)) return sum + 82
    if (task.status === 'IN_PROGRESS') return sum + 62
    return sum + 42
  }, 0)
  return Math.round(total / data.report.riesgos.length)
}

function taskEvidenceItems(task: SunafilTask) {
  if (task.evidences.length > 0) return task.evidences
  if (!task.evidenceUrl) return []
  return [{
    id: `${task.id}-legacy-evidence`,
    orgId: task.orgId,
    taskId: task.id,
    sourceId: task.sourceId,
    title: 'Evidencia registrada',
    fileName: null,
    fileUrl: task.evidenceUrl,
    storagePath: null,
    bucket: null,
    mimeType: null,
    sizeBytes: null,
    hashSha256: null,
    notes: null,
    uploadedBy: null,
    createdAt: task.completedAt ?? task.updatedAt,
    updatedAt: task.completedAt ?? task.updatedAt,
  }]
}

function taskEvidenceCount(task: SunafilTask) {
  return taskEvidenceItems(task).length
}

function taskHasEvidence(task: SunafilTask) {
  return taskEvidenceCount(task) > 0
}

function normalizeSourcePart(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
}

function sourceIdForRisk(risk: RiesgoDetectado) {
  return `sunafil-gap:${risk.infraccion.codigo}:${normalizeSourcePart(risk.infraccion.titulo)}`
}

function taskForRisk(data: ExpedienteData, risk: RiesgoDetectado) {
  return data.taskBySourceId.get(`labor-risk:${risk.infraccion.codigo}`) ?? data.taskBySourceId.get(sourceIdForRisk(risk))
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)]
}

function severityLabel(value: string) {
  return value.replace('_', ' ')
}

function taskStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En subsanacion',
    COMPLETED: 'Cerrada con evidencia',
    DISMISSED: 'Descartada',
  }
  return labels[status] ?? status
}

function evidenceLabel(task: SunafilTask) {
  const count = taskEvidenceCount(task)
  if (count > 0) return `${count} evidencia(s)`
  if (task.status === 'COMPLETED') return 'Cierre sin link'
  if (task.status === 'DISMISSED') return 'No aplica'
  return 'Pendiente'
}

function suggestedDueDate(risk: RiesgoDetectado) {
  const days = risk.infraccion.severidad === 'MUY_GRAVE' ? 7 : risk.infraccion.severidad === 'GRAVE' ? 30 : 60
  const date = new Date()
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSolesCompact(value: number) {
  return `S/ ${Math.round(value).toLocaleString('en-US')}`
}

function truncate(value: string | null | undefined, max: number) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 3))}...`
}

function rowsToCsv(rows: string[][]) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n')
}

function csvEscape(value: string) {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ')
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function hashBuffer(value: ArrayBuffer | Buffer) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(new Uint8Array(value))

  return createHash('sha256').update(buffer).digest('hex')
}

function buildFilenameBase(org: OrgInfo) {
  const raw = org.ruc || org.razonSocial || org.name || 'empresa'
  return normalizeSourcePart(raw).slice(0, 60) || 'empresa'
}
