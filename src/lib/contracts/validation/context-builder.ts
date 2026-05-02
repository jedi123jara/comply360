// =============================================
// CONTRACT VALIDATION ENGINE — CONTEXT BUILDER
//
// Lee Contract + Worker(s) vinculados + Organization + histórico modal y
// devuelve un ValidationContext congelado, listo para que el evaluador lo
// consuma sin tocar Prisma.
//
// Este es el ÚNICO archivo de la carpeta validation/ que toca BD para
// LEER (engine.ts toca BD para ESCRIBIR resultados).
// =============================================

import { prisma } from '@/lib/prisma'
import type { ValidationContext } from './types'
import type { ContractType } from '@/generated/prisma/client'

// Constantes peruanas vigentes 2026 — ver docs/specs/contract-generator-spec.md §1
// TODO (chunk siguiente): mover a tabla `LegalConstants` versionada por año
const UIT_2026 = 5500
const RMV_2026 = 1130
const MAX_MODAL_TOTAL_DAYS = 1825 // 5 años — Art. 74 LPCL

// Tipos de contrato modal (Cap. II, III, IV del D.Leg. 728). Los demás
// (INDEFINIDO, TIEMPO_PARCIAL, etc.) no entran en la suma del Art. 74.
const MODAL_CONTRACT_TYPES: ContractType[] = [
  'LABORAL_PLAZO_FIJO', // genérico — el catálogo nuevo lo desglosa, mantenemos por compatibilidad
]

export class ContractNotFoundError extends Error {
  constructor(public contractId: string) {
    super(`Contract ${contractId} no encontrado`)
    this.name = 'ContractNotFoundError'
  }
}

function diffDays(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Lee del contrato y devuelve qué se puede inferir como cause objetiva,
 * fechas, salario, etc. desde formData. El schema actual de Contract es
 * libre (formData JSON), por eso la inferencia se hace acá y no en el
 * evaluador.
 */
function extractFromFormData(formData: Record<string, unknown> | null) {
  if (!formData) {
    return {
      causeObjective: null as string | null,
      startDate: null as Date | null,
      endDate: null as Date | null,
      monthlySalary: null as number | null,
      position: null as string | null,
      weeklyHours: null as number | null,
    }
  }

  const cause =
    String(formData.causa_objetiva ?? formData.causaObjetiva ?? '').trim() ||
    String(formData.objeto_contrato ?? '').trim() ||
    null

  const startRaw = formData.fecha_inicio ?? formData.fechaInicio ?? null
  const endRaw = formData.fecha_fin ?? formData.fechaFin ?? null
  const start = startRaw ? new Date(String(startRaw)) : null
  const end = endRaw ? new Date(String(endRaw)) : null

  const salaryRaw = formData.remuneracion ?? formData.sueldo ?? formData.monthlySalary ?? null
  const salary = salaryRaw === null || salaryRaw === '' ? null : Number(salaryRaw)

  const position = (formData.cargo ?? formData.puesto ?? null) as string | null

  const hoursRaw = formData.jornada_semanal ?? formData.jornadaSemanal ?? formData.weekly_hours ?? null
  const weeklyHours = hoursRaw === null || hoursRaw === '' ? null : Number(hoursRaw)

  return {
    causeObjective: cause || null,
    startDate: start && !Number.isNaN(start.getTime()) ? start : null,
    endDate: end && !Number.isNaN(end.getTime()) ? end : null,
    monthlySalary: salary !== null && Number.isFinite(salary) ? salary : null,
    position: position ? String(position) : null,
    weeklyHours: weeklyHours !== null && Number.isFinite(weeklyHours) ? weeklyHours : null,
  }
}

/**
 * Construye el ValidationContext para un contrato dado.
 * Throws si el contrato no existe o no pertenece a la org.
 */
export async function buildValidationContext(
  contractId: string,
  orgId: string,
): Promise<ValidationContext> {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, orgId },
    include: {
      organization: {
        select: { id: true, regimenPrincipal: true, ruc: true },
      },
      workerContracts: {
        include: {
          worker: {
            select: {
              id: true,
              dni: true,
              firstName: true,
              lastName: true,
              regimenLaboral: true,
              fechaIngreso: true,
              sueldoBruto: true,
              nationality: true,
            },
          },
        },
      },
    },
  })

  if (!contract) {
    throw new ContractNotFoundError(contractId)
  }

  const formData = (contract.formData ?? null) as Record<string, unknown> | null
  const extracted = extractFromFormData(formData)

  // Construir snapshot de workers vinculados
  const workers = contract.workerContracts.map((wc) => ({
    id: wc.worker.id,
    dni: wc.worker.dni,
    fullName: `${wc.worker.firstName} ${wc.worker.lastName}`.trim(),
    regimenLaboral: wc.worker.regimenLaboral,
    fechaIngreso: wc.worker.fechaIngreso,
    sueldoBruto: Number(wc.worker.sueldoBruto),
    isPregnant: extractGestanteFlag(formData, wc.worker.id),
    nationality: wc.worker.nationality,
  }))

  // Histórico modal: para cada worker vinculado, buscamos contratos modales
  // anteriores (no archivados) — sirve para suma del Art. 74 LPCL.
  const workerIds = workers.map((w) => w.id)
  const historyRaw = workerIds.length
    ? await prisma.contract.findMany({
        where: {
          orgId,
          id: { not: contractId },
          status: { not: 'ARCHIVED' },
          type: { in: MODAL_CONTRACT_TYPES },
          workerContracts: { some: { workerId: { in: workerIds } } },
        },
        select: {
          id: true,
          type: true,
          formData: true,
          createdAt: true,
        },
      })
    : []

  const workerModalHistory = historyRaw
    .map((h) => {
      const fd = (h.formData ?? null) as Record<string, unknown> | null
      const ex = extractFromFormData(fd)
      const start = ex.startDate ?? h.createdAt
      const end = ex.endDate
      const days = end ? Math.max(0, diffDays(start, end)) : 0
      return {
        contractId: h.id,
        type: h.type,
        startDate: start,
        endDate: end,
        durationDays: days,
      }
    })
    .filter((h) => h.durationDays > 0)

  return {
    contract: {
      id: contract.id,
      type: contract.type,
      title: contract.title,
      status: contract.status,
      startDate: extracted.startDate,
      endDate: extracted.endDate ?? contract.expiresAt,
      causeObjective: extracted.causeObjective,
      position: extracted.position,
      monthlySalary: extracted.monthlySalary,
      weeklyHours: extracted.weeklyHours,
      formData,
      contentHtml: contract.contentHtml,
    },
    organization: {
      id: contract.organization.id,
      regimenPrincipal: contract.organization.regimenPrincipal,
      ruc: contract.organization.ruc,
    },
    workers,
    workerModalHistory,
    constants: {
      UIT: UIT_2026,
      RMV: RMV_2026,
      MAX_MODAL_TOTAL_DAYS,
    },
  }
}

/**
 * Heurística para flag de gestación: por ahora se lee del formData del
 * contrato (campo "trabajadora_gestante" o "gestante"). El módulo Workers
 * no almacena este dato hoy; cuando lo haga, este helper se actualizará.
 */
function extractGestanteFlag(
  formData: Record<string, unknown> | null,
  _workerId: string,
): boolean {
  if (!formData) return false
  const raw = formData.trabajadora_gestante ?? formData.gestante ?? formData.es_gestante
  if (raw === undefined || raw === null) return false
  if (typeof raw === 'boolean') return raw
  const str = String(raw).toLowerCase().trim()
  return str === 'true' || str === 'si' || str === 'sí' || str === '1' || str === 'yes'
}
