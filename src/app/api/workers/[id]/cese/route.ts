/**
 * Proceso de Cese / Terminación Laboral
 *
 * GET  /api/workers/[id]/cese — Estado actual del proceso de cese
 * POST /api/workers/[id]/cese — Iniciar proceso de cese
 * PATCH /api/workers/[id]/cese — Avanzar etapa / actualizar montos / guardar liquidación
 *
 * Base Legal:
 * - D.Leg. 728 (TUO D.S. 003-97-TR) Art. 16-41 — Extinción del contrato
 * - Art. 22-25: Despido por causa justa (faltas graves)
 * - Art. 31: Carta de preaviso (mínimo 6 días naturales para descargos)
 * - Art. 32: Carta de despido
 * - Art. 34: Despido arbitrario → indemnización
 * - Art. 38: Indemnización = 1.5 rem × año (tope 12 rem)
 * - D.S. 001-97-TR: Pago de CTS al cese dentro de 48 horas
 * - D.Leg. 713 Art. 23: Triple vacacional por no goce oportuno
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

// ─── Types ──────────────────────────────────────────────────────────────
type TipoCese =
  | 'RENUNCIA_VOLUNTARIA'
  | 'DESPIDO_CAUSA_JUSTA'
  | 'DESPIDO_ARBITRARIO'
  | 'MUTUO_DISENSO'
  | 'TERMINO_CONTRATO'
  | 'NO_RENOVACION'
  | 'FALLECIMIENTO'
  | 'JUBILACION'
  | 'PERIODO_PRUEBA'

type EtapaCese =
  | 'INICIADO'
  | 'CARTA_PREAVISO'
  | 'PERIODO_DESCARGOS'
  | 'CARTA_DESPIDO'
  | 'LIQUIDACION_CALCULADA'
  | 'LIQUIDACION_PAGADA'
  | 'COMPLETADO'
  | 'ANULADO'

// Tipos que requieren proceso de preaviso/descargos (Art. 31 D.Leg. 728)
const TIPOS_CON_PREAVISO: TipoCese[] = ['DESPIDO_CAUSA_JUSTA']

// Flujo de etapas por tipo de cese
function getEtapasRequeridas(tipo: TipoCese): EtapaCese[] {
  switch (tipo) {
    case 'DESPIDO_CAUSA_JUSTA':
      return [
        'INICIADO',
        'CARTA_PREAVISO',
        'PERIODO_DESCARGOS',
        'CARTA_DESPIDO',
        'LIQUIDACION_CALCULADA',
        'LIQUIDACION_PAGADA',
        'COMPLETADO',
      ]
    case 'DESPIDO_ARBITRARIO':
      return [
        'INICIADO',
        'LIQUIDACION_CALCULADA',
        'LIQUIDACION_PAGADA',
        'COMPLETADO',
      ]
    case 'RENUNCIA_VOLUNTARIA':
      return [
        'INICIADO',
        'LIQUIDACION_CALCULADA',
        'LIQUIDACION_PAGADA',
        'COMPLETADO',
      ]
    case 'MUTUO_DISENSO':
      return [
        'INICIADO',
        'LIQUIDACION_CALCULADA',
        'LIQUIDACION_PAGADA',
        'COMPLETADO',
      ]
    case 'TERMINO_CONTRATO':
    case 'NO_RENOVACION':
      return [
        'INICIADO',
        'LIQUIDACION_CALCULADA',
        'LIQUIDACION_PAGADA',
        'COMPLETADO',
      ]
    case 'FALLECIMIENTO':
    case 'JUBILACION':
      return [
        'INICIADO',
        'LIQUIDACION_CALCULADA',
        'LIQUIDACION_PAGADA',
        'COMPLETADO',
      ]
    case 'PERIODO_PRUEBA':
      return ['INICIADO', 'COMPLETADO']
    default:
      return ['INICIADO', 'LIQUIDACION_CALCULADA', 'LIQUIDACION_PAGADA', 'COMPLETADO']
  }
}

// Base legal por tipo de cese
function getBaseLegal(tipo: TipoCese): { norma: string; articulo: string; descripcion: string }[] {
  const base = [
    { norma: 'D.S. 003-97-TR', articulo: 'Art. 16', descripcion: 'Causas de extinción del contrato de trabajo' },
  ]

  switch (tipo) {
    case 'RENUNCIA_VOLUNTARIA':
      base.push(
        { norma: 'D.S. 003-97-TR', articulo: 'Art. 18', descripcion: 'El trabajador debe dar aviso escrito con 30 días de anticipación' },
        { norma: 'D.S. 003-97-TR', articulo: 'Art. 18', descripcion: 'El empleador puede exonerar del plazo de preaviso' },
      )
      break
    case 'DESPIDO_CAUSA_JUSTA':
      base.push(
        { norma: 'D.Leg. 728', articulo: 'Art. 22-25', descripcion: 'Causas justas de despido relacionadas con la conducta o capacidad del trabajador' },
        { norma: 'D.Leg. 728', articulo: 'Art. 31', descripcion: 'Carta de preaviso con mínimo 6 días naturales para que el trabajador presente descargos' },
        { norma: 'D.Leg. 728', articulo: 'Art. 32', descripcion: 'Carta de despido indicando causa y fecha de cese' },
      )
      break
    case 'DESPIDO_ARBITRARIO':
      base.push(
        { norma: 'D.Leg. 728', articulo: 'Art. 34', descripcion: 'Si el despido es arbitrario, el trabajador tiene derecho a indemnización' },
        { norma: 'D.Leg. 728', articulo: 'Art. 38', descripcion: 'Indemnización: 1.5 remuneraciones mensuales por año (tope 12 remuneraciones)' },
      )
      break
    case 'MUTUO_DISENSO':
      base.push(
        { norma: 'D.S. 003-97-TR', articulo: 'Art. 19', descripcion: 'Extinción por acuerdo de ambas partes, debe constar por escrito' },
      )
      break
    case 'TERMINO_CONTRATO':
    case 'NO_RENOVACION':
      base.push(
        { norma: 'D.S. 003-97-TR', articulo: 'Art. 16.c', descripcion: 'Terminación de obra o servicio, cumplimiento de condición resolutoria o vencimiento del plazo' },
      )
      break
    case 'FALLECIMIENTO':
      base.push(
        { norma: 'D.S. 003-97-TR', articulo: 'Art. 16.a', descripcion: 'El fallecimiento del trabajador extingue la relación laboral' },
      )
      break
    case 'JUBILACION':
      base.push(
        { norma: 'D.S. 003-97-TR', articulo: 'Art. 16.f', descripcion: 'Jubilación obligatoria o voluntaria' },
      )
      break
    case 'PERIODO_PRUEBA':
      base.push(
        { norma: 'D.Leg. 728', articulo: 'Art. 10', descripcion: 'Durante el período de prueba (3 meses) el empleador puede resolver sin expresión de causa' },
      )
      break
  }

  // Siempre aplica el pago de liquidación dentro de 48 horas
  base.push(
    { norma: 'D.S. 001-97-TR', articulo: 'Art. 3', descripcion: 'La CTS y demás beneficios deben pagarse dentro de las 48 horas del cese' },
  )

  return base
}

// ─── GET: obtener estado del proceso de cese ────────────────────────────
export const GET = withPlanGateParams<{ id: string }>('workers', 
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const { id: workerId } = params

    const worker = await prisma.worker.findFirst({
      where: { id: workerId, orgId: ctx.orgId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dni: true,
        position: true,
        department: true,
        regimenLaboral: true,
        tipoContrato: true,
        fechaIngreso: true,
        fechaCese: true,
        motivoCese: true,
        sueldoBruto: true,
        asignacionFamiliar: true,
        status: true,
        ceseRecord: true,
      },
    })

    if (!worker) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    if (!worker.ceseRecord) {
      return NextResponse.json({
        worker: {
          id: worker.id,
          firstName: worker.firstName,
          lastName: worker.lastName,
          dni: worker.dni,
          position: worker.position,
          department: worker.department,
          regimenLaboral: worker.regimenLaboral,
          tipoContrato: worker.tipoContrato,
          fechaIngreso: worker.fechaIngreso,
          sueldoBruto: Number(worker.sueldoBruto),
          asignacionFamiliar: worker.asignacionFamiliar,
          status: worker.status,
        },
        ceseRecord: null,
        message: 'No hay proceso de cese iniciado',
      })
    }

    const record = worker.ceseRecord
    const etapasRequeridas = getEtapasRequeridas(record.tipoCese as TipoCese)
    const etapaActualIdx = etapasRequeridas.indexOf(record.etapa as EtapaCese)
    const progreso = etapaActualIdx >= 0
      ? Math.round(((etapaActualIdx + 1) / etapasRequeridas.length) * 100)
      : 0

    return NextResponse.json({
      worker: {
        id: worker.id,
        firstName: worker.firstName,
        lastName: worker.lastName,
        dni: worker.dni,
        position: worker.position,
        department: worker.department,
        regimenLaboral: worker.regimenLaboral,
        tipoContrato: worker.tipoContrato,
        fechaIngreso: worker.fechaIngreso,
        sueldoBruto: Number(worker.sueldoBruto),
        asignacionFamiliar: worker.asignacionFamiliar,
        status: worker.status,
      },
      ceseRecord: {
        ...record,
        sueldoBruto: Number(record.sueldoBruto),
        ctsMonto: Number(record.ctsMonto),
        vacacionesMonto: Number(record.vacacionesMonto),
        gratificacionMonto: Number(record.gratificacionMonto),
        indemnizacionMonto: Number(record.indemnizacionMonto),
        totalLiquidacion: Number(record.totalLiquidacion),
      },
      etapasRequeridas,
      progreso,
      baseLegal: getBaseLegal(record.tipoCese as TipoCese),
    })
  },
)

// ─── POST: iniciar proceso de cese ──────────────────────────────────────
export const POST = withPlanGateParams<{ id: string }>('workers', 
  async (req: NextRequest, ctx: AuthContext, params) => {
    const { id: workerId } = params

    const worker = await prisma.worker.findFirst({
      where: { id: workerId, orgId: ctx.orgId },
      select: {
        id: true,
        orgId: true,
        status: true,
        sueldoBruto: true,
        regimenLaboral: true,
        tipoContrato: true,
        fechaIngreso: true,
        ceseRecord: { select: { id: true } },
      },
    })

    if (!worker) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    if (worker.ceseRecord) {
      return NextResponse.json(
        { error: 'Ya existe un proceso de cese para este trabajador' },
        { status: 409 },
      )
    }

    if (worker.status === 'TERMINATED') {
      return NextResponse.json(
        { error: 'El trabajador ya está cesado' },
        { status: 400 },
      )
    }

    const body = await req.json() as {
      tipoCese: TipoCese
      causaDetalle?: string
      fechaCese: string
      observaciones?: string
    }

    const { tipoCese, causaDetalle, fechaCese, observaciones } = body

    if (!tipoCese || !fechaCese) {
      return NextResponse.json(
        { error: 'tipoCese y fechaCese son requeridos' },
        { status: 400 },
      )
    }

    const now = new Date()
    const fechaCeseDate = new Date(fechaCese)

    // Para despido causa justa: carta preaviso hoy, 6 días para descargos (Art. 31)
    let fechaCartaPreaviso: Date | null = null
    let fechaLimiteDescargos: Date | null = null

    if (TIPOS_CON_PREAVISO.includes(tipoCese)) {
      fechaCartaPreaviso = now
      fechaLimiteDescargos = new Date(now.getTime() + 6 * 24 * 3600 * 1000) // +6 días naturales
    }

    // Determinar etapa inicial
    let etapaInicial: EtapaCese = 'INICIADO'
    if (tipoCese === 'DESPIDO_CAUSA_JUSTA') {
      etapaInicial = 'CARTA_PREAVISO'
    }

    const ceseRecord = await prisma.ceseRecord.create({
      data: {
        orgId: ctx.orgId,
        workerId,
        tipoCese,
        causaDetalle: causaDetalle ?? null,
        fechaInicioProceso: now,
        fechaCese: fechaCeseDate,
        fechaCartaPreaviso,
        fechaLimiteDescargos,
        sueldoBruto: worker.sueldoBruto,
        etapa: etapaInicial,
        observaciones: observaciones ?? null,
      },
    })

    // Crear audit log
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'CESE_INICIADO',
        entityType: 'CeseRecord',
        entityId: ceseRecord.id,
        metadataJson: {
          workerId,
          tipoCese,
          fechaCese,
          etapa: etapaInicial,
        },
      },
    })

    const etapasRequeridas = getEtapasRequeridas(tipoCese)

    return NextResponse.json({
      ceseRecord: {
        ...ceseRecord,
        sueldoBruto: Number(ceseRecord.sueldoBruto),
        ctsMonto: Number(ceseRecord.ctsMonto),
        vacacionesMonto: Number(ceseRecord.vacacionesMonto),
        gratificacionMonto: Number(ceseRecord.gratificacionMonto),
        indemnizacionMonto: Number(ceseRecord.indemnizacionMonto),
        totalLiquidacion: Number(ceseRecord.totalLiquidacion),
      },
      etapasRequeridas,
      baseLegal: getBaseLegal(tipoCese),
    }, { status: 201 })
  },
)

// ─── PATCH: avanzar etapa / guardar liquidación / completar cese ────────
export const PATCH = withPlanGateParams<{ id: string }>('workers', 
  async (req: NextRequest, ctx: AuthContext, params) => {
    const { id: workerId } = params

    const worker = await prisma.worker.findFirst({
      where: { id: workerId, orgId: ctx.orgId },
      select: {
        id: true,
        orgId: true,
        ceseRecord: true,
      },
    })

    if (!worker) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    if (!worker.ceseRecord) {
      return NextResponse.json(
        { error: 'No hay proceso de cese iniciado' },
        { status: 404 },
      )
    }

    const body = await req.json() as {
      action: 'AVANZAR_ETAPA' | 'GUARDAR_LIQUIDACION' | 'COMPLETAR_CESE' | 'ANULAR'
      // Para GUARDAR_LIQUIDACION:
      ctsMonto?: number
      vacacionesMonto?: number
      gratificacionMonto?: number
      indemnizacionMonto?: number
      totalLiquidacion?: number
      detalleJson?: Record<string, unknown>
      // Para avanzar etapas de despido:
      fechaCartaDespido?: string
      // Observaciones
      observaciones?: string
    }

    const record = worker.ceseRecord
    const tipoCese = record.tipoCese as TipoCese
    const etapasRequeridas = getEtapasRequeridas(tipoCese)
    const currentIdx = etapasRequeridas.indexOf(record.etapa as EtapaCese)

    switch (body.action) {
      case 'AVANZAR_ETAPA': {
        if (record.etapa === 'COMPLETADO' || record.etapa === 'ANULADO') {
          return NextResponse.json(
            { error: 'El proceso ya está finalizado' },
            { status: 400 },
          )
        }

        const nextIdx = currentIdx + 1
        if (nextIdx >= etapasRequeridas.length) {
          return NextResponse.json(
            { error: 'No hay más etapas' },
            { status: 400 },
          )
        }

        const nextEtapa = etapasRequeridas[nextIdx]

        const updateData: Record<string, unknown> = {
          etapa: nextEtapa,
        }

        // Si avanza a CARTA_DESPIDO, guardar fecha
        if (nextEtapa === 'CARTA_DESPIDO' && body.fechaCartaDespido) {
          updateData.fechaCartaDespido = new Date(body.fechaCartaDespido)
        }

        if (body.observaciones) {
          updateData.observaciones = body.observaciones
        }

        const updated = await prisma.ceseRecord.update({
          where: { id: record.id },
          data: updateData,
        })

        await prisma.auditLog.create({
          data: {
            orgId: ctx.orgId,
            userId: ctx.userId,
            action: 'CESE_ETAPA_AVANZADA',
            entityType: 'CeseRecord',
            entityId: record.id,
            metadataJson: {
              workerId,
              etapaAnterior: record.etapa,
              etapaNueva: nextEtapa,
            },
          },
        })

        return NextResponse.json({
          ceseRecord: {
            ...updated,
            sueldoBruto: Number(updated.sueldoBruto),
            ctsMonto: Number(updated.ctsMonto),
            vacacionesMonto: Number(updated.vacacionesMonto),
            gratificacionMonto: Number(updated.gratificacionMonto),
            indemnizacionMonto: Number(updated.indemnizacionMonto),
            totalLiquidacion: Number(updated.totalLiquidacion),
          },
          etapasRequeridas,
        })
      }

      case 'GUARDAR_LIQUIDACION': {
        const {
          ctsMonto = 0,
          vacacionesMonto = 0,
          gratificacionMonto = 0,
          indemnizacionMonto = 0,
          totalLiquidacion = 0,
          detalleJson,
        } = body

        const updated = await prisma.ceseRecord.update({
          where: { id: record.id },
          data: {
            ctsMonto,
            vacacionesMonto,
            gratificacionMonto,
            indemnizacionMonto,
            totalLiquidacion,
            detalleJson: detalleJson ? JSON.parse(JSON.stringify(detalleJson)) : undefined,
            etapa: 'LIQUIDACION_CALCULADA',
            observaciones: body.observaciones ?? record.observaciones,
          },
        })

        await prisma.auditLog.create({
          data: {
            orgId: ctx.orgId,
            userId: ctx.userId,
            action: 'LIQUIDACION_GUARDADA',
            entityType: 'CeseRecord',
            entityId: record.id,
            metadataJson: {
              workerId,
              ctsMonto,
              vacacionesMonto,
              gratificacionMonto,
              indemnizacionMonto,
              totalLiquidacion,
            },
          },
        })

        return NextResponse.json({
          ceseRecord: {
            ...updated,
            sueldoBruto: Number(updated.sueldoBruto),
            ctsMonto: Number(updated.ctsMonto),
            vacacionesMonto: Number(updated.vacacionesMonto),
            gratificacionMonto: Number(updated.gratificacionMonto),
            indemnizacionMonto: Number(updated.indemnizacionMonto),
            totalLiquidacion: Number(updated.totalLiquidacion),
          },
        })
      }

      case 'COMPLETAR_CESE': {
        // Marcar liquidación como pagada y completar el proceso
        const now = new Date()

        // Actualizar CeseRecord
        const updated = await prisma.ceseRecord.update({
          where: { id: record.id },
          data: {
            etapa: 'COMPLETADO',
            fechaPagoLiquidacion: now,
            observaciones: body.observaciones ?? record.observaciones,
          },
        })

        // Marcar trabajador como TERMINATED
        const motivoMap: Record<string, string> = {
          RENUNCIA_VOLUNTARIA: 'renuncia',
          DESPIDO_CAUSA_JUSTA: 'despido_causa_justa',
          DESPIDO_ARBITRARIO: 'despido_arbitrario',
          MUTUO_DISENSO: 'mutuo_acuerdo',
          TERMINO_CONTRATO: 'fin_contrato',
          NO_RENOVACION: 'fin_contrato',
          FALLECIMIENTO: 'fallecimiento',
          JUBILACION: 'jubilacion',
          PERIODO_PRUEBA: 'periodo_prueba',
        }

        await prisma.worker.update({
          where: { id: workerId },
          data: {
            status: 'TERMINATED',
            fechaCese: record.fechaCese,
            motivoCese: motivoMap[tipoCese] ?? tipoCese.toLowerCase(),
          },
        })

        await prisma.auditLog.create({
          data: {
            orgId: ctx.orgId,
            userId: ctx.userId,
            action: 'CESE_COMPLETADO',
            entityType: 'CeseRecord',
            entityId: record.id,
            metadataJson: {
              workerId,
              tipoCese,
              fechaCese: record.fechaCese,
              totalLiquidacion: Number(updated.totalLiquidacion),
            },
          },
        })

        return NextResponse.json({
          ceseRecord: {
            ...updated,
            sueldoBruto: Number(updated.sueldoBruto),
            ctsMonto: Number(updated.ctsMonto),
            vacacionesMonto: Number(updated.vacacionesMonto),
            gratificacionMonto: Number(updated.gratificacionMonto),
            indemnizacionMonto: Number(updated.indemnizacionMonto),
            totalLiquidacion: Number(updated.totalLiquidacion),
          },
          workerStatus: 'TERMINATED',
        })
      }

      case 'ANULAR': {
        const updated = await prisma.ceseRecord.update({
          where: { id: record.id },
          data: {
            etapa: 'ANULADO',
            observaciones: body.observaciones
              ? `${record.observaciones ?? ''}\n[ANULADO] ${body.observaciones}`
              : record.observaciones,
          },
        })

        await prisma.auditLog.create({
          data: {
            orgId: ctx.orgId,
            userId: ctx.userId,
            action: 'CESE_ANULADO',
            entityType: 'CeseRecord',
            entityId: record.id,
            metadataJson: { workerId, motivo: body.observaciones },
          },
        })

        return NextResponse.json({
          ceseRecord: {
            ...updated,
            sueldoBruto: Number(updated.sueldoBruto),
            ctsMonto: Number(updated.ctsMonto),
            vacacionesMonto: Number(updated.vacacionesMonto),
            gratificacionMonto: Number(updated.gratificacionMonto),
            indemnizacionMonto: Number(updated.indemnizacionMonto),
            totalLiquidacion: Number(updated.totalLiquidacion),
          },
        })
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
  },
)

