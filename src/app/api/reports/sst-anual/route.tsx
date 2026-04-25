/**
 * GET /api/reports/sst-anual?year=2026
 *
 * Genera el Informe Anual de Seguridad y Salud en el Trabajo en PDF.
 * Cumple con el artículo 32 de la Ley 29783 y el artículo 83 del D.S. 005-2012-TR,
 * que obligan al empleador a presentarlo anualmente al Comité de SST.
 *
 * El informe se arma en base a los SstRecord del ejercicio solicitado
 * (agrupados por tipo y estado) más el conteo de trabajadores activos.
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { SstAnnualPDF, type SstAnnualData } from '@/lib/pdf/react-pdf/sst-annual'
import type { SstRecordType, SstStatus } from '@/generated/prisma/client'

function formatDateShort(d: Date | string | null): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const yearParam = new URL(req.url).searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  if (!Number.isFinite(year) || year < 2015 || year > 2100) {
    return NextResponse.json({ error: 'Año inválido' }, { status: 400 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      razonSocial: true,
      ruc: true,
      sector: true,
      plan: true,
      regimenPrincipal: true,
    },
  })

  if (!org) {
    return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
  }

  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)

  const [records, totalWorkers] = await Promise.all([
    prisma.sstRecord.findMany({
      where: {
        orgId,
        createdAt: { gte: yearStart, lt: yearEnd },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
  ])

  // Agrupar por tipo / status
  const recordsByType: SstAnnualData['recordsByType'] = {}
  for (const r of records) {
    const key = r.type
    if (!recordsByType[key]) {
      recordsByType[key] = { total: 0, completed: 0, pending: 0, overdue: 0 }
    }
    const bucket = recordsByType[key]
    bucket.total++
    if (r.status === 'COMPLETED') bucket.completed++
    else if (r.status === 'OVERDUE') bucket.overdue++
    else bucket.pending++
  }

  const mapStatus = (s: SstStatus): string => {
    if (s === 'COMPLETED') return 'Cerrado'
    if (s === 'OVERDUE') return 'Vencido'
    if (s === 'IN_PROGRESS') return 'En curso'
    return 'Pendiente'
  }

  const filterByType = (type: SstRecordType) =>
    records
      .filter((r) => r.type === type)
      .map((r) => ({
        date: formatDateShort(r.createdAt),
        title: r.title,
        status: mapStatus(r.status),
        description: r.description ?? null,
      }))

  const accidents = filterByType('ACCIDENTE')
  const incidents = filterByType('INCIDENTE')
  const trainings = filterByType('CAPACITACION')

  const medicalExamRecords = records.filter((r) => r.type === 'EXAMEN_MEDICO')
  const medicalExams = {
    completed: medicalExamRecords.filter((r) => r.status === 'COMPLETED').length,
    pending: medicalExamRecords.filter((r) => r.status !== 'COMPLETED').length,
  }

  const eppDeliveries = records.filter((r) => r.type === 'ENTREGA_EPP').length
  const committeeActs = records.filter((r) => r.type === 'ACTA_COMITE').length
  const evacuationDrills = records.filter((r) => r.type === 'SIMULACRO_EVACUACION').length

  // Avance del plan anual: si hay registros PLAN_ANUAL, porcentaje de cumplidos;
  // si no, promedio de completitud general de actividades con dueDate en el año.
  const planAnualRecords = records.filter((r) => r.type === 'PLAN_ANUAL')
  let planAnnualCompletion: number
  if (planAnualRecords.length > 0) {
    const done = planAnualRecords.filter((r) => r.status === 'COMPLETED').length
    planAnnualCompletion = Math.round((done / planAnualRecords.length) * 100)
  } else if (records.length > 0) {
    const done = records.filter((r) => r.status === 'COMPLETED').length
    planAnnualCompletion = Math.round((done / records.length) * 100)
  } else {
    planAnnualCompletion = 0
  }

  const trainingsCompleted = trainings.filter((t) => t.status === 'Cerrado').length
  const trainingsPlanned = trainings.length

  const data: SstAnnualData = {
    org: {
      name: org.name ?? org.razonSocial ?? 'Empresa',
      razonSocial: org.razonSocial,
      ruc: org.ruc,
      sector: org.sector,
      plan: org.plan,
      regimenPrincipal: org.regimenPrincipal,
    },
    year,
    totalWorkers,
    recordsByType,
    accidents,
    incidents,
    trainings,
    trainingsCompleted,
    trainingsPlanned,
    medicalExams,
    eppDeliveries,
    committeeActs,
    evacuationDrills,
    planAnnualCompletion,
  }

  const buffer = await renderToBuffer(<SstAnnualPDF data={data} />)

  const ab = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(ab).set(buffer)
  return new NextResponse(new Blob([ab], { type: 'application/pdf' }), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="informe-sst-anual-${year}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
})
