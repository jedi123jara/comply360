/**
 * Libro Digital de Asistencia — R.M. 037-2024-TR (Anexo 1)
 *
 * Genera el PDF que SUNAFIL espera ver en una inspección. Cada empresa con
 * sistema digital de control de asistencia debe poder imprimir este formato
 * con: encabezado de empresa + período + un row por día con entrada/salida/
 * tardanza/justificación + totales del período.
 *
 * Reusa los helpers de src/lib/pdf/server-pdf.ts para mantener consistencia
 * visual con los demás PDFs del producto (diagnóstico, simulacro, contratos).
 */

import { addHeader } from '@/lib/pdf/server-pdf'
import { parseAttendanceNotes, deriveJustificationState } from '@/lib/attendance/notes'
import { formatOvertime } from '@/lib/attendance/overtime'

// Reusable jsPDF type — más permisivo que el de server-pdf para acomodar el
// API real de jsPDF que necesitamos acá (autoTable y splitTextToSize).
interface JsPDFInstance {
  setFontSize: (n: number) => JsPDFInstance
  setFont: (family: string, style?: string) => JsPDFInstance
  setTextColor: (r: number, g?: number, b?: number) => JsPDFInstance
  setFillColor: (r: number, g?: number, b?: number) => JsPDFInstance
  setDrawColor: (r: number, g?: number, b?: number) => JsPDFInstance
  text: (text: string | string[], x: number, y: number, options?: Record<string, unknown>) => JsPDFInstance
  rect: (x: number, y: number, w: number, h: number, style?: string) => JsPDFInstance
  line: (x1: number, y1: number, x2: number, y2: number) => JsPDFInstance
  addPage: () => JsPDFInstance
  output: (type: 'arraybuffer') => ArrayBuffer
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } }
  splitTextToSize: (text: string, maxWidth: number) => string[]
  getNumberOfPages: () => number
  setPage: (n: number) => void
}

export interface AttendanceReportInput {
  org: {
    name: string
    razonSocial: string | null
    ruc: string | null
  }
  worker: {
    firstName: string
    lastName: string
    dni: string | null
    position: string | null
    department: string | null
    fechaIngreso: Date
    expectedClockInHour: number
    expectedClockInMinute: number
    expectedClockOutHour: number
    expectedClockOutMinute: number
    lateToleranceMinutes: number
  }
  periodStart: Date
  periodEnd: Date
  records: {
    clockIn: Date
    clockOut: Date | null
    status: string
    hoursWorked: number | null
    isOvertime: boolean
    overtimeMinutes: number | null
    notes: string | null
  }[]
}

export interface AttendanceReportTotals {
  diasTrabajados: number
  diasTardanza: number
  diasAusente: number
  diasJustificadosPendientes: number
  diasJustificadosAprobados: number
  horasTotales: number
  horasExtrasMin: number
}

/**
 * Genera el PDF y devuelve el ArrayBuffer listo para enviar como response.
 * jsPDF se carga dinámicamente para evitar inflar el bundle del cliente.
 */
