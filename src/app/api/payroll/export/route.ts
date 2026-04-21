/**
 * GET /api/payroll/export?periodo=YYYY-MM&format=excel|plame
 *
 * Exports the payroll for a given period.
 * - excel: XLSX file with all workers and their payslip details
 * - plame: delegates to /api/exports/plame (TXT SUNAT format)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  generatePlameTxt,
  generatePlameFileName,
  type PlameWorkerRow,
} from '@/lib/exports/plame-generator'

export const runtime = 'nodejs'

const TIPO_TRABAJADOR_MAP: Record<string, string> = {
  INDEFINIDO: '21', PLAZO_FIJO: '23', TIEMPO_PARCIAL: '24',
  INICIO_ACTIVIDAD: '23', NECESIDAD_MERCADO: '23', RECONVERSION: '23',
  SUPLENCIA: '23', EMERGENCIA: '23', OBRA_DETERMINADA: '23', EXPORTACION: '23',
}
const REGIMEN_PENSION_MAP: Record<string, '0' | '1' | '2' | '3'> = {
  AFP: '2', ONP: '1', SIN_APORTE: '0',
}

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') ?? ''
  const format = (searchParams.get('format') ?? 'excel') as 'excel' | 'plame'

  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json(
      { error: 'El parámetro "periodo" es requerido en formato YYYY-MM' },
      { status: 400 },
    )
  }

  const orgId = ctx.orgId

  // Load org
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, razonSocial: true, ruc: true },
  })

  // Load workers + payslips for this period
  const workers = await prisma.worker.findMany({
    where: { orgId, status: 'ACTIVE' },
    orderBy: [{ department: 'asc' }, { lastName: 'asc' }],
    include: {
      payslips: {
        where: { periodo },
        take: 1,
        select: {
          id: true,
          totalIngresos: true,
          totalDescuentos: true,
          netoPagar: true,
          aporteAfpOnp: true,
          rentaQuintaCat: true,
          essalud: true,
          asignacionFamiliar: true,
          bonificaciones: true,
          detalleJson: true,
          status: true,
        },
      },
    },
  })

  // ── PLAME export ────────────────────────────────────────────────────────────
  if (format === 'plame') {
    if (!org?.ruc) {
      return NextResponse.json(
        { error: 'La organización no tiene RUC configurado' },
        { status: 400 },
      )
    }
    const periodoYYYYMM = periodo.replace('-', '')

    const plameRows: PlameWorkerRow[] = workers.map(w => {
      const lastParts = (w.lastName || '').trim().split(/\s+/)
      const payslip = w.payslips[0]
      return {
        tipoDocumento: '1',
        numeroDocumento: w.dni,
        apellidoPaterno: lastParts[0] ?? '',
        apellidoMaterno: lastParts.slice(1).join(' ') ?? '',
        nombres: w.firstName,
        sexo: w.gender === 'F' ? 'F' : 'M',
        fechaNacimiento: w.birthDate ? w.birthDate.toISOString().slice(0, 10) : '',
        fechaIngreso: w.fechaIngreso.toISOString().slice(0, 10),
        fechaCese: w.fechaCese ? w.fechaCese.toISOString().slice(0, 10) : undefined,
        tipoTrabajador: TIPO_TRABAJADOR_MAP[w.tipoContrato] ?? '21',
        regimenPensionario: REGIMEN_PENSION_MAP[w.tipoAporte] ?? '0',
        cuspp: w.cuspp ?? undefined,
        regimenSalud: '01',
        remuneracionBruta: payslip
          ? Number(payslip.totalIngresos)
          : Number(w.sueldoBruto),
        diasLaborados: 30,
        diasNoLaborados: 0,
        diasSubsidiados: 0,
        periodo: periodoYYYYMM,
      }
    })

    const txt = generatePlameTxt({
      rucEmpleador: org.ruc,
      periodo: periodoYYYYMM,
      workers: plameRows,
    })
    const fileName = generatePlameFileName({ rucEmpleador: org.ruc, periodo: periodoYYYYMM })

    return new NextResponse(txt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=iso-8859-1',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  }

  // ── Excel export ────────────────────────────────────────────────────────────
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Sheet 1: Resumen de planilla
  const periodoLabel = (() => {
    const [y, m] = periodo.split('-')
    const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${meses[parseInt(m, 10)]} ${y}`
  })()

  const orgName = org?.razonSocial ?? org?.name ?? ''

  // Header rows
  const headerRows = [
    ['PLANILLA DE REMUNERACIONES', '', '', '', '', '', '', '', '', '', ''],
    [orgName, '', '', '', '', '', '', '', '', '', ''],
    [`Período: ${periodoLabel}`, '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    [
      'N°', 'DNI', 'Apellidos y Nombres', 'Área', 'Cargo', 'Régimen',
      'Sueldo Bruto', 'Asig. Familiar', 'Bonif.',
      'Total Ingresos',
      'AFP/ONP', 'Renta 5ta', 'Total Descuentos',
      'Neto a Pagar', 'EsSalud (emp.)', 'Estado',
    ],
  ]

  let rowIdx = 1
  const dataRows = workers.map(w => {
    const p = w.payslips[0]
    const detalle = (p?.detalleJson ?? {}) as Record<string, number | string | null>
    const row = [
      rowIdx++,
      w.dni,
      `${w.lastName}, ${w.firstName}`,
      w.department ?? '',
      w.position ?? '',
      w.regimenLaboral,
      Number(w.sueldoBruto),
      Number(p?.asignacionFamiliar ?? 0),
      Number(p?.bonificaciones ?? detalle.bonificaciones ?? 0),
      p ? Number(p.totalIngresos) : '',
      p ? Number(p.aporteAfpOnp ?? 0) : '',
      p ? Number(p.rentaQuintaCat ?? 0) : '',
      p ? Number(p.totalDescuentos) : '',
      p ? Number(p.netoPagar) : '',
      p ? Number(p.essalud ?? 0) : '',
      p ? (p.status === 'EMITIDA' ? 'Emitida' : p.status === 'ACEPTADA' ? 'Aceptada' : p.status) : 'PENDIENTE',
    ]
    return row
  })

  // Totals row
  const withPayslip = workers.filter(w => w.payslips[0])
  const totalsRow = [
    '', '', `TOTAL (${withPayslip.length}/${workers.length} trabajadores)`, '', '', '',
    withPayslip.reduce((s, w) => s + Number(w.sueldoBruto), 0),
    withPayslip.reduce((s, w) => s + Number(w.payslips[0]?.asignacionFamiliar ?? 0), 0),
    withPayslip.reduce((s, w) => {
      const d = (w.payslips[0]?.detalleJson ?? {}) as Record<string, number>
      return s + Number(d.bonificaciones ?? 0)
    }, 0),
    withPayslip.reduce((s, w) => s + Number(w.payslips[0]?.totalIngresos ?? 0), 0),
    withPayslip.reduce((s, w) => s + Number(w.payslips[0]?.aporteAfpOnp ?? 0), 0),
    withPayslip.reduce((s, w) => s + Number(w.payslips[0]?.rentaQuintaCat ?? 0), 0),
    withPayslip.reduce((s, w) => s + Number(w.payslips[0]?.totalDescuentos ?? 0), 0),
    withPayslip.reduce((s, w) => s + Number(w.payslips[0]?.netoPagar ?? 0), 0),
    withPayslip.reduce((s, w) => s + Number(w.payslips[0]?.essalud ?? 0), 0),
    '',
  ]

  const allRows = [...headerRows, ...dataRows, totalsRow]
  const ws = XLSX.utils.aoa_to_sheet(allRows)

  // Column widths
  ws['!cols'] = [
    { wch: 4 }, { wch: 12 }, { wch: 32 }, { wch: 16 }, { wch: 20 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 10 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Planilla')

  // Sheet 2: Renta 5ta detalle
  const rentaHeaders = [
    ['DETALLE RENTA 5TA CATEGORÍA', '', '', '', '', ''],
    [orgName, '', '', '', '', ''],
    [`Período: ${periodoLabel}`, '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['DNI', 'Trabajador', 'RBA Anual Proyectada', 'Deducción 7 UIT', 'Renta Neta', 'Retención Mensual'],
  ]
  const rentaRows = workers
    .filter(w => w.payslips[0])
    .map(w => {
      const d = (w.payslips[0]!.detalleJson ?? {}) as Record<string, number>
      return [
        w.dni,
        `${w.lastName}, ${w.firstName}`,
        Number(d.rentaBrutaAnualProyectada ?? 0),
        Number(d.deduccion7UIT ?? 38500),
        Number(d.rentaNetaAnualImponible ?? 0),
        Number(w.payslips[0]!.rentaQuintaCat ?? 0),
      ]
    })

  const ws2 = XLSX.utils.aoa_to_sheet([...rentaHeaders, ...rentaRows])
  ws2['!cols'] = [
    { wch: 12 }, { wch: 32 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(wb, ws2, 'Renta 5ta')

  const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
  const fileName = `planilla-${orgName.replace(/\s+/g, '-').slice(0, 20)}-${periodo}.xlsx`

  return new NextResponse(xlsxBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
})
