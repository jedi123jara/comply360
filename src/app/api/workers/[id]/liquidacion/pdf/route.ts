import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { calcularLiquidacion } from '@/lib/legal-engine/calculators/liquidacion'
import type { LiquidacionInput, LiquidacionResult, MotivoCese } from '@/lib/legal-engine/types'
import {
  createPDFDoc,
  finalizePDF,
  addHeader,
  sectionTitle,
  kv,
  drawTable,
  checkPageBreak,
  type TableColumn,
} from '@/lib/pdf/server-pdf'

const MOTIVO_LABEL: Record<string, string> = {
  despido_arbitrario: 'Despido Arbitrario',
  renuncia: 'Renuncia Voluntaria',
  mutuo_acuerdo: 'Mutuo Disenso',
  fin_contrato: 'Vencimiento de Contrato',
  despido_nulo: 'Despido Nulo',
  hostilidad: 'Actos de Hostilidad',
}

const REGIMEN_LABEL: Record<string, string> = {
  GENERAL: 'Régimen General (D.Leg. 728)',
  MYPE_MICRO: 'Microempresa (Ley 32353)',
  MYPE_PEQUENA: 'Pequeña Empresa (Ley 32353)',
  AGRARIO: 'Régimen Agrario (Ley 31110)',
  CAS: 'Contrato Administrativo de Servicios',
  CONSTRUCCION_CIVIL: 'Construcción Civil',
  DOMESTICO: 'Trabajador del Hogar (Ley 27986)',
  MODALIDAD_FORMATIVA: 'Modalidad Formativa (Ley 28518)',
  TELETRABAJO: 'Teletrabajo (Ley 31572)',
}

