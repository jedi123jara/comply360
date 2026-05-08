import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import {
  createPDFDoc,
  finalizePDF,
  addHeader,
  sectionTitle,
  kv,
  checkPageBreak,
} from '@/lib/pdf/server-pdf'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPeriodo(periodo: string): string {
  const [year, mm] = periodo.split('-')
  const meses = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return `${meses[parseInt(mm, 10)] ?? mm} ${year}`
}

// =============================================
// GET /api/workers/[id]/payslips/[payslipId]/pdf
// =============================================
export const GET = withPlanGateParams<{ id: string; payslipId: string }>('workers', 
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const { id: workerId, payslipId } = params
    const orgId = ctx.orgId

    // Load payslip + worker + org
    const payslip = await prisma.payslip.findFirst({
      where: { id: payslipId, workerId, orgId },
      include: {
        worker: {
          select: {
            firstName: true, lastName: true, dni: true,
            position: true, department: true,
            regimenLaboral: true, tipoAporte: true, afpNombre: true,
            fechaIngreso: true, asignacionFamiliar: true,
          },
        },
        organization: {
          select: { name: true, razonSocial: true, ruc: true },
        },
      },
    })

    if (!payslip) {
      return NextResponse.json({ error: 'Boleta no encontrada' }, { status: 404 })
    }

    const w = payslip.worker
    const org = payslip.organization
    const detalle = (payslip.detalleJson ?? {}) as Record<string, number | string | null>

    const workerName = `${w.firstName} ${w.lastName}`
    const periodoLabel = fmtPeriodo(payslip.periodo)

    // ── Build PDF ─────────────────────────────────────────────────────────────
    const doc = await createPDFDoc()
    const W = doc.internal.pageSize.getWidth()
    const headerOrg = { name: org?.name, razonSocial: org?.razonSocial, ruc: org?.ruc }

    addHeader(doc, 'BOLETA DE PAGO', headerOrg, periodoLabel)

    let y = 52

    // ── Worker info ───────────────────────────────────────────────────────────
    y = sectionTitle(doc, 'DATOS DEL TRABAJADOR', y)
    y = kv(doc, 'Trabajador', workerName, 14, y, 45)
    y = kv(doc, 'DNI', w.dni, 14, y, 45)
    kv(doc, 'Cargo', w.position ?? '—', 110, y - 12, 35)
    kv(doc, 'Área', w.department ?? '—', 110, y - 6, 35)
    y = kv(doc, 'Sistema Previsional', String(detalle.sistemaPrevisional ?? w.tipoAporte), 14, y, 45)
    y = kv(doc, 'Período', periodoLabel, 110, y - 6, 35) + 4

    // ── Two-column layout: INGRESOS | DESCUENTOS ─────────────────────────────
    const colLeft = 14
    const colRight = 108
    const colW = 90

    // Headers
    doc.setFillColor(30, 58, 110)
    doc.rect(colLeft, y, colW, 7, 'F')
    doc.rect(colRight, y, colW, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.text('INGRESOS', colLeft + 3, y + 5)
    doc.text('DESCUENTOS', colRight + 3, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    y += 9

    // Row helper
    function row(
      leftLabel: string, leftAmt: number | null,
      rightLabel: string, rightAmt: number | null,
      rowIdx: number,
    ) {
      if (rowIdx % 2 === 1) {
        doc.setFillColor(248, 249, 250)
        doc.rect(colLeft, y - 2.5, colW, 6, 'F')
        doc.rect(colRight, y - 2.5, colW, 6, 'F')
      }
      doc.setFontSize(8)
      doc.setTextColor(50, 50, 50)
      if (leftLabel) {
        doc.text(leftLabel, colLeft + 2, y)
        if (leftAmt !== null) {
          doc.setFont('helvetica', 'bold')
          doc.text(fmt(leftAmt), colLeft + colW - 2, y, { align: 'right' })
          doc.setFont('helvetica', 'normal')
        }
      }
      if (rightLabel) {
        doc.text(rightLabel, colRight + 2, y)
        if (rightAmt !== null) {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(180, 30, 30)
          doc.text(fmt(rightAmt), colRight + colW - 2, y, { align: 'right' })
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(50, 50, 50)
        }
      }
      y += 6
    }

    // Build income rows from detalleJson or DB fields
    const sueldoBruto = Number(payslip.sueldoBruto)
    const asigFam = Number(payslip.asignacionFamiliar ?? 0)
    const horasExtras = Number(detalle.horasExtras ?? 0)
    const bonif = Number(payslip.bonificaciones ?? 0)
    const gratif = Number(detalle.gratificacion ?? 0)
    const bonifExtra = Number(detalle.bonificacionExtraordinaria ?? 0)

    const aporteAfpOnp = Number(payslip.aporteAfpOnp ?? 0)
    const seguroInvalid = Number(detalle.seguroInvalidez ?? 0)
    const comisionAfp = Number(detalle.comisionAfp ?? 0)
    const rentaQuinta = Number(payslip.rentaQuintaCat ?? 0)

    // Rows — pair up income vs discount lines
    const ingresos = [
      ['Sueldo Básico', sueldoBruto],
      asigFam > 0 ? ['Asignación Familiar', asigFam] : null,
      horasExtras > 0 ? ['Horas Extras', horasExtras] : null,
      bonif > 0 ? ['Bonificaciones', bonif] : null,
      gratif > 0 ? ['Gratificación', gratif] : null,
      bonifExtra > 0 ? ['Bonif. Extraordinaria 9%', bonifExtra] : null,
    ].filter(Boolean) as [string, number][]

    const sistPrev = String(detalle.sistemaPrevisional ?? w.tipoAporte)
    const descuentos = [
      aporteAfpOnp > 0 ? [`${sistPrev} — Aporte`, aporteAfpOnp] : null,
      seguroInvalid > 0 ? ['AFP — Seguro Invalidez', seguroInvalid] : null,
      comisionAfp > 0 ? ['AFP — Comisión Flujo', comisionAfp] : null,
      rentaQuinta > 0 ? ['Renta 5ta Categoría', rentaQuinta] : null,
    ].filter(Boolean) as [string, number][]

    const maxRows = Math.max(ingresos.length, descuentos.length)
    for (let i = 0; i < maxRows; i++) {
      const ing = ingresos[i]
      const des = descuentos[i]
      row(
        ing ? ing[0] : '', ing ? ing[1] : null,
        des ? des[0] : '', des ? des[1] : null,
        i,
      )
    }

    // Subtotals
    y += 2
    doc.setDrawColor(200, 200, 200)
    doc.line(colLeft, y - 1, colLeft + colW, y - 1)
    doc.line(colRight, y - 1, colRight + colW, y - 1)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('TOTAL INGRESOS', colLeft + 2, y + 3)
    doc.text(fmt(Number(payslip.totalIngresos)), colLeft + colW - 2, y + 3, { align: 'right' })
    doc.setTextColor(180, 30, 30)
    doc.text('TOTAL DESCUENTOS', colRight + 2, y + 3)
    doc.text(fmt(Number(payslip.totalDescuentos)), colRight + colW - 2, y + 3, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    y += 10

    // ── NET PAY — full width ──────────────────────────────────────────────────
    doc.setFillColor(30, 58, 110)
    doc.rect(colLeft, y, W - 28, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('NETO A PAGAR', colLeft + 3, y + 8)
    doc.text(`S/ ${fmt(Number(payslip.netoPagar))}`, W - 16, y + 8, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    y += 18

    // ── Employer contributions (informative) ──────────────────────────────────
    y = checkPageBreak(doc, y, 240)
    y = sectionTitle(doc, 'APORTES DEL EMPLEADOR (informativos)', y)

    const essalud = Number(payslip.essalud ?? 0)
    const sctrMonto = Number(detalle.sctrMonto ?? 0)
    const ctsEst = Number(detalle.ctsEstimadoMes ?? 0)
    const costoTotal = Number(detalle.costoTotalEmpleador ?? Number(payslip.totalIngresos) + essalud)

    const empRows: [string, string, string][] = [
      ['EsSalud', '9% sobre rem. computable', fmt(essalud)],
      ...(sctrMonto > 0 ? [['SCTR', '~1.53%', fmt(sctrMonto)] as [string, string, string]] : []),
      ['CTS devengada (est.)', 'Mes actual', fmt(ctsEst)],
      ['Costo total empleador', 'Ingresos + EsSalud' + (sctrMonto > 0 ? ' + SCTR' : ''), fmt(costoTotal)],
    ]

    doc.setFontSize(8)
    for (let i = 0; i < empRows.length; i++) {
      const [label, nota, valor] = empRows[i]
      if (i % 2 === 1) {
        doc.setFillColor(248, 249, 250)
        doc.rect(colLeft, y - 2.5, W - 28, 6, 'F')
      }
      doc.setTextColor(60, 60, 60)
      doc.text(label, colLeft + 2, y)
      doc.setTextColor(130, 130, 130)
      doc.text(nota, 80, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text(fmt(Number(valor)), W - 16, y, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      y += 6
    }
    y += 6

    // ── Renta 5ta detail (collapsible section) ────────────────────────────────
    y = checkPageBreak(doc, y, 240)
    y = sectionTitle(doc, 'CÁLCULO RENTA 5TA CATEGORÍA', y)

    const rbaProyectada = Number(detalle.rentaBrutaAnualProyectada ?? 0)
    const ded7UIT = Number(detalle.deduccion7UIT ?? 38500)
    const rentaNeta = Number(detalle.rentaNetaAnualImponible ?? 0)
    const impAnual = Number(detalle.impuestoAnualProyectado ?? 0)

    const rentaRows: [string, string][] = [
      ['Renta Bruta Anual Proyectada', `S/ ${fmt(rbaProyectada)}`],
      ['Menos: Deducción 7 UIT (S/ 5,500)', `S/ ${fmt(ded7UIT)}`],
      ['Renta Neta Anual Imponible', `S/ ${fmt(rentaNeta)}`],
      ['Impuesto Anual Proyectado', `S/ ${fmt(impAnual)}`],
      ['Retención Este Mes', `S/ ${fmt(rentaQuinta)}`],
    ]

    doc.setFontSize(8)
    for (let i = 0; i < rentaRows.length; i++) {
      const [label, val] = rentaRows[i]
      if (i % 2 === 1) {
        doc.setFillColor(248, 249, 250)
        doc.rect(colLeft, y - 2.5, W - 28, 6, 'F')
      }
      doc.setTextColor(60, 60, 60)
      doc.text(label, colLeft + 2, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text(val, W - 16, y, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      y += 6
    }
    y += 6

    // ── Signature block ───────────────────────────────────────────────────────
    y = checkPageBreak(doc, y + 6, 240)
    doc.setDrawColor(150, 150, 150)
    doc.line(colLeft, y + 18, 80, y + 18)
    doc.line(120, y + 18, W - 14, y + 18)
    doc.setFontSize(7.5)
    doc.setTextColor(100, 100, 100)
    doc.text('Firma del Trabajador', 47, y + 23, { align: 'center' })
    doc.text(workerName, 47, y + 28, { align: 'center' })
    doc.text('Firma Empleador / RRHH', W - 47, y + 23, { align: 'center' })
    y += 38

    // ── Legal note ────────────────────────────────────────────────────────────
    doc.setFontSize(6.5)
    doc.setTextColor(160, 160, 160)
    doc.text(
      'Boleta generada por COMPLY360 — D.S. 003-97-TR Art. 19 (obligación de boleta de pago). Los importes son referenciales.',
      colLeft, y, { maxWidth: W - 28 },
    )

    const filename = `boleta-${w.dni}-${payslip.periodo}.pdf`
    return finalizePDF(doc, filename)
  },
)