export async function generateAttendanceReportPDF(
  input: AttendanceReportInput,
): Promise<ArrayBuffer> {
  // Dynamic import para que el bundle del client no incluya jsPDF
  const jsPDF = (await import('jspdf')).default
  // El cast es porque el typing oficial de jsPDF es laxo
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' }) as unknown as JsPDFInstance

  const periodLabel = `${formatDate(input.periodStart)} – ${formatDate(input.periodEnd)}`
  const fullName = `${input.worker.firstName} ${input.worker.lastName}`.trim()

  addHeader(
    // El tipo de addHeader no matchea exactamente — pasamos via cast
    doc as unknown as Parameters<typeof addHeader>[0],
    'Libro Digital de Asistencia',
    input.org,
    `R.M. 037-2024-TR · Anexo 1 · ${fullName}`,
  )

  let y = 50

  // ── Bloque de identificación del trabajador ──────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(245, 248, 245)
  doc.rect(14, y, w - 28, 22, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(20, 20, 20)
  doc.text(fullName, 18, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  const subline = [
    input.worker.dni ? `DNI ${input.worker.dni}` : null,
    input.worker.position ?? null,
    input.worker.department ? `Área: ${input.worker.department}` : null,
  ].filter(Boolean).join('  ·  ')
  doc.text(subline || '—', 18, y + 11)
  doc.text(`Período del reporte: ${periodLabel}`, 18, y + 16)
  const horario = `Horario: ${pad2(input.worker.expectedClockInHour)}:${pad2(input.worker.expectedClockInMinute)} – ${pad2(input.worker.expectedClockOutHour)}:${pad2(input.worker.expectedClockOutMinute)} · Tolerancia: ${input.worker.lateToleranceMinutes} min`
  doc.text(horario, 18, y + 21)

  y += 30

  // ── Tabla de marcaciones ─────────────────────────────────────────────
  // Columnas: Fecha | Entrada | Salida | Horas | Tardanza | Estado | Justificación
  const cols = [
    { label: 'Fecha', width: 22 },
    { label: 'Entrada', width: 18 },
    { label: 'Salida', width: 18 },
    { label: 'Horas', width: 16 },
    { label: 'Extras', width: 18 },
    { label: 'Estado', width: 22 },
    { label: 'Justificación', width: 68 },
  ]
  const totalW = cols.reduce((s, c) => s + c.width, 0)
  const startX = (w - totalW) / 2

  // Header de tabla
  drawTableHeader(doc, startX, y, cols)
  y += 7

  const totals: AttendanceReportTotals = {
    diasTrabajados: 0,
    diasTardanza: 0,
    diasAusente: 0,
    diasJustificadosPendientes: 0,
    diasJustificadosAprobados: 0,
    horasTotales: 0,
    horasExtrasMin: 0,
  }

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 40)

  for (const r of input.records) {
    if (y > 270) {
      doc.addPage()
      y = 20
      drawTableHeader(doc, startX, y, cols)
      y += 7
    }

    const meta = parseAttendanceNotes(r.notes)
    const justState = deriveJustificationState(r.status, meta)
    const isApproved = justState === 'approved'
    const isPending = justState === 'pending-justification' || justState === 'pending-approval'

    // Sumar a totales
    if (r.status === 'PRESENT' || r.status === 'LATE') totals.diasTrabajados++
    if (r.status === 'LATE') totals.diasTardanza++
    if (r.status === 'ABSENT') totals.diasAusente++
    if (isPending) totals.diasJustificadosPendientes++
    if (isApproved) totals.diasJustificadosAprobados++
    if (r.hoursWorked) totals.horasTotales += r.hoursWorked
    if (r.overtimeMinutes) totals.horasExtrasMin += r.overtimeMinutes

    const fecha = formatDate(r.clockIn)
    const entrada = formatTime(r.clockIn)
    const salida = r.clockOut ? formatTime(r.clockOut) : '—'
    const horas = r.hoursWorked ? `${r.hoursWorked.toFixed(1)}h` : '—'
    const extras = r.isOvertime && r.overtimeMinutes ? formatOvertime(r.overtimeMinutes) : '—'
    const estado = labelStatus(r.status)
    const justText = formatJustification(meta, justState)

    // Color de fila según estado
    if (r.status === 'LATE') doc.setFillColor(255, 247, 230)
    else if (r.status === 'ABSENT') doc.setFillColor(254, 242, 242)
    else doc.setFillColor(255, 255, 255)
    doc.rect(startX, y - 4, totalW, 6, 'F')

    // Línea divisoria
    doc.setDrawColor(220, 220, 220)
    doc.line(startX, y + 2, startX + totalW, y + 2)

    let x = startX + 2
    doc.setTextColor(40, 40, 40)
    doc.text(fecha, x, y); x += cols[0]!.width
    doc.text(entrada, x, y); x += cols[1]!.width
    doc.text(salida, x, y); x += cols[2]!.width
    doc.text(horas, x, y); x += cols[3]!.width
    if (r.isOvertime) doc.setTextColor(180, 100, 0)
    doc.text(extras, x, y); x += cols[4]!.width
    if (r.status === 'LATE') doc.setTextColor(180, 100, 0)
    else if (r.status === 'ABSENT') doc.setTextColor(180, 30, 30)
    else doc.setTextColor(40, 40, 40)
    doc.text(estado, x, y); x += cols[5]!.width
    doc.setTextColor(40, 40, 40)
    const justLines = doc.splitTextToSize(justText, cols[6]!.width - 2)
    doc.text(justLines.slice(0, 1).join(''), x, y)

    y += 6
  }

  // ── Totales del período ──────────────────────────────────────────────
  if (y > 250) {
    doc.addPage()
    y = 20
  } else {
    y += 4
  }
  doc.setDrawColor(180, 180, 180)
  doc.line(startX, y, startX + totalW, y)
  y += 6

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)
  doc.text('Resumen del período', startX, y)
  y += 6

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  const lines = [
    `Días trabajados: ${totals.diasTrabajados}`,
    `Tardanzas: ${totals.diasTardanza}`,
    `Ausencias: ${totals.diasAusente}`,
    `Justificaciones pendientes: ${totals.diasJustificadosPendientes}`,
    `Justificaciones aprobadas: ${totals.diasJustificadosAprobados}`,
    `Horas totales trabajadas: ${totals.horasTotales.toFixed(1)}h`,
    `Horas extras acumuladas: ${formatOvertime(totals.horasExtrasMin)}`,
  ]
  for (const line of lines) {
    doc.text(line, startX, y)
    y += 5
  }

  // ── Pie legal ──────────────────────────────────────────────────────────
  if (y > 265) {
    doc.addPage()
    y = 20
  } else {
    y += 6
  }
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  const legal = doc.splitTextToSize(
    'Documento generado automáticamente por Comply360 Perú a partir del control digital de asistencia. ' +
    'Cumple con la R.M. 037-2024-TR (control digital del tiempo de trabajo) y la Ley 27269 ' +
    '(firma electrónica). Las marcaciones aquí registradas tienen valor probatorio ante SUNAFIL ' +
    'siempre que vayan acompañadas del audit trail criptográfico (IP, dispositivo, geolocalización, ' +
    'hash de selfie) que puede consultarse en el panel administrativo.',
    totalW,
  )
  for (const line of legal) {
    doc.text(line, startX, y)
    y += 3.5
  }

  // ── Numeración de páginas ─────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Página ${i} / ${totalPages}`, w - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' })
  }

  return doc.output('arraybuffer')
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function drawTableHeader(
  doc: JsPDFInstance,
  startX: number,
  y: number,
  cols: { label: string; width: number }[],
) {
  const totalW = cols.reduce((s, c) => s + c.width, 0)
  doc.setFillColor(30, 58, 110)
  doc.rect(startX, y - 4, totalW, 6, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  let x = startX + 2
  for (const c of cols) {
    doc.text(c.label, x, y)
    x += c.width
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function labelStatus(status: string): string {
  switch (status) {
    case 'PRESENT': return 'Presente'
    case 'LATE': return 'Tardanza'
    case 'ABSENT': return 'Ausente'
    case 'ON_LEAVE': return 'Permiso'
    default: return status
  }
}

function formatJustification(
  meta: ReturnType<typeof parseAttendanceNotes>,
  state: ReturnType<typeof deriveJustificationState>,
): string {
  if (state === 'no-applicable') return ''
  if (state === 'pending-justification') return 'Pendiente de reportar motivo'
  if (state === 'pending-approval') return `Reportado: "${(meta.justification?.reason ?? '').slice(0, 80)}"`
  if (state === 'approved') {
    const by = meta.approval?.byName ? ` por ${meta.approval.byName}` : ''
    return `Aprobada${by} — ${(meta.justification?.reason ?? '').slice(0, 60)}`
  }
  if (state === 'rejected') return 'Rechazada por admin'
  return ''
}
