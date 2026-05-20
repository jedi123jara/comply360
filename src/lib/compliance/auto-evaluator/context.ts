/**
 * Carga del `EvaluatorContext` — un solo round-trip a la DB para preload todo
 * lo que los evaluators necesitan. Si agregas un evaluator que requiere data
 * adicional, agrégalo acá una vez y reúsalo en todos los evaluators.
 *
 * Los queries son intencionalmente compactos (campos mínimos, sin payload
 * pesado) para que el prefill responda < 5s incluso en orgs con cientos de
 * workers + miles de payslips.
 */

import { prisma } from '@/lib/prisma'
import type {
  EvaluatorContext,
  WorkerForEvaluator,
  ContractForEvaluator,
  WorkerContractForEvaluator,
  PayslipForEvaluator,
  VacationRecordForEvaluator,
  AttendanceForEvaluator,
  CeseRecordForEvaluator,
  WorkerDependentForEvaluator,
  OrgDocumentForEvaluator,
  WorkerDocumentForEvaluator,
  IpercBaseForEvaluator,
  ComiteSstForEvaluator,
  EmoForEvaluator,
  AccidenteForEvaluator,
  ComplaintForEvaluator,
  SstRecordForEvaluator,
  PuestoTrabajoForEvaluator,
  TerceroForEvaluator,
} from './types'

const ATTENDANCE_DAYS_BACK = 90 // ventana suficiente para JD-01/02/05