function fmt(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

// =============================================
// GET /api/workers/[id]/liquidacion/pdf
// =============================================
export const GET = withPlanGateParams<{ id: string }>('workers', 
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const { id } = params
    const orgId = ctx.orgId

    // ── Load worker ────────────────────────────────────────────────────
    const worker = await prisma.worker.findUnique({
      where: { id },
      include: {
        vacations: { orderBy: { periodoInicio: 'asc' } },
        organization: { select: { name: true, ruc: true, razonSocial: true } },
      },
    })

    if (!worker || worker.orgId !== orgId) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    const org = worker.organization

    // ── Build input ─────────────────────────────────────────────────────
    const sueldoBruto = Number(worker.sueldoBruto)
    const fechaIngreso = worker.fechaIngreso.toISOString().slice(0, 10)
    const fechaCese = (worker.fechaCese ?? new Date()).toISOString().slice(0, 10)
    const motivoMap: Record<string, MotivoCese> = {
      despido_arbitrario: 'despido_arbitrario',
      renuncia: 'renuncia',
      mutuo_acuerdo: 'mutuo_acuerdo',
      fin_contrato: 'fin_contrato',
      despido_nulo: 'despido_nulo',
      hostilidad: 'hostilidad',
    }
    const motivoCese: MotivoCese = motivoMap[worker.motivoCese ?? ''] ?? 'fin_contrato'
    const vacacionesNoGozadas = worker.vacations.reduce((acc, v) => acc + v.diasPendientes, 0)

    const input: LiquidacionInput = {
      sueldoBruto,
      fechaIngreso,
      fechaCese,
      motivoCese,
      asignacionFamiliar: worker.asignacionFamiliar,
      gratificacionesPendientes: false,
      vacacionesNoGozadas,
      horasExtrasPendientes: 0,
      ultimaGratificacion: worker.regimenLaboral === 'MYPE_MICRO'
        ? 0
        : worker.regimenLaboral === 'MYPE_PEQUENA'
          ? sueldoBruto * 0.5
          : sueldoBruto,
      comisionesPromedio: 0,
    }

    const result: LiquidacionResult = calcularLiquidacion(input)

    // Apply MYPE_MICRO zeroing
    if (worker.regimenLaboral === 'MYPE_MICRO') {
      result.breakdown.cts.amount = 0
      result.breakdown.gratificacionTrunca.amount = 0
      result.breakdown.bonificacionEspecial.amount = 0
      const newTotal = Object.values(result.breakdown).reduce(
        (sum, item) => sum + (item?.amount ?? 0), 0,
      )
      result.totalBruto = Math.round(newTotal * 100) / 100
      result.totalNeto = result.totalBruto
    }

    // ── Generate PDF ────────────────────────────────────────────────────
    const doc = await createPDFDoc()
    const w = doc.internal.pageSize.getWidth()

    const headerOrg = { name: org?.name, razonSocial: org?.razonSocial, ruc: org?.ruc }
    const workerName = `${worker.firstName} ${worker.lastName}`
    addHeader(
      doc,
      'LIQUIDACIÓN DE BENEFICIOS SOCIALES',
      headerOrg,
      `DNI: ${worker.dni}`,
    )

    let y = 52

    // ── Worker info ──────────────────────────────────────────────────────
    y = sectionTitle(doc, '1. DATOS DEL TRABAJADOR', y)

    const col1 = 14, col2 = 110
    y = kv(doc, 'Trabajador', workerName, col1, y, 40)
    y = kv(doc, 'DNI', worker.dni, col1, y, 40)
    kv(doc, 'Cargo', worker.position ?? '—', col2, y - 12, 40)
    kv(doc, 'Área', worker.department ?? '—', col2, y - 6, 40)
    y = kv(doc, 'Régimen Laboral', REGIMEN_LABEL[worker.regimenLaboral] ?? worker.regimenLaboral, col1, y, 40)
    y = kv(doc, 'Tipo Contrato', worker.tipoContrato, col2, y - 6, 40) + 6

    // ── Liquidation info ─────────────────────────────────────────────────
    y = sectionTitle(doc, '2. DATOS DEL CESE', y)
    y = kv(doc, 'Fecha de Ingreso', fmtDate(input.fechaIngreso), col1, y, 50)
    y = kv(doc, 'Fecha de Cese', fmtDate(input.fechaCese), col1, y, 50)
    y = kv(doc, 'Motivo de Cese', MOTIVO_LABEL[input.motivoCese] ?? input.motivoCese, col1, y, 50)
    y = kv(doc, 'Sueldo Bruto', fmt(input.sueldoBruto), col2, y - 18, 50) + 18

    // ── Breakdown table ──────────────────────────────────────────────────
    y = sectionTitle(doc, '3. DETALLE DE LIQUIDACIÓN', y)

    const columns: TableColumn[] = [
      { header: 'Concepto', x: 14 },
      { header: 'Base Legal', x: 85 },
      { header: 'Fórmula', x: 130 },
      { header: 'Monto (S/)', x: 192, align: 'right' },
    ]

    const items = [
      result.breakdown.cts,
      result.breakdown.vacacionesTruncas,
      result.breakdown.vacacionesNoGozadas,
      result.breakdown.gratificacionTrunca,
      result.breakdown.indemnizacion,
      result.breakdown.horasExtras,
      result.breakdown.bonificacionEspecial,
    ].filter(Boolean)

    const rows: string[][] = items.map(item => [
      item!.label,
      item!.baseLegal.slice(0, 40),
      item!.formula.slice(0, 35),
      `${item!.amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ])

    y = drawTable(doc, columns, rows, y, {
      zebraFill: true,
      rowHeight: 6,
      headerArgs: {
        title: 'LIQUIDACIÓN DE BENEFICIOS SOCIALES',
        org: headerOrg,
        subtitle: `DNI: ${worker.dni}`,
      },
    })

    y += 4

    // ── Total row ────────────────────────────────────────────────────────
    doc.setFillColor(30, 58, 110)
    doc.rect(14, y - 4, w - 28, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL LIQUIDACIÓN', 16, y + 2)
    doc.text(fmt(result.totalBruto), w - 16, y + 2, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    y += 16

    // ── Warnings ─────────────────────────────────────────────────────────
    if (result.warnings.length > 0) {
      y = checkPageBreak(doc, y, 240)
      y = sectionTitle(doc, '4. ALERTAS LEGALES', y)

      for (const warn of result.warnings) {
        const [r, g, b] = warn.type === 'urgente'
          ? [239, 68, 68]
          : warn.type === 'riesgo'
            ? [245, 158, 11]
            : [59, 130, 246]

        doc.setFillColor(r, g, b)
        doc.rect(14, y - 4, 4, 8, 'F')
        doc.setFontSize(8)
        doc.setTextColor(30, 30, 30)
        const lines = doc.internal.pageSize.getWidth() // Use for word wrap reference
        doc.text(warn.message, 22, y, { maxWidth: lines - 40 })
        y += warn.message.length > 80 ? 14 : 8
        y = checkPageBreak(doc, y)
      }
      y += 4
    }

    // ── Legal basis ──────────────────────────────────────────────────────
    y = checkPageBreak(doc, y, 240)
    y = sectionTitle(doc, '5. BASE LEGAL', y)
    for (const ref of result.legalBasis) {
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 58, 110)
      doc.text(`${ref.norm} ${ref.article}`, 16, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      doc.text(`— ${ref.description}`, 70, y)
      y += 6
      y = checkPageBreak(doc, y)
    }

    // ── Signature block ──────────────────────────────────────────────────
    y = checkPageBreak(doc, y + 6, 230)
    doc.setDrawColor(150, 150, 150)
    doc.line(14, y + 20, 80, y + 20)
    doc.line(120, y + 20, 196, y + 20)
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Firma del Trabajador', 47, y + 26, { align: 'center' })
    doc.text(workerName, 47, y + 32, { align: 'center' })
    doc.text('DNI: ' + worker.dni, 47, y + 37, { align: 'center' })
    doc.text('Firma del Empleador / RRHH', 158, y + 26, { align: 'center' })

    // ── Disclaimer ───────────────────────────────────────────────────────
    y += 45
    doc.setFontSize(6.5)
    doc.setTextColor(150, 150, 150)
    doc.text(
      'Documento generado automáticamente por COMPLY360. Los montos son referenciales y pueden diferir de la liquidación final ' +
      'según condiciones específicas del trabajador. Consulte con un especialista laboral para validación legal.',
      14, y, { maxWidth: w - 28 },
    )

    const filename = `liquidacion-${worker.dni}-${new Date().toISOString().slice(0, 10)}.pdf`
    return finalizePDF(doc, filename)
  },
)

