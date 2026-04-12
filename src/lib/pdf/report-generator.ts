/**
 * Client-side PDF report generator using jsPDF.
 * Called from the browser after fetching report data from /api/reports/generate.
 */

// jsPDF is imported dynamically to keep it out of server-side bundles
type JsPDFInstance = {
  setFontSize: (n: number) => JsPDFInstance
  setFont: (family: string, style?: string) => JsPDFInstance
  setTextColor: (r: number, g?: number, b?: number) => JsPDFInstance
  setFillColor: (r: number, g?: number, b?: number) => JsPDFInstance
  setDrawColor: (r: number, g?: number, b?: number) => JsPDFInstance
  text: (text: string | string[], x: number, y: number, options?: Record<string, unknown>) => JsPDFInstance
  rect: (x: number, y: number, w: number, h: number, style?: string) => JsPDFInstance
  line: (x1: number, y1: number, x2: number, y2: number) => JsPDFInstance
  addPage: () => JsPDFInstance
  save: (filename: string) => void
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } }
  getNumberOfPages: () => number
  setPage: (n: number) => void
}

const BRAND_BLUE = [30, 58, 110] as const
const BRAND_LIGHT = [240, 245, 255] as const

const REPORT_TITLES: Record<string, string> = {
  ejecutivo: 'Reporte Ejecutivo de Compliance',
  sunafil: 'Reporte SUNAFIL-Ready',
  sst: 'Reporte SST Anual',
  nomina: 'Reporte de Nomina y Beneficios',
  contratos: 'Reporte de Contratos',
  denuncias: 'Reporte Canal de Denuncias',
}

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', IN_REVIEW: 'En Revision', APPROVED: 'Aprobado',
  SIGNED: 'Firmado', EXPIRED: 'Vencido', ARCHIVED: 'Archivado',
}

const CALC_LABELS: Record<string, string> = {
  LIQUIDACION: 'Liquidacion', CTS: 'CTS', GRATIFICACION: 'Gratificacion',
  INDEMNIZACION: 'Indemnizacion', HORAS_EXTRAS: 'Horas Extras', VACACIONES: 'Vacaciones',
  MULTA_SUNAFIL: 'Multa SUNAFIL', INTERESES_LEGALES: 'Intereses Legales',
  APORTES_PREVISIONALES: 'Aportes Previsionales', UTILIDADES: 'Utilidades',
}

function addHeader(doc: JsPDFInstance, title: string, org: { name?: string; razonSocial?: string | null; ruc?: string | null }, period: string) {
  const w = doc.internal.pageSize.getWidth()

  // Header bar
  doc.setFillColor(...BRAND_BLUE)
  doc.rect(0, 0, w, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('COMPLY360', 14, 11)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Compliance Laboral - Peru', 14, 18)

  doc.setFontSize(8)
  doc.text(period, w - 14, 11, { align: 'right' })
  doc.text(org.razonSocial ?? org.name ?? '', w - 14, 18, { align: 'right' })
  if (org.ruc) doc.text(`RUC: ${org.ruc}`, w - 14, 24, { align: 'right' })

  // Title row
  doc.setFillColor(...BRAND_LIGHT)
  doc.rect(0, 28, w, 16, 'F')
  doc.setTextColor(...BRAND_BLUE)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 39)

  doc.setTextColor(100, 100, 100)
}

