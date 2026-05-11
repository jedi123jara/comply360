import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { addJsonSheet, createWorkbook, rowsToCsv, workbookToArrayBuffer } from '@/lib/excel/exceljs'

/**
 * GET /api/export?type=...&format=xlsx|csv
 *
 * Tipos soportados:
 *   - workers, calculations, diagnostics, contracts, alerts: estándar
 *   - legajo-inventory: un row por WorkerDocument (auditoría)
 *   - attendance-monthly: un row por (worker × día) en el rango ?startDate=&endDate=
 *   - attendance-summary: un row por worker con totales del rango
 *
 * Para los attendance-* el rango defaultea al mes en curso si no se pasa.
 */
export const GET = withPlanGate('reportes_pdf', async (req: NextRequest, ctx: AuthContext) => {
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

  else if (type === 'attendance-monthly' || type === 'attendance-summary') {
    // Rango: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD; default = mes en curso
    const sd = searchParams.get('startDate')
    const ed = searchParams.get('endDate')
    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const start = sd ? new Date(`${sd}T00:00:00.000Z`) : defaultStart
    const end = ed ? new Date(`${ed}T23:59:59.999Z`) : defaultEnd

    const records = await prisma.attendance.findMany({
      where: {
        orgId,
        clockIn: { gte: start, lte: end },
        ...(ids ? { workerId: { in: ids.split(',') } } : {}),
      },
      orderBy: [{ workerId: 'asc' }, { clockIn: 'asc' }],
      select: {
        clockIn: true, clockOut: true, status: true, hoursWorked: true,
        isOvertime: true, overtimeMinutes: true, notes: true,
        worker: {
          select: { firstName: true, lastName: true, dni: true, department: true, position: true },
        },
      },
    })

    if (type === 'attendance-monthly') {
      // Un row por marcación
      rows = records.map(r => {
        // Parse de notes JSON para extraer estado de justificación (mismo formato Fase 1.1)
        let justState = '—'
        let justReason = ''
        try {
          const trimmed = r.notes?.trim() ?? ''
          if (trimmed.startsWith('{')) {
            const parsed = JSON.parse(trimmed) as { j?: { reason?: string }; a?: { approved?: boolean; comment?: string } }
            if (parsed.j) {
              justReason = String(parsed.j.reason ?? '')
              justState = parsed.a
                ? (parsed.a.approved ? 'Aprobada' : 'Rechazada')
                : 'Pendiente'
            }
          }
        } catch {/* noop */}

        return {
          'DNI': r.worker.dni ?? '',
          'Apellidos': r.worker.lastName,
          'Nombres': r.worker.firstName,
          'Cargo': r.worker.position ?? '',
          'Area': r.worker.department ?? '',
          'Fecha': r.clockIn.toLocaleDateString('es-PE'),
          'Entrada': r.clockIn.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
          'Salida': r.clockOut ? r.clockOut.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '',
          'Horas': r.hoursWorked ? Number(r.hoursWorked).toFixed(2) : '',
          'Estado': r.status,
          'Horas Extras (min)': r.overtimeMinutes ?? '',
          'Justificacion': justState,
          'Motivo': justReason,
        }
      })
      sheetName = 'Asistencia Mensual'
      filename = `asistencia-mensual_${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`
    } else {
      // attendance-summary: un row por trabajador con totales
      const byWorker = new Map<string, {
        dni: string
        nombre: string
        area: string
        cargo: string
        diasPresente: number
        diasTardanza: number
        diasAusente: number
        diasPermiso: number
        horasTotales: number
        horasExtrasMin: number
        justPendientes: number
        justAprobadas: number
      }>()
      for (const r of records) {
        const key = `${r.worker.dni ?? ''}|${r.worker.lastName}|${r.worker.firstName}`
        const existing = byWorker.get(key) ?? {
          dni: r.worker.dni ?? '',
          nombre: `${r.worker.lastName}, ${r.worker.firstName}`,
          area: r.worker.department ?? '',
          cargo: r.worker.position ?? '',
          diasPresente: 0, diasTardanza: 0, diasAusente: 0, diasPermiso: 0,
          horasTotales: 0, horasExtrasMin: 0,
          justPendientes: 0, justAprobadas: 0,
        }
        if (r.status === 'PRESENT') existing.diasPresente++
        if (r.status === 'LATE') existing.diasTardanza++
        if (r.status === 'ABSENT') existing.diasAusente++
        if (r.status === 'ON_LEAVE') existing.diasPermiso++
        if (r.hoursWorked) existing.horasTotales += Number(r.hoursWorked)
        if (r.overtimeMinutes) existing.horasExtrasMin += r.overtimeMinutes

        try {
          const trimmed = r.notes?.trim() ?? ''
          if (trimmed.startsWith('{')) {
            const parsed = JSON.parse(trimmed) as { j?: unknown; a?: { approved?: boolean } }
            if (parsed.j) {
              if (parsed.a?.approved === true) existing.justAprobadas++
              else if (!parsed.a) existing.justPendientes++
            }
          }
        } catch {/* noop */}

        byWorker.set(key, existing)
      }
      rows = Array.from(byWorker.values()).map(w => ({
        'DNI': w.dni,
        'Trabajador': w.nombre,
        'Cargo': w.cargo,
        'Area': w.area,
        'Dias Presente': w.diasPresente,
        'Dias Tardanza': w.diasTardanza,
        'Dias Ausente': w.diasAusente,
        'Dias Permiso': w.diasPermiso,
        'Horas Totales': w.horasTotales.toFixed(1),
        'Horas Extras (min)': w.horasExtrasMin,
        'Justif. Pendientes': w.justPendientes,
        'Justif. Aprobadas': w.justAprobadas,
      }))
      sheetName = 'Resumen Asistencia'
      filename = `asistencia-resumen_${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`
    }
  }

  else if (type === 'legajo-inventory') {
    // Inventario de WorkerDocuments — un row por doc con datos del worker al lado.
    // Útil para auditorías SUNAFIL: el inspector pivota por DNI o por categoría.
    const docs = await prisma.workerDocument.findMany({
      where: {
        worker: {
          orgId,
          ...(ids ? { id: { in: ids.split(',') } } : {}),
        },
      },
      orderBy: [
        { worker: { lastName: 'asc' } },
        { category: 'asc' },
        { documentType: 'asc' },
      ],
      select: {
        category: true,
        documentType: true,
        title: true,
        status: true,
        isRequired: true,
        expiresAt: true,
        verifiedAt: true,
        verifiedBy: true,
        fileUrl: true,
        createdAt: true,
        worker: {
          select: {
            dni: true,
            firstName: true,
            lastName: true,
            position: true,
            department: true,
            status: true,
            legajoScore: true,
          },
        },
      },
    })

    rows = docs.map(d => ({
      'DNI': d.worker.dni ?? '',
      'Apellidos': d.worker.lastName,
      'Nombres': d.worker.firstName,
      'Cargo': d.worker.position ?? '',
      'Area': d.worker.department ?? '',
      'Estado Trabajador': d.worker.status,
      'Score Legajo (%)': d.worker.legajoScore ?? 0,
      'Categoria Doc': d.category,
      'Tipo Doc': d.documentType,
      'Titulo': d.title,
      'Estado Doc': d.status,
      'Obligatorio': d.isRequired ? 'Si' : 'No',
      'Tiene Archivo': d.fileUrl ? 'Si' : 'No',
      'Verificado': d.verifiedAt ? new Date(d.verifiedAt).toLocaleDateString('es-PE') : '',
      'Verificado Por': d.verifiedBy ?? '',
      'Vence': d.expiresAt ? new Date(d.expiresAt).toLocaleDateString('es-PE') : '',
      'Fecha Carga': new Date(d.createdAt).toLocaleDateString('es-PE'),
    }))
    sheetName = 'Inventario Legajo'
    filename = `inventario_legajo_${new Date().toISOString().split('T')[0]}`
  }

  else {
    return NextResponse.json({ error: `Tipo no reconocido: ${type}. Use workers, calculations, diagnostics, contracts, alerts, legajo-inventory, attendance-monthly o attendance-summary.` }, { status: 400 })
  }

  const mimeType = format === 'csv'
    ? 'text/csv; charset=utf-8'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

  const fileExt = format === 'csv' ? 'csv' : 'xlsx'
  let body: string | ArrayBuffer
  if (format === 'csv') {
    body = rowsToCsv(rows)
  } else {
    const workbook = createWorkbook()
    addJsonSheet(workbook, sheetName, rows)
    body = await workbookToArrayBuffer(workbook)
  }

  return new NextResponse(body, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}.${fileExt}"`,
      'Cache-Control': 'no-store',
    },
  })
})

