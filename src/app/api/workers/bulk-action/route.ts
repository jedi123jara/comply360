import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, hasMinRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import type { WorkerStatus, RegimenLaboral, TipoCese } from '@/generated/prisma/client'
import { calcularBoleta, type BoletaInput } from '@/lib/legal-engine/calculators/boleta'

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

    default:
      return NextResponse.json({ error: `Acción no reconocida: ${action}` }, { status: 400 })
  }
})