function addPageNumbers(doc: JsPDFInstance) {
  const total = doc.getNumberOfPages()
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Pagina ${i} de ${total}  •  Generado por COMPLY360  •  ${new Date().toLocaleDateString('es-PE')}`, w / 2, h - 8, { align: 'center' })
  }
}

function sectionTitle(doc: JsPDFInstance, text: string, y: number): number {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(245, 247, 250)
  doc.rect(14, y - 4, w - 28, 10, 'F')
  doc.setTextColor(...BRAND_BLUE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(text, 16, y + 2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  return y + 12
}

function kv(doc: JsPDFInstance, label: string, value: string, x: number, y: number): number {
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text(label + ':', x, y)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.text(value, x + 45, y)
  doc.setFont('helvetica', 'normal')
  return y + 6
}

type ReportPayload = {
  type: string
  period: { start: string; end: string }
  org: { name?: string; razonSocial?: string | null; ruc?: string | null; sector?: string | null; plan?: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
}

export async function generatePDF(payload: ReportPayload): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as unknown as JsPDFInstance

  const { type, period, org, data } = payload
  const title = REPORT_TITLES[type] ?? 'Reporte'
  const periodStr = `${period.start ?? ''} — ${period.end ?? ''}`

  addHeader(doc, title, org, periodStr)

  let y = 56

  if (type === 'ejecutivo') {
    y = sectionTitle(doc, 'Score de Compliance', y)
    const score = data.complianceScore
    if (score != null) {
      doc.setFontSize(32)
      doc.setTextColor(score >= 80 ? 34 : score >= 60 ? 202 : 239, score >= 80 ? 197 : score >= 60 ? 138 : 68, score >= 80 ? 94 : score >= 60 ? 4 : 68)
      doc.setFont('helvetica', 'bold')
      doc.text(`${score}/100`, 14, y + 12)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      const label = score >= 80 ? 'Buen nivel de compliance' : score >= 60 ? 'Necesita mejoras' : 'Riesgo alto - accion inmediata'
      doc.text(label, 45, y + 8)
      if (data.multaPotencial) {
        doc.setFontSize(9)
        doc.text(`Multa potencial estimada: S/ ${Number(data.multaPotencial).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 45, y + 14)
      }
      y += 24
    } else {
      doc.setFontSize(9)
      doc.text('No hay diagnosticos en el periodo seleccionado.', 14, y)
      y += 10
    }

    if (data.diagnosticHistory?.length > 0) {
      y = sectionTitle(doc, 'Evolucion de Diagnosticos', y)
      const headers = ['Fecha', 'Tipo', 'Score', 'Multa (S/)']
      const cols = [14, 55, 100, 140]
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      headers.forEach((h, i) => doc.text(h, cols[i], y))
      doc.setFont('helvetica', 'normal')
      y += 3
      doc.setDrawColor(220, 220, 220)
      doc.line(14, y, 196, y)
      y += 4
      for (const h of data.diagnosticHistory) {
        doc.text(h.date, cols[0], y)
        doc.text(h.type === 'FULL' ? 'Completo' : h.type === 'EXPRESS' ? 'Express' : 'Simulacro', cols[1], y)
        doc.setFont('helvetica', 'bold')
        doc.text(String(h.score), cols[2], y)
        doc.setFont('helvetica', 'normal')
        doc.text(h.multa ? `S/ ${Number(h.multa).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—', cols[3], y)
        y += 6
        if (y > 270) { doc.addPage(); addHeader(doc, title, org, periodStr); y = 56 }
      }
      y += 4
    }

    y = sectionTitle(doc, 'Resumen General', y)
    y = kv(doc, 'Trabajadores activos', String(data.activeWorkers ?? 0), 14, y)
    if (data.contractsByStatus) {
      const signed = data.contractsByStatus['SIGNED'] ?? 0
      const expired = data.contractsByStatus['EXPIRED'] ?? 0
      y = kv(doc, 'Contratos firmados', String(signed), 14, y)
      if (expired > 0) y = kv(doc, 'Contratos vencidos', String(expired), 14, y)
    }
    if (data.complaints) {
      y = kv(doc, 'Denuncias recibidas', String(data.complaints.total), 14, y)
      y = kv(doc, 'Denuncias resueltas', String(data.complaints.resolved), 14, y)
    }
  }

  else if (type === 'nomina') {
    y = sectionTitle(doc, 'Resumen de Calculos', y)
    y = kv(doc, 'Total de calculos', String(data.totalCalculations ?? 0), 14, y)
    y += 4
    if (data.byType && Object.keys(data.byType).length > 0) {
      y = sectionTitle(doc, 'Por Tipo de Calculo', y)
      for (const [t, count] of Object.entries(data.byType as Record<string, number>)) {
        y = kv(doc, CALC_LABELS[t] ?? t, String(count), 14, y)
        if (y > 270) { doc.addPage(); addHeader(doc, title, org, periodStr); y = 56 }
      }
    }
    if (data.recentCalculations?.length > 0) {
      y += 4
      y = sectionTitle(doc, 'Calculos Recientes', y)
      const headers = ['Fecha', 'Tipo', 'Trabajador']
      const cols = [14, 45, 100]
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      headers.forEach((h, i) => doc.text(h, cols[i], y))
      doc.setFont('helvetica', 'normal')
      y += 3
      doc.setDrawColor(220, 220, 220)
      doc.line(14, y, 196, y)
      y += 4
      for (const c of data.recentCalculations.slice(0, 30)) {
        doc.text(c.date, cols[0], y)
        doc.text(CALC_LABELS[c.type] ?? c.type, cols[1], y)
        doc.text(c.workerName ?? '—', cols[2], y)
        y += 5
        if (y > 270) { doc.addPage(); addHeader(doc, title, org, periodStr); y = 56 }
      }
    }
  }

  else if (type === 'contratos') {
    y = sectionTitle(doc, 'Resumen', y)
    y = kv(doc, 'Total contratos', String(data.total ?? 0), 14, y)
    y = kv(doc, 'Por vencer (30 dias)', String(data.expiringSoon ?? 0), 14, y)
    y += 4
    if (data.contracts?.length > 0) {
      y = sectionTitle(doc, 'Detalle de Contratos', y)
      const headers = ['Titulo', 'Tipo', 'Estado', 'Vencimiento']
      const cols = [14, 80, 120, 158]
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      headers.forEach((h, i) => doc.text(h, cols[i], y))
      doc.setFont('helvetica', 'normal')
      y += 3
      doc.setDrawColor(220, 220, 220)
      doc.line(14, y, 196, y)
      y += 4
      for (const c of data.contracts) {
        const titleShort = String(c.title).substring(0, 35)
        const typeShort = String(c.type).replace(/_/g, ' ').substring(0, 18)
        doc.text(titleShort, cols[0], y)
        doc.text(typeShort, cols[1], y)
        doc.text(CONTRACT_STATUS_LABELS[c.status] ?? c.status, cols[2], y)
        doc.text(c.expiresAt ?? '—', cols[3], y)
        y += 5
        if (y > 270) { doc.addPage(); addHeader(doc, title, org, periodStr); y = 56 }
      }
    }
  }

  else if (type === 'denuncias') {
    y = sectionTitle(doc, 'Resumen de Denuncias', y)
    y = kv(doc, 'Total recibidas', String(data.total ?? 0), 14, y)
    y = kv(doc, 'Resueltas', String(data.resolved ?? 0), 14, y)
    y = kv(doc, 'En proceso', String(data.pending ?? 0), 14, y)
    if (data.avgResolutionDays > 0) {
      y = kv(doc, 'Tiempo promedio resolucion', `${data.avgResolutionDays} dias`, 14, y)
    }
    if (data.bySeverity && Object.keys(data.bySeverity).length > 0) {
      y += 4
      y = sectionTitle(doc, 'Por Severidad', y)
      for (const [sev, count] of Object.entries(data.bySeverity as Record<string, number>)) {
        y = kv(doc, sev, String(count), 14, y)
      }
    }
    if (data.byType && Object.keys(data.byType).length > 0) {
      y += 4
      y = sectionTitle(doc, 'Por Tipo de Denuncia', y)
      for (const [t, count] of Object.entries(data.byType as Record<string, number>)) {
        y = kv(doc, t.replace(/_/g, ' '), String(count), 14, y)
      }
    }
  }

  else if (type === 'sst') {
    y = sectionTitle(doc, 'Resumen SST', y)
    y = kv(doc, 'Total registros SST', String(data.totalRecords ?? 0), 14, y)
    y = kv(doc, 'Trabajadores activos', String(data.activeWorkers ?? 0), 14, y)
    y = kv(doc, 'Completados', String(data.completed ?? 0), 14, y)
    y = kv(doc, 'Pendientes', String(data.pending ?? 0), 14, y)
    y = kv(doc, 'Vencidos', String(data.overdue ?? 0), 14, y)
    if (data.byType && Object.keys(data.byType).length > 0) {
      y += 4
      y = sectionTitle(doc, 'Por Tipo de Registro SST', y)
      for (const [t, count] of Object.entries(data.byType as Record<string, number>)) {
        y = kv(doc, t.replace(/_/g, ' '), String(count), 14, y)
      }
    }
  }

  else if (type === 'sunafil') {
    y = sectionTitle(doc, 'Inventario de Trabajadores (SUNAFIL-Ready)', y)
    y = kv(doc, 'Total trabajadores activos', String(data.totalWorkers ?? 0), 14, y)
    y += 4
    if (data.workers?.length > 0) {
      const headers = ['Trabajador', 'DNI', 'Cargo', 'Ingreso', 'Docs']
      const cols = [14, 72, 100, 148, 172]
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      headers.forEach((h, i) => doc.text(h, cols[i], y))
      doc.setFont('helvetica', 'normal')
      y += 3
      doc.setDrawColor(220, 220, 220)
      doc.line(14, y, 196, y)
      y += 4
      for (const w of data.workers) {
        doc.text(String(w.name).substring(0, 30), cols[0], y)
        doc.text(String(w.dni ?? '—'), cols[1], y)
        doc.text(String(w.cargo ?? '—').substring(0, 20), cols[2], y)
        doc.text(w.fechaIngreso ?? '—', cols[3], y)
        doc.text(String(w.documents), cols[4], y)
        y += 5
        if (y > 270) { doc.addPage(); addHeader(doc, title, org, periodStr); y = 56 }
      }
    }
  }

  addPageNumbers(doc)
  const filename = `COMPLY360_${type}_${period.start ?? 'report'}.pdf`
  doc.save(filename)
}
