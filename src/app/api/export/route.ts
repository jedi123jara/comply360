import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import * as XLSX from 'xlsx'

/**
 * GET /api/export?type=workers|calculations|diagnostics&format=xlsx|csv
 * Downloads an Excel or CSV file with org data.
 */
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'workers'
  const format = searchParams.get('format') === 'csv' ? 'csv' : 'xlsx'
  const orgId = ctx.orgId

  let rows: Record<string, unknown>[] = []
  let sheetName = 'Data'
  let filename = `export_${type}`

  // Support filtering by IDs for bulk export
  const ids = searchParams.get('ids') // comma-separated worker IDs

  if (type === 'workers') {
    const workers = await prisma.worker.findMany({
      where: {
        orgId,
        ...(ids ? { id: { in: ids.split(',') } } : {}),
      },
      orderBy: { lastName: 'asc' },
      select: {
        firstName: true,
        lastName: true,
        dni: true,
        email: true,
        phone: true,
        position: true,
        department: true,
        tipoContrato: true,
        regimenLaboral: true,
        sueldoBruto: true,
        asignacionFamiliar: true,
        tipoAporte: true,
        afpNombre: true,
        jornadaSemanal: true,
        status: true,
        legajoScore: true,
        fechaIngreso: true,
        fechaCese: true,
        _count: { select: { alerts: { where: { resolvedAt: null } } } },
      },
    })

    rows = workers.map(w => ({
      'Apellidos': w.lastName,
      'Nombres': w.firstName,
      'DNI': w.dni ?? '',
      'Email': w.email ?? '',
      'Telefono': w.phone ?? '',
      'Cargo': w.position ?? '',
      'Area': w.department ?? '',
      'Tipo Contrato': w.tipoContrato ?? '',
      'Regimen': w.regimenLaboral ?? '',
      'Sueldo Bruto (S/)': w.sueldoBruto ? Number(w.sueldoBruto).toFixed(2) : '',
      'Asig. Familiar': w.asignacionFamiliar ? 'Si' : 'No',
      'Tipo Aporte': w.tipoAporte ?? '',
      'AFP': w.afpNombre ?? '',
      'Jornada (h/sem)': w.jornadaSemanal,
      'Estado': w.status,
      'Legajo (%)': w.legajoScore ?? 0,
      'Alertas Activas': w._count.alerts,
      'Fecha Ingreso': w.fechaIngreso ? new Date(w.fechaIngreso).toLocaleDateString('es-PE') : '',
      'Fecha Cese': w.fechaCese ? new Date(w.fechaCese).toLocaleDateString('es-PE') : '',
    }))
    sheetName = 'Trabajadores'
    filename = `trabajadores_${new Date().toISOString().split('T')[0]}`
  }

  else if (type === 'calculations') {
    const calculations = await prisma.calculation.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        type: true,
        resultJson: true,
        totalAmount: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    })

    rows = calculations.map(c => {
      const result = c.resultJson as Record<string, unknown> ?? {}
      return {
        'Fecha': new Date(c.createdAt).toLocaleDateString('es-PE'),
        'Tipo': c.type,
        'Realizado por': c.user ? `${c.user.firstName} ${c.user.lastName}` : '',
        'Total (S/)': c.totalAmount ? Number(c.totalAmount).toFixed(2) : (result.total ?? result.sueldoNeto ?? result.monto ?? ''),
      }
    })
    sheetName = 'Calculos'
    filename = `calculos_${new Date().toISOString().split('T')[0]}`
  }

  else if (type === 'diagnostics') {
    const diagnostics = await prisma.complianceDiagnostic.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        type: true,
        scoreGlobal: true,
        totalMultaRiesgo: true,
        createdAt: true,
      },
    })

    rows = diagnostics.map(d => ({
      'Fecha': new Date(d.createdAt).toLocaleDateString('es-PE'),
      'Tipo': d.type,
      'Score Global': d.scoreGlobal,
      'Multa Potencial (S/)': d.totalMultaRiesgo ? Number(d.totalMultaRiesgo).toFixed(2) : '',
    }))
    sheetName = 'Diagnosticos'
    filename = `diagnosticos_${new Date().toISOString().split('T')[0]}`
  }

  else if (type === 'contracts') {
    const contractsList = await prisma.contract.findMany({
      where: {
        orgId,
        ...(ids ? { id: { in: ids.split(',') } } : {}),
        status: { not: 'ARCHIVED' },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        title: true,
        type: true,
        status: true,
        aiRiskScore: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        signedAt: true,
        createdBy: { select: { firstName: true, lastName: true } },
        workerContracts: {
          take: 1,
          select: {
            worker: { select: { firstName: true, lastName: true, dni: true, position: true } },
          },
        },
      },
    })

    const TYPE_LABELS_MAP: Record<string, string> = {
      LABORAL_INDEFINIDO: 'Plazo Indeterminado',
      LABORAL_PLAZO_FIJO: 'Plazo Fijo',
      LOCACION_SERVICIOS: 'Locacion de Servicios',
      TIEMPO_PARCIAL: 'Tiempo Parcial',
      MYPE_MICRO: 'MYPE Microempresa',
      MYPE_PEQUENA: 'MYPE Pequena Empresa',
      CONVENIO_PRACTICAS: 'Convenio de Practicas',
      NDA: 'Confidencialidad',
      CUSTOM: 'Personalizado',
    }

    rows = contractsList.map(c => {
      const worker = c.workerContracts[0]?.worker
      return {
        'Titulo': c.title,
        'Tipo': TYPE_LABELS_MAP[c.type] ?? c.type,
        'Estado': c.status,
        'Score IA': c.aiRiskScore ?? '',
        'Trabajador': worker ? `${worker.lastName}, ${worker.firstName}` : '',
        'DNI Trabajador': worker?.dni ?? '',
        'Cargo': worker?.position ?? '',
        'Fecha Vencimiento': c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('es-PE') : '',
        'Fecha Firma': c.signedAt ? new Date(c.signedAt).toLocaleDateString('es-PE') : '',
        'Creado Por': c.createdBy ? `${c.createdBy.firstName} ${c.createdBy.lastName}` : '',
        'Fecha Creacion': new Date(c.createdAt).toLocaleDateString('es-PE'),
        'Ultima Actualizacion': new Date(c.updatedAt).toLocaleDateString('es-PE'),
      }
    })
    sheetName = 'Contratos'
    filename = `contratos_${new Date().toISOString().split('T')[0]}`
  }

  else if (type === 'alerts') {
    const alertsList = await prisma.workerAlert.findMany({
      where: {
        orgId,
        resolvedAt: null,
        ...(ids ? { id: { in: ids.split(',') } } : {}),
      },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      select: {
        type: true,
        severity: true,
        title: true,
        description: true,
        dueDate: true,
        multaEstimada: true,
        createdAt: true,
        worker: { select: { firstName: true, lastName: true, dni: true, position: true, department: true } },
      },
    })

    const SEVERITY_LABEL: Record<string, string> = {
      CRITICAL: 'Crítico',
      HIGH: 'Alto',
      MEDIUM: 'Medio',
      LOW: 'Bajo',
    }

    rows = alertsList.map(a => ({
      'Severidad': SEVERITY_LABEL[a.severity] ?? a.severity,
      'Tipo': a.type.replace(/_/g, ' '),
      'Título': a.title,
      'Descripción': a.description ?? '',
      'Trabajador': a.worker ? `${a.worker.lastName}, ${a.worker.firstName}` : '',
      'DNI': a.worker?.dni ?? '',
      'Cargo': a.worker?.position ?? '',
      'Área': a.worker?.department ?? '',
      'Fecha Límite': a.dueDate ? new Date(a.dueDate).toLocaleDateString('es-PE') : '',
      'Multa Estimada (S/)': a.multaEstimada ? Number(a.multaEstimada).toFixed(2) : '',
      'Fecha Alerta': new Date(a.createdAt).toLocaleDateString('es-PE'),
    }))
    sheetName = 'Alertas'
    filename = `alertas_${new Date().toISOString().split('T')[0]}`
  }

  else {
    return NextResponse.json({ error: `Tipo no reconocido: ${type}. Use workers, calculations, diagnostics, contracts o alerts.` }, { status: 400 })
  }

  // Build workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto-width columns
  const colWidths = rows.length > 0
    ? Object.keys(rows[0]).map(key => ({
        wch: Math.max(key.length, ...rows.map(r => String(r[key] ?? '').length)) + 2,
      }))
    : []
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const mimeType = format === 'csv'
    ? 'text/csv'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

  const fileExt = format === 'csv' ? 'csv' : 'xlsx'
  const raw: Uint8Array = XLSX.write(wb, {
    type: 'buffer',
    bookType: format === 'csv' ? 'csv' : 'xlsx',
  })
  // NextResponse body accepts ArrayBuffer
  const buffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}.${fileExt}"`,
      'Cache-Control': 'no-store',
    },
  })
})
