import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, hasMinRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import type { WorkerStatus, RegimenLaboral, TipoCese } from '@/generated/prisma/client'
import { calcularBoleta, type BoletaInput } from '@/lib/legal-engine/calculators/boleta'
import { calcularLiquidacion } from '@/lib/legal-engine/calculators/liquidacion'
import type { LiquidacionInput, MotivoCese } from '@/lib/legal-engine/types'

const VALID_STATUSES: WorkerStatus[] = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']

const VALID_REGIMENES: RegimenLaboral[] = [
  'GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA', 'AGRARIO', 'CONSTRUCCION_CIVIL',
  'MINERO', 'PESQUERO', 'TEXTIL_EXPORTACION', 'DOMESTICO', 'CAS',
  'MODALIDAD_FORMATIVA', 'TELETRABAJO',
]

const VALID_TIPOS_CESE: TipoCese[] = [
  'RENUNCIA_VOLUNTARIA', 'DESPIDO_CAUSA_JUSTA', 'DESPIDO_ARBITRARIO',
  'MUTUO_DISENSO', 'TERMINO_CONTRATO', 'NO_RENOVACION',
  'FALLECIMIENTO', 'JUBILACION', 'PERIODO_PRUEBA',
]

const MAX_BATCH = 200

/**
 * POST /api/workers/bulk-action
 *
 * Acciones masivas sobre trabajadores. Body siempre incluye:
 *   { ids: string[]; action: string; ...campos según action }
 *
 * Acciones soportadas:
 *
 * Fase 1 — Bulk CRUD:
 *   - change-status: { status: WorkerStatus }
 *   - change-department: { department: string | null }
 *   - change-regimen: { regimenLaboral: RegimenLaboral }
 *   - terminate-bulk: { tipoCese: TipoCese; fechaCese: ISODate; motivoCese: string }
 *
 * Fase 2 — Operaciones laborales recurrentes:
 *   - enroll-course: { courseId: string }                          → crea Enrollment por worker
 *   - bulk-generate-payslips: { periodo: 'YYYY-MM'; incluirGratificacion?: boolean }
 *                                                                  → crea Payslip por worker (idempotente por @@unique[workerId, periodo])
 *   - register-capacitacion: { title: string; topic?: string; fechaCapacitacion: ISODate;
 *                              instructor?: string; horas: number } → crea SstRecord tipo CAPACITACION
 *   - register-entrega-epp: { epps: string[]; fechaEntrega: ISODate; serie?: string }
 *                                                                  → crea SstRecord tipo ENTREGA_EPP
 *
 * Fase 3 — Compliance avanzado / Workflows:
 *   - terminate-with-liquidacion: { tipoCese; fechaCese; motivoCese }
 *       → versión enriquecida de terminate-bulk: además calcula liquidación
 *         (CTS, vacaciones, gratificación, indemnización) y la persiste en CeseRecord
 *         pasando la etapa a LIQUIDACION_CALCULADA
 *   - apply-salary-raise: { mode: 'percent' | 'amount'; value: number; effectiveDate: ISODate }
 *       → ajusta sueldoBruto + crea AuditLog por worker. NO genera addendum (eso lo hace
 *         el admin desde el detalle del worker)
 *   - renew-contracts: { extensionMonths: number }
 *       → solo sobre Contracts type=LABORAL_PLAZO_FIJO con expiresAt. Suma months a expiresAt
 *   - transfer-area: { department: string; position?: string }
 *       → versión enriquecida de change-department con position opcional + AuditLog por worker
 *
 * Todas las acciones excepto change-status excluyen workers ya TERMINATED.
 * Se reportan los workers saltados con razón en `skipped[]`.
 */
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  if (!hasMinRole(ctx.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Se requiere rol ADMIN o superior' }, { status: 403 })
  }

  const body = await req.json()
  const { ids, action } = body as { ids: string[]; action: string }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Se requiere al menos un ID' }, { status: 400 })
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Máximo ${MAX_BATCH} trabajadores por operación` },
      { status: 400 },
    )
  }

  switch (action) {
    case 'change-status': {
      const { status } = body as { status?: string }
      if (!status || !VALID_STATUSES.includes(status as WorkerStatus)) {
        return NextResponse.json(
          { error: `Estado inválido. Opciones: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        )
      }
      const result = await prisma.worker.updateMany({
        where: { id: { in: ids }, orgId: ctx.orgId },
        data: { status: status as WorkerStatus },
      })
      return NextResponse.json({ updated: result.count, skipped: [], action, status })
    }

    case 'change-department': {
      const { department } = body as { department?: string | null }
      // null/string vacío significa quitar el área (sin departamento)
      const dept = department && department.trim() ? department.trim() : null

      // Excluir TERMINATED — no tiene sentido cambiar área a un cesado
      const eligibles = await prisma.worker.findMany({
        where: { id: { in: ids }, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        select: { id: true },
      })
      const eligibleIds = new Set(eligibles.map(w => w.id))
      const skipped = ids
        .filter(id => !eligibleIds.has(id))
        .map(id => ({ id, reason: 'Trabajador cesado o no encontrado' }))

      const result = await prisma.worker.updateMany({
        where: { id: { in: [...eligibleIds] }, orgId: ctx.orgId },
        data: { department: dept },
      })
      return NextResponse.json({ updated: result.count, skipped, action, department: dept })
    }

    case 'set-schedule': {
      const {
        expectedClockInHour,
        expectedClockInMinute,
        expectedClockOutHour,
        expectedClockOutMinute,
        lateToleranceMinutes,
      } = body as {
        expectedClockInHour?: number
        expectedClockInMinute?: number
        expectedClockOutHour?: number
        expectedClockOutMinute?: number
        lateToleranceMinutes?: number
      }
      const fields: { name: string; value: unknown; min: number; max: number; label: string }[] = [
        { name: 'expectedClockInHour', value: expectedClockInHour, min: 0, max: 23, label: 'Hora entrada' },
        { name: 'expectedClockInMinute', value: expectedClockInMinute, min: 0, max: 59, label: 'Minuto entrada' },
        { name: 'expectedClockOutHour', value: expectedClockOutHour, min: 0, max: 23, label: 'Hora salida' },
        { name: 'expectedClockOutMinute', value: expectedClockOutMinute, min: 0, max: 59, label: 'Minuto salida' },
        { name: 'lateToleranceMinutes', value: lateToleranceMinutes, min: 0, max: 120, label: 'Tolerancia' },
      ]
      const data: Record<string, number> = {}
      for (const f of fields) {
        const n = Number(f.value)
        if (!Number.isInteger(n) || n < f.min || n > f.max) {
          return NextResponse.json(
            { error: `${f.label} debe ser un entero entre ${f.min} y ${f.max}` },
            { status: 400 },
          )
        }
        data[f.name] = n
      }
      // Validación cruzada: salida > entrada
      const inMin = data.expectedClockInHour * 60 + data.expectedClockInMinute
      const outMin = data.expectedClockOutHour * 60 + data.expectedClockOutMinute
      if (outMin <= inMin) {
        return NextResponse.json(
          { error: 'La hora de salida debe ser posterior a la de entrada' },
          { status: 400 },
        )
      }

      const eligibles = await prisma.worker.findMany({
        where: { id: { in: ids }, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        select: { id: true },
      })
      const eligibleIds = new Set(eligibles.map(w => w.id))
      const skipped = ids
        .filter(id => !eligibleIds.has(id))
        .map(id => ({ id, reason: 'Trabajador cesado o no encontrado' }))

      const result = await prisma.worker.updateMany({
        where: { id: { in: [...eligibleIds] }, orgId: ctx.orgId },
        data,
      })
      return NextResponse.json({
        updated: result.count,
        skipped,
        action,
        schedule: data,
      })
    }

    case 'change-regimen': {
      const { regimenLaboral } = body as { regimenLaboral?: string }
      if (!regimenLaboral || !VALID_REGIMENES.includes(regimenLaboral as RegimenLaboral)) {
        return NextResponse.json(
          { error: `Régimen inválido. Opciones: ${VALID_REGIMENES.join(', ')}` },
          { status: 400 },
        )
      }

      const eligibles = await prisma.worker.findMany({
        where: { id: { in: ids }, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        select: { id: true },
      })
      const eligibleIds = new Set(eligibles.map(w => w.id))
      const skipped = ids
        .filter(id => !eligibleIds.has(id))
        .map(id => ({ id, reason: 'Trabajador cesado o no encontrado' }))

      const result = await prisma.worker.updateMany({
        where: { id: { in: [...eligibleIds] }, orgId: ctx.orgId },
        data: { regimenLaboral: regimenLaboral as RegimenLaboral },
      })
      return NextResponse.json({ updated: result.count, skipped, action, regimenLaboral })
    }

    case 'terminate-bulk': {
      const { tipoCese, fechaCese, motivoCese } = body as {
        tipoCese?: string
        fechaCese?: string
        motivoCese?: string
      }
      if (!tipoCese || !VALID_TIPOS_CESE.includes(tipoCese as TipoCese)) {
        return NextResponse.json(
          { error: `Tipo de cese inválido. Opciones: ${VALID_TIPOS_CESE.join(', ')}` },
          { status: 400 },
        )
      }
      if (!fechaCese || isNaN(new Date(fechaCese).getTime())) {
        return NextResponse.json({ error: 'fechaCese inválida (formato YYYY-MM-DD)' }, { status: 400 })
      }
      if (!motivoCese || motivoCese.trim().length < 3) {
        return NextResponse.json({ error: 'motivoCese requiere al menos 3 caracteres' }, { status: 400 })
      }

      const fechaCeseDate = new Date(fechaCese)
      const motivoTrim = motivoCese.trim()

      // 1. Workers no cesados, de la org
      const candidates = await prisma.worker.findMany({
        where: { id: { in: ids }, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        select: { id: true, sueldoBruto: true },
      })

      // 2. Workers con CeseRecord previo (no debería pasar si status != TERMINATED, pero cubrimos
      //    el caso de inconsistencia histórica). CeseRecord.workerId es @unique.
      const existingCeses = candidates.length > 0
        ? await prisma.ceseRecord.findMany({
            where: { workerId: { in: candidates.map(w => w.id) } },
            select: { workerId: true },
          })
        : []
      const idsConCese = new Set(existingCeses.map(c => c.workerId))

      const toProcess = candidates.filter(w => !idsConCese.has(w.id))

      // 3. Build skipped list
      const candidateIds = new Set(candidates.map(w => w.id))
      const skipped: { id: string; reason: string }[] = []
      ids.forEach(id => {
        if (!candidateIds.has(id)) {
          skipped.push({ id, reason: 'Trabajador cesado o no encontrado' })
        } else if (idsConCese.has(id)) {
          skipped.push({ id, reason: 'Ya tiene proceso de cese registrado' })
        }
      })

      // 4. Procesar en chunks de 50 — 200 workers x (1 update + 1 ceseRecord) = 400 writes,
      //    chunks evitan timeouts en Postgres y hacen más simple el rollback parcial.
      const CHUNK_SIZE = 50
      let updated = 0
      for (let i = 0; i < toProcess.length; i += CHUNK_SIZE) {
        const chunk = toProcess.slice(i, i + CHUNK_SIZE)
        const chunkIds = chunk.map(w => w.id)
        await prisma.$transaction([
          prisma.worker.updateMany({
            where: { id: { in: chunkIds }, orgId: ctx.orgId },
            data: {
              status: 'TERMINATED',
              fechaCese: fechaCeseDate,
              motivoCese: motivoTrim,
            },
          }),
          ...chunk.map(w =>
            prisma.ceseRecord.create({
              data: {
                workerId: w.id,
                orgId: ctx.orgId,
                tipoCese: tipoCese as TipoCese,
                causaDetalle: motivoTrim,
                fechaInicioProceso: new Date(),
                fechaCese: fechaCeseDate,
                sueldoBruto: w.sueldoBruto,
                etapa: 'INICIADO',
                observaciones: 'Cese masivo — pendiente cálculo de liquidación individual',
              },
            }),
          ),
        ])
        updated += chunk.length
      }

      return NextResponse.json({ updated, skipped, action, tipoCese, fechaCese: fechaCese })
    }

    case 'enroll-course': {
      const { courseId } = body as { courseId?: string }
      if (!courseId || typeof courseId !== 'string') {
        return NextResponse.json({ error: 'courseId requerido' }, { status: 400 })
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, title: true, isActive: true },
      })
      if (!course || !course.isActive) {
        return NextResponse.json({ error: 'Curso no encontrado o inactivo' }, { status: 404 })
      }

      // Workers eligibles (no cesados, de la org)
      const eligibles = await prisma.worker.findMany({
        where: { id: { in: ids }, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        select: { id: true, firstName: true, lastName: true },
      })
      const eligibleIds = new Set(eligibles.map(w => w.id))

      // Workers ya inscritos en este curso
      const existing = eligibles.length > 0
        ? await prisma.enrollment.findMany({
            where: { courseId, workerId: { in: eligibles.map(w => w.id) }, orgId: ctx.orgId },
            select: { workerId: true },
          })
        : []
      const idsAlreadyEnrolled = new Set(existing.map(e => e.workerId).filter(Boolean) as string[])

      const skipped: { id: string; reason: string }[] = []
      ids.forEach(id => {
        if (!eligibleIds.has(id)) skipped.push({ id, reason: 'Trabajador cesado o no encontrado' })
        else if (idsAlreadyEnrolled.has(id)) skipped.push({ id, reason: `Ya inscrito en "${course.title}"` })
      })

      const toEnroll = eligibles.filter(w => !idsAlreadyEnrolled.has(w.id))
      if (toEnroll.length > 0) {
        await prisma.enrollment.createMany({
          data: toEnroll.map(w => ({
            orgId: ctx.orgId,
            workerId: w.id,
            workerName: `${w.firstName} ${w.lastName}`,
            courseId: course.id,
            status: 'NOT_STARTED' as const,
            progress: 0,
          })),
          skipDuplicates: true,
        })
      }

      return NextResponse.json({
        updated: toEnroll.length,
        skipped,
        action,
        courseId: course.id,
        courseTitle: course.title,
      })
    }

    case 'bulk-generate-payslips': {
      const { periodo, incluirGratificacion } = body as {
        periodo?: string
        incluirGratificacion?: boolean
      }
      if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
        return NextResponse.json({ error: 'periodo requiere formato YYYY-MM' }, { status: 400 })
      }

      // Workers con todos los campos que necesita calcularBoleta
      const eligibles = await prisma.worker.findMany({
        where: {
          id: { in: ids },
          orgId: ctx.orgId,
          status: { not: 'TERMINATED' },
          sueldoBruto: { gt: 0 },
        },
        select: {
          id: true,
          sueldoBruto: true,
          asignacionFamiliar: true,
          tipoAporte: true,
          afpNombre: true,
          sctr: true,
          regimenLaboral: true,
        },
      })
      const eligibleIds = new Set(eligibles.map(w => w.id))

      // Workers que ya tienen boleta para este periodo (idempotencia)
      const existing = eligibles.length > 0
        ? await prisma.payslip.findMany({
            where: {
              workerId: { in: eligibles.map(w => w.id) },
              orgId: ctx.orgId,
              periodo,
            },
            select: { workerId: true },
          })
        : []
      const idsConBoleta = new Set(existing.map(p => p.workerId))

      // Acumulado de renta 5ta del año en curso por worker (1 query, no N+1)
      const year = periodo.split('-')[0]
      const prevPayslips = eligibles.length > 0
        ? await prisma.payslip.findMany({
            where: {
              workerId: { in: eligibles.map(w => w.id) },
              orgId: ctx.orgId,
              periodo: { startsWith: year, lt: periodo },
            },
            select: { workerId: true, rentaQuintaCat: true },
          })
        : []
      const acumuladoRenta = new Map<string, number>()
      prevPayslips.forEach(p => {
        const prev = acumuladoRenta.get(p.workerId) ?? 0
        acumuladoRenta.set(p.workerId, prev + Number(p.rentaQuintaCat ?? 0))
      })

      const skipped: { id: string; reason: string }[] = []
      ids.forEach(id => {
        if (!eligibleIds.has(id)) {
          skipped.push({ id, reason: 'Trabajador cesado, sin sueldo o no encontrado' })
        } else if (idsConBoleta.has(id)) {
          skipped.push({ id, reason: `Ya tiene boleta para ${periodo}` })
        }
      })

      const mes = parseInt(periodo.split('-')[1] ?? '0', 10)
      const incluirGrati = incluirGratificacion ?? (mes === 7 || mes === 12)

      const toGenerate = eligibles.filter(w => !idsConBoleta.has(w.id))
      let generated = 0

      // Sin transaction global — cada Payslip independiente. Si falla calcularBoleta
      // para uno (datos malos), los demás siguen.
      for (const w of toGenerate) {
        try {
          const input: BoletaInput = {
            sueldoBruto: Number(w.sueldoBruto),
            asignacionFamiliar: w.asignacionFamiliar,
            tipoAporte: w.tipoAporte as 'AFP' | 'ONP' | 'SIN_APORTE',
            afpNombre: w.afpNombre ?? undefined,
            sctr: w.sctr,
            regimenLaboral: w.regimenLaboral,
            horasExtras: 0,
            bonificaciones: 0,
            incluirGratificacion: incluirGrati,
            mes,
            retencionRentaAcumulada: acumuladoRenta.get(w.id) ?? 0,
          }
          const result = calcularBoleta(input)

          await prisma.payslip.create({
            data: {
              orgId: ctx.orgId,
              workerId: w.id,
              periodo,
              fechaEmision: new Date(),
              sueldoBruto: result.sueldoBruto,
              asignacionFamiliar: result.asignacionFamiliar || null,
              horasExtras: result.horasExtras || null,
              bonificaciones: result.bonificaciones || null,
              totalIngresos: result.totalIngresos,
              aporteAfpOnp: result.aporteAfpOnp || null,
              rentaQuintaCat: result.rentaQuintaCat || null,
              otrosDescuentos: null,
              totalDescuentos: result.totalDescuentos,
              netoPagar: result.netoPagar,
              essalud: result.essalud || null,
              detalleJson: result.detalleJson,
              status: 'EMITIDA',
            },
          })
          generated++
        } catch (err) {
          skipped.push({
            id: w.id,
            reason: `Error en cálculo: ${err instanceof Error ? err.message : 'desconocido'}`,
          })
        }
      }

      return NextResponse.json({ updated: generated, skipped, action, periodo })
    }

    case 'register-capacitacion': {
      const { title, topic, fechaCapacitacion, instructor, horas } = body as {
        title?: string
        topic?: string
        fechaCapacitacion?: string
        instructor?: string
        horas?: number
      }
      if (!title || title.trim().length < 3) {
        return NextResponse.json({ error: 'title requerido (mín 3 caracteres)' }, { status: 400 })
      }
      if (!fechaCapacitacion || isNaN(new Date(fechaCapacitacion).getTime())) {
        return NextResponse.json({ error: 'fechaCapacitacion inválida' }, { status: 400 })
      }
      const horasNum = Number(horas)
      if (!horasNum || horasNum <= 0 || horasNum > 200) {
        return NextResponse.json({ error: 'horas debe ser un número entre 1 y 200' }, { status: 400 })
      }

      const eligibles = await prisma.worker.findMany({
        where: { id: { in: ids }, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        select: { id: true, firstName: true, lastName: true, dni: true },
      })
      const eligibleIds = new Set(eligibles.map(w => w.id))
      const skipped = ids
        .filter(id => !eligibleIds.has(id))
        .map(id => ({ id, reason: 'Trabajador cesado o no encontrado' }))

      if (eligibles.length === 0) {
        return NextResponse.json({ updated: 0, skipped, action }, { status: 200 })
      }

      // 1 SstRecord consolidado con la lista de participantes en data
      const record = await prisma.sstRecord.create({
        data: {
          orgId: ctx.orgId,
          type: 'CAPACITACION',
          title: title.trim(),
          description: topic ? `Tema: ${topic}` : null,
          data: {
            topic: topic ?? null,
            instructor: instructor ?? null,
            horas: horasNum,
            participantes: eligibles.map(w => ({
              workerId: w.id,
              dni: w.dni,
              name: `${w.firstName} ${w.lastName}`,
            })),
          },
          dueDate: new Date(fechaCapacitacion),
          completedAt: new Date(fechaCapacitacion),
          status: 'COMPLETED',
        },
      })

      return NextResponse.json({
        updated: eligibles.length,
        skipped,
        action,
        sstRecordId: record.id,
      })
    }

    case 'register-entrega-epp': {
      const { epps, fechaEntrega, serie } = body as {
        epps?: string[]
        fechaEntrega?: string
        serie?: string
      }
      if (!Array.isArray(epps) || epps.length === 0) {
        return NextResponse.json({ error: 'epps requiere al menos un EPP' }, { status: 400 })
      }
      const eppsClean = epps.map(e => String(e).trim()).filter(Boolean)
      if (eppsClean.length === 0) {
        return NextResponse.json({ error: 'epps no puede estar vacío' }, { status: 400 })
      }
      if (!fechaEntrega || isNaN(new Date(fechaEntrega).getTime())) {
        return NextResponse.json({ error: 'fechaEntrega inválida' }, { status: 400 })
      }

      const eligibles = await prisma.worker.findMany({
        where: { id: { in: ids }, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        select: { id: true, firstName: true, lastName: true, dni: true },
      })
      const eligibleIds = new Set(eligibles.map(w => w.id))
      const skipped = ids
        .filter(id => !eligibleIds.has(id))
        .map(id => ({ id, reason: 'Trabajador cesado o no encontrado' }))

      if (eligibles.length === 0) {
        return NextResponse.json({ updated: 0, skipped, action }, { status: 200 })
      }

      const record = await prisma.sstRecord.create({
        data: {
          orgId: ctx.orgId,
          type: 'ENTREGA_EPP',
          title: `Entrega de EPP — ${new Date(fechaEntrega).toLocaleDateString('es-PE')}`,
          description: serie ? `Serie/Lote: ${serie}` : null,
          data: {
            epps: eppsClean,
            serie: serie ?? null,
            participantes: eligibles.map(w => ({
              workerId: w.id,
              dni: w.dni,
              name: `${w.firstName} ${w.lastName}`,
            })),
          },
          dueDate: new Date(fechaEntrega),
          completedAt: new Date(fechaEntrega),
          status: 'COMPLETED',
        },
      })

      return NextResponse.json({
        updated: eligibles.length,
        skipped,
        action,
        sstRecordId: record.id,
      })
    }

    case 'terminate-with-liquidacion': {
      const { tipoCese, fechaCese, motivoCese } = body as {
        tipoCese?: string
        fechaCese?: string
        motivoCese?: string
      }
      if (!tipoCese || !VALID_TIPOS_CESE.includes(tipoCese as TipoCese)) {
        return NextResponse.json(
          { error: `Tipo de cese inválido. Opciones: ${VALID_TIPOS_CESE.join(', ')}` },
          { status: 400 },
        )
      }
      if (!fechaCese || isNaN(new Date(fechaCese).getTime())) {
        return NextResponse.json({ error: 'fechaCese inválida (formato YYYY-MM-DD)' }, { status: 400 })
      }
      if (!motivoCese || motivoCese.trim().length < 3) {
        return NextResponse.json({ error: 'motivoCese requiere al menos 3 caracteres' }, { status: 400 })
      }

      const fechaCeseDate = new Date(fechaCese)
      const motivoTrim = motivoCese.trim()

      // Mapeo TipoCese (Prisma enum) → MotivoCese (legal engine union)
      const TIPO_TO_MOTIVO: Record<string, MotivoCese> = {
        RENUNCIA_VOLUNTARIA: 'renuncia',
        DESPIDO_CAUSA_JUSTA: 'fin_contrato',
        DESPIDO_ARBITRARIO: 'despido_arbitrario',
        MUTUO_DISENSO: 'mutuo_acuerdo',
        TERMINO_CONTRATO: 'fin_contrato',
        NO_RENOVACION: 'fin_contrato',
        FALLECIMIENTO: 'fin_contrato',
        JUBILACION: 'fin_contrato',
        PERIODO_PRUEBA: 'fin_contrato',
      }
      const motivoEngine = TIPO_TO_MOTIVO[tipoCese] ?? 'fin_contrato'

      // Workers eligibles + sus vacaciones (necesarias para diasNoGozados)
      const candidates = await prisma.worker.findMany({
        where: { id: { in: ids }, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        include: { vacations: { select: { diasPendientes: true } } },
      })

      // Workers con CeseRecord previo (skip)
      const existingCeses = candidates.length > 0
        ? await prisma.ceseRecord.findMany({
            where: { workerId: { in: candidates.map(w => w.id) } },
            select: { workerId: true },
          })
        : []
      const idsConCese = new Set(existingCeses.map(c => c.workerId))

      const candidateIds = new Set(candidates.map(w => w.id))
      const skipped: { id: string; reason: string }[] = []
      ids.forEach(id => {
        if (!candidateIds.has(id)) {
          skipped.push({ id, reason: 'Trabajador cesado o no encontrado' })
        } else if (idsConCese.has(id)) {
          skipped.push({ id, reason: 'Ya tiene proceso de cese registrado' })
        }
      })

      const toProcess = candidates.filter(w => !idsConCese.has(w.id))
      let updated = 0

      // Procesar uno por uno: calcular liquidación + transaction (update worker + create CeseRecord)
      for (const w of toProcess) {
        const sueldoBruto = Number(w.sueldoBruto)
        const fechaIngresoIso = w.fechaIngreso.toISOString().slice(0, 10)
        const fechaCeseIso = fechaCeseDate.toISOString().slice(0, 10)
        const vacacionesNoGozadas = w.vacations.reduce((sum, v) => sum + v.diasPendientes, 0)

        // Aplicar reglas de régimen para liquidación (mismo patrón que /api/workers/[id]/liquidacion)
        let ultimaGrati = sueldoBruto // aproximación = 1 sueldo
        if (w.regimenLaboral === 'MYPE_MICRO') {
          ultimaGrati = 0
        } else if (w.regimenLaboral === 'MYPE_PEQUENA') {
          ultimaGrati = sueldoBruto * 0.5
        }

        const input: LiquidacionInput = {
          sueldoBruto,
          fechaIngreso: fechaIngresoIso,
          fechaCese: fechaCeseIso,
          motivoCese: motivoEngine,
          asignacionFamiliar: w.asignacionFamiliar,
          gratificacionesPendientes: false,
          vacacionesNoGozadas,
          horasExtrasPendientes: 0,
          ultimaGratificacion: ultimaGrati,
          comisionesPromedio: 0,
        }

        let liquidacion
        try {
          liquidacion = calcularLiquidacion(input)
        } catch (err) {
          skipped.push({
            id: w.id,
            reason: `Error en cálculo de liquidación: ${err instanceof Error ? err.message : 'desconocido'}`,
          })
          continue
        }

        // Para MYPE_MICRO ceramos CTS y grati (microempresa no las paga)
        const ctsMonto = w.regimenLaboral === 'MYPE_MICRO' ? 0 : (liquidacion.breakdown.cts?.amount ?? 0)
        const gratiMonto = w.regimenLaboral === 'MYPE_MICRO' ? 0 : (liquidacion.breakdown.gratificacionTrunca?.amount ?? 0)
        const vacMonto = (liquidacion.breakdown.vacacionesTruncas?.amount ?? 0) + (liquidacion.breakdown.vacacionesNoGozadas?.amount ?? 0)
        const indemMonto = liquidacion.breakdown.indemnizacion?.amount ?? 0

        // Recalcular total considerando los ceros de microempresa
        const total = ctsMonto + gratiMonto + vacMonto + indemMonto +
          (liquidacion.breakdown.horasExtras?.amount ?? 0) +
          (liquidacion.breakdown.bonificacionEspecial?.amount ?? 0)

        await prisma.$transaction([
          prisma.worker.update({
            where: { id: w.id },
            data: {
              status: 'TERMINATED',
              fechaCese: fechaCeseDate,
              motivoCese: motivoTrim,
            },
          }),
          prisma.ceseRecord.create({
            data: {
              workerId: w.id,
              orgId: ctx.orgId,
              tipoCese: tipoCese as TipoCese,
              causaDetalle: motivoTrim,
              fechaInicioProceso: new Date(),
              fechaCese: fechaCeseDate,
              sueldoBruto,
              ctsMonto,
              vacacionesMonto: vacMonto,
              gratificacionMonto: gratiMonto,
              indemnizacionMonto: indemMonto,
              totalLiquidacion: total,
              detalleJson: liquidacion.breakdown as unknown as object,
              etapa: 'LIQUIDACION_CALCULADA',
              observaciones: 'Cese masivo con liquidación auto-calculada — pendiente de pago',
            },
          }),
        ])
        updated++
      }

      return NextResponse.json({ updated, skipped, action, tipoCese })
    }

    case 'apply-salary-raise': {
      const { mode, value, effectiveDate } = body as {
        mode?: 'percent' | 'amount'
        value?: number
        effectiveDate?: string
      }
      if (mode !== 'percent' && mode !== 'amount') {
        return NextResponse.json({ error: 'mode debe ser "percent" o "amount"' }, { status: 400 })
      }
      const numValue = Number(value)
      if (isNaN(numValue) || numValue <= 0) {
        return NextResponse.json({ error: 'value debe ser un número positivo' }, { status: 400 })
      }
      // Hard caps de seguridad
      if (mode === 'percent' && numValue > 100) {
        return NextResponse.json({ error: 'Aumento máximo permitido: 100% por operación' }, { status: 400 })
      }
      if (mode === 'amount' && numValue > 50000) {
        return NextResponse.json({ error: 'Aumento fijo máximo permitido: S/ 50,000' }, { status: 400 })
      }
      if (effectiveDate && isNaN(new Date(effectiveDate).getTime())) {
        return NextResponse.json({ error: 'effectiveDate inválida' }, { status: 400 })
      }
      const effDateIso = effectiveDate || new Date().toISOString().slice(0, 10)

      const eligibles = await prisma.worker.findMany({
        where: {
          id: { in: ids },
          orgId: ctx.orgId,
          status: { not: 'TERMINATED' },
          sueldoBruto: { gt: 0 },
        },
        select: { id: true, sueldoBruto: true },
      })
      const eligibleIds = new Set(eligibles.map(w => w.id))
      const skipped = ids
        .filter(id => !eligibleIds.has(id))
        .map(id => ({ id, reason: 'Trabajador cesado, sin sueldo o no encontrado' }))

      // Cap final: ningún sueldo > 999,999 (límite de Decimal(10,2))
      const MAX_SUELDO = 999_999
      let updated = 0
      const auditEntries: { workerId: string; oldSalary: number; newSalary: number }[] = []

      for (const w of eligibles) {
        const oldSalary = Number(w.sueldoBruto)
        let newSalary = mode === 'percent'
          ? oldSalary * (1 + numValue / 100)
          : oldSalary + numValue
        newSalary = Math.round(newSalary * 100) / 100 // 2 decimales

        if (newSalary >= MAX_SUELDO) {
          skipped.push({ id: w.id, reason: `Sueldo resultante excede el límite (${MAX_SUELDO})` })
          continue
        }

        await prisma.worker.update({
          where: { id: w.id },
          data: { sueldoBruto: newSalary },
        })
        auditEntries.push({ workerId: w.id, oldSalary, newSalary })
        updated++
      }

      // 1 AuditLog por worker — RRHH y SUNAFIL piden trazabilidad individual
      if (auditEntries.length > 0) {
        await prisma.auditLog.createMany({
          data: auditEntries.map(e => ({
            orgId: ctx.orgId,
            userId: ctx.userId,
            action: 'worker.salary_raised',
            entityType: 'worker',
            entityId: e.workerId,
            metadataJson: {
              mode,
              value: numValue,
              effectiveDate: effDateIso,
              oldSalary: e.oldSalary,
              newSalary: e.newSalary,
              increasePct: Math.round(((e.newSalary - e.oldSalary) / e.oldSalary) * 10000) / 100,
            },
          })),
        })
      }

      return NextResponse.json({ updated, skipped, action, mode, value: numValue })
    }

    case 'renew-contracts': {
      const { extensionMonths } = body as { extensionMonths?: number }
      const months = Number(extensionMonths)
      if (isNaN(months) || months < 1 || months > 60) {
        return NextResponse.json(
          { error: 'extensionMonths debe ser un entero entre 1 y 60' },
          { status: 400 },
        )
      }

      // Workers no cesados de la org
      const eligibleWorkers = await prisma.worker.findMany({
        where: { id: { in: ids }, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        select: { id: true },
      })
      const eligibleWorkerIds = new Set(eligibleWorkers.map(w => w.id))

      // Buscar Contracts de esos workers que sean LABORAL_PLAZO_FIJO con expiresAt
      const contracts = eligibleWorkerIds.size > 0
        ? await prisma.contract.findMany({
            where: {
              orgId: ctx.orgId,
              type: 'LABORAL_PLAZO_FIJO',
              expiresAt: { not: null },
              status: { not: 'ARCHIVED' },
              workerContracts: {
                some: { workerId: { in: [...eligibleWorkerIds] } },
              },
            },
            select: {
              id: true,
              expiresAt: true,
              workerContracts: { select: { workerId: true } },
            },
          })
        : []

      // Resumen por worker: qué contratos se le renovaron
      const renovadosPorWorker = new Map<string, number>()
      const skipped: { id: string; reason: string }[] = []

      ids.forEach(id => {
        if (!eligibleWorkerIds.has(id)) {
          skipped.push({ id, reason: 'Trabajador cesado o no encontrado' })
        }
      })

      let updatedContracts = 0
      const auditEntries: { contractId: string; workerId: string; oldExpiresAt: Date; newExpiresAt: Date }[] = []

      for (const c of contracts) {
        if (!c.expiresAt) continue
        const newExpiresAt = new Date(c.expiresAt)
        newExpiresAt.setMonth(newExpiresAt.getMonth() + months)
        await prisma.contract.update({
          where: { id: c.id },
          data: { expiresAt: newExpiresAt },
        })
        // El contrato puede tener varios workers (raro pero posible). Atribuimos a cada uno.
        for (const wc of c.workerContracts) {
          if (eligibleWorkerIds.has(wc.workerId)) {
            renovadosPorWorker.set(wc.workerId, (renovadosPorWorker.get(wc.workerId) ?? 0) + 1)
            auditEntries.push({
              contractId: c.id,
              workerId: wc.workerId,
              oldExpiresAt: c.expiresAt,
              newExpiresAt,
            })
          }
        }
        updatedContracts++
      }

      // Workers sin contratos elegibles: skipped
      eligibleWorkers.forEach(w => {
        if (!renovadosPorWorker.has(w.id)) {
          skipped.push({ id: w.id, reason: 'Sin contrato a plazo fijo vigente' })
        }
      })

      if (auditEntries.length > 0) {
        await prisma.auditLog.createMany({
          data: auditEntries.map(e => ({
            orgId: ctx.orgId,
            userId: ctx.userId,
            action: 'contract.renewed',
            entityType: 'contract',
            entityId: e.contractId,
            metadataJson: {
              workerId: e.workerId,
              oldExpiresAt: e.oldExpiresAt.toISOString(),
              newExpiresAt: e.newExpiresAt.toISOString(),
              extensionMonths: months,
            },
          })),
        })
      }

      return NextResponse.json({
        updated: renovadosPorWorker.size,
        contractsUpdated: updatedContracts,
        skipped,
        action,
        extensionMonths: months,
      })
    }

    case 'transfer-area': {
      const { department, position } = body as {
        department?: string
        position?: string
      }
      const dept = department && department.trim() ? department.trim() : null
      if (!dept) {
        return NextResponse.json({ error: 'department requerido (no puede estar vacío)' }, { status: 400 })
      }
      const pos = position && position.trim() ? position.trim() : null

      const eligibles = await prisma.worker.findMany({
        where: { id: { in: ids }, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        select: { id: true, department: true, position: true },
      })
      const eligibleIds = new Set(eligibles.map(w => w.id))
      const skipped = ids
        .filter(id => !eligibleIds.has(id))
        .map(id => ({ id, reason: 'Trabajador cesado o no encontrado' }))

      if (eligibles.length === 0) {
        return NextResponse.json({ updated: 0, skipped, action }, { status: 200 })
      }

      // Update workers (department siempre, position solo si se pasó)
      const updateData: { department: string; position?: string } = { department: dept }
      if (pos) updateData.position = pos
      await prisma.worker.updateMany({
        where: { id: { in: eligibles.map(w => w.id) }, orgId: ctx.orgId },
        data: updateData,
      })

      // 1 AuditLog por worker afectado — trazabilidad individual
      await prisma.auditLog.createMany({
        data: eligibles.map(w => ({
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'worker.transferred',
          entityType: 'worker',
          entityId: w.id,
          metadataJson: {
            oldDepartment: w.department,
            newDepartment: dept,
            oldPosition: w.position,
            newPosition: pos ?? w.position,
          },
        })),
      })

      return NextResponse.json({
        updated: eligibles.length,
        skipped,
        action,
        department: dept,
        position: pos,
      })
    }

    default:
      return NextResponse.json({ error: `Acción no reconocida: ${action}` }, { status: 400 })
  }
})