/** Construye el contexto para todos los evaluators de una org. */
export async function buildEvaluatorContext(orgId: string): Promise<EvaluatorContext> {
  const now = new Date()
  const attendanceFromDate = new Date(now)
  attendanceFromDate.setDate(attendanceFromDate.getDate() - ATTENDANCE_DAYS_BACK)

  const [
    organization,
    workersRaw,
    contractsRaw,
    workerContractsRaw,
    payslipsRaw,
    vacationsRaw,
    attendanceRaw,
    ceseRaw,
    dependentsRaw,
    orgDocsRaw,
    workerDocsRaw,
    ipercBasesRaw,
    comiteSstRaw,
    emoRaw,
    accidentesRaw,
    complaintsRaw,
    sstRecordsRaw,
    puestosRaw,
    tercerosRaw,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        ruc: true,
        sizeRange: true,
        regimenPrincipal: true,
        totalWorkersDeclared: true,
        remypeRegistered: true,
        sector: true,
      },
    }),
    prisma.worker.findMany({
      where: {
        orgId,
        deletedAt: null,
        status: { in: ['ACTIVE', 'ON_LEAVE', 'SUSPENDED'] },
      },
      select: {
        id: true,
        dni: true,
        firstName: true,
        lastName: true,
        status: true,
        regimenLaboral: true,
        tipoContrato: true,
        tipoJornada: true,
        fechaIngreso: true,
        fechaCese: true,
        motivoCese: true,
        sueldoBruto: true,
        asignacionFamiliar: true,
        jornadaSemanal: true,
        tiempoCompleto: true,
        tipoAporte: true,
        condicionEspecial: true,
        discapacidad: true,
        discapacidadCertificado: true,
        nationality: true,
        birthDate: true,
        sctr: true,
        flagTRegistroPresentado: true,
        flagTRegistroFecha: true,
        legajoScore: true,
        gender: true,
      },
    }),
    prisma.contract.findMany({
      where: { orgId },
      select: {
        id: true,
        type: true,
        status: true,
        signedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
    prisma.workerContract.findMany({
      where: { worker: { orgId } },
      select: { workerId: true, contractId: true },
    }),
    prisma.payslip.findMany({
      where: { orgId },
      select: {
        id: true,
        workerId: true,
        periodo: true,
        sueldoBruto: true,
        asignacionFamiliar: true,
        horasExtras: true,
        bonificaciones: true,
        totalIngresos: true,
        aporteAfpOnp: true,
        status: true,
        acceptedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // límite razonable para evitar overfetch
    }),
    prisma.vacationRecord.findMany({
      where: { worker: { orgId } },
      select: {
        id: true,
        workerId: true,
        periodoInicio: true,
        periodoFin: true,
        diasCorresponden: true,
        diasGozados: true,
        diasPendientes: true,
        fechaGoce: true,
        esDoble: true,
      },
    }),
    prisma.attendance.findMany({
      where: {
        orgId,
        workDate: { gte: attendanceFromDate },
      },
      select: {
        id: true,
        workerId: true,
        workDate: true,
        clockIn: true,
        clockOut: true,
        hoursWorked: true,
        status: true,
        isOvertime: true,
        overtimeMinutes: true,
      },
      take: 5000,
    }),
    prisma.ceseRecord.findMany({
      where: { orgId },
      select: {
        id: true,
        workerId: true,
        tipoCese: true,
        fechaInicioProceso: true,
        fechaCese: true,
        fechaCartaPreaviso: true,
        fechaLimiteDescargos: true,
        fechaCartaDespido: true,
        fechaPagoLiquidacion: true,
        indemnizacionMonto: true,
        totalLiquidacion: true,
        etapa: true,
        detalleJson: true,
      },
    }),
    prisma.workerDependent.findMany({
      where: { worker: { orgId }, deletedAt: null },
      select: {
        id: true,
        workerId: true,
        relacion: true,
        birthDate: true,
        esBeneficiarioAsigFam: true,
      },
    }),
    prisma.orgDocument.findMany({
      where: { orgId },
      select: {
        id: true,
        type: true,
        title: true,
        fileUrl: true,
        publishedAt: true,
        validUntil: true,
        acknowledgmentRequired: true,
      },
    }),
    prisma.workerDocument.findMany({
      where: { worker: { orgId } },
      select: {
        id: true,
        workerId: true,
        category: true,
        documentType: true,
        status: true,
        isRequired: true,
        expiresAt: true,
        verifiedAt: true,
        verifiedBy: true,
      },
    }),
    prisma.iPERCBase.findMany({
      where: { orgId },
      select: {
        id: true,
        estado: true,
        version: true,
        fechaAprobacion: true,
      },
    }),
    prisma.comiteSST.findFirst({
      where: { orgId, estado: 'VIGENTE' },
      select: {
        id: true,
        estado: true,
        mandatoInicio: true,
        mandatoFin: true,
        libroActasUrl: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.eMO.findMany({
      where: { orgId },
      select: {
        id: true,
        workerId: true,
        tipoExamen: true,
        fechaExamen: true,
        aptitud: true,
        proximoExamenAntes: true,
      },
    }),
    prisma.accidente.findMany({
      where: { orgId },
      select: {
        id: true,
        tipo: true,
        fechaHora: true,
        plazoLegalHoras: true,
        satNumeroManual: true,
      },
    }),
    prisma.complaint.findMany({
      where: { orgId },
      select: {
        id: true,
        type: true,
        status: true,
        receivedAt: true,
        resolvedAt: true,
        protectionMeasures: true,
        timeline: {
          select: {
            action: true,
            description: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.sstRecord.findMany({
      where: { orgId },
      select: {
        id: true,
        type: true,
        status: true,
        dueDate: true,
        completedAt: true,
      },
    }),
    prisma.puestoTrabajo.findMany({
      where: { orgId },
      select: {
        id: true,
        sedeId: true,
        workerId: true,
        exposicionFisica: true,
        exposicionQuimica: true,
        exposicionBiologica: true,
        exposicionErgonomica: true,
        exposicionPsicosocial: true,
        requiereAlturas: true,
        requiereEspacioConfinado: true,
        requiereSCTR: true,
      },
    }),
    prisma.tercero.findMany({
      where: { orgId },
      select: {
        id: true,
        razonSocial: true,
        ruc: true,
        tipoServicio: true,
        trabajadoresAsignados: true,
        isActividadPrincipal: true,
        contratoUrl: true,
        fechaInicio: true,
        fechaFin: true,
        isActive: true,
      },
    }),
  ])

  if (!organization) {
    throw new Error(`Organization ${orgId} not found`)
  }

  // Normalización: Prisma Decimal → number, Date → Date, null-safety
  const workers: WorkerForEvaluator[] = workersRaw.map((w) => ({
    ...w,
    sueldoBruto: Number(w.sueldoBruto),
  }))

  const contracts: ContractForEvaluator[] = contractsRaw

  const workerContracts: WorkerContractForEvaluator[] = workerContractsRaw

  const payslips: PayslipForEvaluator[] = payslipsRaw.map((p) => ({
    ...p,
    sueldoBruto: Number(p.sueldoBruto),
    asignacionFamiliar: p.asignacionFamiliar ? Number(p.asignacionFamiliar) : null,
    horasExtras: p.horasExtras ? Number(p.horasExtras) : null,
    bonificaciones: p.bonificaciones ? Number(p.bonificaciones) : null,
    totalIngresos: Number(p.totalIngresos),
    aporteAfpOnp: p.aporteAfpOnp ? Number(p.aporteAfpOnp) : null,
  }))

  const vacationRecords: VacationRecordForEvaluator[] = vacationsRaw

  const attendanceRecent: AttendanceForEvaluator[] = attendanceRaw.map((a) => ({
    ...a,
    hoursWorked: a.hoursWorked ? Number(a.hoursWorked) : null,
  }))

  const ceseRecords: CeseRecordForEvaluator[] = ceseRaw.map((c) => ({
    ...c,
    indemnizacionMonto: Number(c.indemnizacionMonto),
    totalLiquidacion: Number(c.totalLiquidacion),
  }))

  const workerDependents: WorkerDependentForEvaluator[] = dependentsRaw

  const orgDocuments: OrgDocumentForEvaluator[] = orgDocsRaw

  const workerDocuments: WorkerDocumentForEvaluator[] = workerDocsRaw

  const ipercBases: IpercBaseForEvaluator[] = ipercBasesRaw

  const comiteSst: ComiteSstForEvaluator | null = comiteSstRaw

  const emoRecords: EmoForEvaluator[] = emoRaw

  const accidentes: AccidenteForEvaluator[] = accidentesRaw

  const complaints: ComplaintForEvaluator[] = complaintsRaw

  const sstRecords: SstRecordForEvaluator[] = sstRecordsRaw

  const puestosTrabajo: PuestoTrabajoForEvaluator[] = puestosRaw

  const terceros: TerceroForEvaluator[] = tercerosRaw

  return {
    orgId,
    now,
    organization,
    workerCount: workers.length,
    workers,
    contracts,
    workerContracts,
    payslips,
    vacationRecords,
    attendanceRecent,
    ceseRecords,
    workerDependents,
    orgDocuments,
    workerDocuments,
    ipercBases,
    comiteSst,
    emoRecords,
    accidentes,
    complaints,
    sstRecords,
    puestosTrabajo,
    terceros,
  }
}

/** Helpers que los evaluators usan repetidamente. */

/** Workers que tienen al menos un contrato vigente (SIGNED/APPROVED). */
export function workersWithActiveContract(ctx: EvaluatorContext): Set<string> {
  const activeContractIds = new Set(
    ctx.contracts
      .filter((c) => c.status === 'SIGNED' || c.status === 'APPROVED')
      .map((c) => c.id)
  )
  const workerIds = new Set<string>()
  for (const wc of ctx.workerContracts) {
    if (activeContractIds.has(wc.contractId)) workerIds.add(wc.workerId)
  }
  return workerIds
}

/** Workers con contrato a tiempo parcial (Worker.tipoContrato='TIEMPO_PARCIAL'). */
export function workersTiempoParcial(ctx: EvaluatorContext): WorkerForEvaluator[] {
  return ctx.workers.filter((w) => w.tipoContrato === 'TIEMPO_PARCIAL')
}

/** Workers practicantes (régimen MODALIDAD_FORMATIVA). */
export function workersPracticantes(ctx: EvaluatorContext): WorkerForEvaluator[] {
  return ctx.workers.filter((w) => w.regimenLaboral === 'MODALIDAD_FORMATIVA')
}

/** Edad calculada al `now` del contexto. */
export function workerAge(w: WorkerForEvaluator, now: Date): number | null {
  if (!w.birthDate) return null
  const ms = now.getTime() - w.birthDate.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25))
}
