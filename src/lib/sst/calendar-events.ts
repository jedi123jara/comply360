/**
 * Fuentes de eventos SST para el calendario consolidado.
 *
 * Junta en un solo módulo los eventos provenientes de las tablas SST Premium
 * (no SstRecord legacy):
 *   - EMOs próximos a vencer (proximoExamenAntes)
 *   - Visitas Field Audit programadas
 *   - Plazos SAT (fechaHora + plazoLegalHoras según D.S. 006-2022-TR)
 *   - Mandato del Comité SST que vence
 *   - Plan Anual: actividades por mes
 *   - Memoria Anual deadline (1er trimestre del año siguiente)
 *
 * Cada evento devuelve el shape común CalendarEvent. El endpoint del calendario
 * los junta con el resto de fuentes y los ordena.
 */

import { prisma } from '@/lib/prisma'

export interface SstCalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  type: 'SST'
  priority: 'critical' | 'high' | 'medium' | 'low'
  description: string
}

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function priorityForDays(daysLeft: number): SstCalendarEvent['priority'] {
  if (daysLeft < 0) return 'critical'
  if (daysLeft <= 7) return 'high'
  if (daysLeft <= 30) return 'medium'
  return 'low'
}

// ── EMO próximos a vencer ────────────────────────────────────────────────────
export async function getEmoUpcoming(orgId: string): Promise<SstCalendarEvent[]> {
  const today = new Date()
  const ninetyDaysFromNow = new Date()
  ninetyDaysFromNow.setDate(today.getDate() + 90)

  const emos = await prisma.eMO.findMany({
    where: {
      orgId,
      proximoExamenAntes: { not: null, lte: ninetyDaysFromNow },
    },
    select: {
      id: true,
      proximoExamenAntes: true,
      tipoExamen: true,
      worker: { select: { firstName: true, lastName: true } },
    },
    orderBy: { proximoExamenAntes: 'asc' },
    take: 100,
  })

  return emos
    .filter((e): e is typeof e & { proximoExamenAntes: Date } => e.proximoExamenAntes !== null)
    .map((e) => {
      const daysLeft = Math.ceil(
        (e.proximoExamenAntes.getTime() - today.getTime()) / 86400_000,
      )
      return {
        id: `sst-emo-${e.id}`,
        title: `EMO ${e.tipoExamen.toLowerCase()} de ${e.worker.firstName} ${e.worker.lastName}`,
        date: toIsoDate(e.proximoExamenAntes),
        type: 'SST',
        priority: priorityForDays(daysLeft),
        description:
          daysLeft < 0
            ? `EMO vencido hace ${-daysLeft} día(s). R.M. 312-2011-MINSA.`
            : `Próximo examen médico ocupacional en ${daysLeft} día(s).`,
      }
    })
}

// ── Visitas Field Audit programadas ──────────────────────────────────────────
export async function getVisitasProgramadas(orgId: string): Promise<SstCalendarEvent[]> {
  const today = new Date()
  const sixtyDaysFromNow = new Date()
  sixtyDaysFromNow.setDate(today.getDate() + 60)

  const visitas = await prisma.visitaFieldAudit.findMany({
    where: {
      orgId,
      estado: { in: ['PROGRAMADA', 'EN_CAMPO', 'PENDIENTE_INGESTA'] },
      fechaProgramada: { lte: sixtyDaysFromNow },
    },
    select: {
      id: true,
      fechaProgramada: true,
      estado: true,
      sede: { select: { nombre: true } },
      colaborador: { select: { nombre: true, apellido: true } },
    },
    orderBy: { fechaProgramada: 'asc' },
    take: 50,
  })

  return visitas.map((v) => {
    const daysLeft = Math.ceil(
      (v.fechaProgramada.getTime() - today.getTime()) / 86400_000,
    )
    const inspector = v.colaborador
      ? `${v.colaborador.nombre} ${v.colaborador.apellido}`
      : 'inspector por asignar'
    return {
      id: `sst-visita-${v.id}`,
      title: `Visita inspección · ${v.sede.nombre}`,
      date: toIsoDate(v.fechaProgramada),
      type: 'SST',
      priority: priorityForDays(daysLeft),
      description: `Estado: ${v.estado}. Inspector: ${inspector}.`,
    }
  })
}

// ── Plazos SAT por accidentes ────────────────────────────────────────────────
export async function getSatDeadlines(orgId: string): Promise<SstCalendarEvent[]> {
  const accidentes = await prisma.accidente.findMany({
    where: {
      orgId,
      satEstado: { in: ['PENDIENTE', 'EN_PROCESO'] },
    },
    select: {
      id: true,
      fechaHora: true,
      plazoLegalHoras: true,
      tipo: true,
      satEstado: true,
      worker: { select: { firstName: true, lastName: true } },
    },
    orderBy: { fechaHora: 'desc' },
    take: 50,
  })

  const today = new Date()
  return accidentes.map((a) => {
    // Plazo legal SAT: fechaHora + plazoLegalHoras (24 mortal / 720 = 30 días no-mortal / 120 = 5 días enfermedad)
    const deadline = new Date(a.fechaHora.getTime() + a.plazoLegalHoras * 60 * 60 * 1000)
    const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / 86400_000)
    const workerName = a.worker
      ? ` (${a.worker.firstName} ${a.worker.lastName})`
      : ''
    return {
      id: `sst-sat-${a.id}`,
      title: `Plazo SAT · ${a.tipo.replace(/_/g, ' ').toLowerCase()}${workerName}`,
      date: toIsoDate(deadline),
      type: 'SST',
      priority: daysLeft < 0 ? 'critical' : daysLeft <= 1 ? 'critical' : 'high',
      description:
        daysLeft < 0
          ? `Plazo VENCIDO hace ${-daysLeft} día(s). Notifica al SUNAFIL urgente — D.S. 006-2022-TR.`
          : `Plazo SAT vence en ${daysLeft} día(s). Notifica en gob.pe/774 antes.`,
    }
  })
}

// ── Mandato Comité SST ───────────────────────────────────────────────────────
export async function getComiteMandatoEnd(orgId: string): Promise<SstCalendarEvent[]> {
  const today = new Date()
  const ninetyDaysFromNow = new Date()
  ninetyDaysFromNow.setDate(today.getDate() + 90)

  const comites = await prisma.comiteSST.findMany({
    where: {
      orgId,
      estado: 'VIGENTE',
      mandatoFin: { not: null, lte: ninetyDaysFromNow },
    },
    select: {
      id: true,
      mandatoFin: true,
    },
    take: 5,
  })

  return comites
    .filter((c): c is typeof c & { mandatoFin: Date } => c.mandatoFin !== null)
    .map((c) => {
      const daysLeft = Math.ceil((c.mandatoFin.getTime() - today.getTime()) / 86400_000)
      return {
        id: `sst-comite-mandato-${c.id}`,
        title: 'Mandato del Comité SST por vencer',
        date: toIsoDate(c.mandatoFin),
        type: 'SST',
        priority: priorityForDays(daysLeft),
        description: `Programa elecciones nuevas. R.M. 245-2021-TR exige periodicidad bianual.`,
      }
    })
}

// ── Plan Anual: actividades del año ─────────────────────────────────────────
export async function getPlanAnualActividades(orgId: string, year: number): Promise<SstCalendarEvent[]> {
  const record = await prisma.sstRecord.findFirst({
    where: { orgId, type: 'PLAN_ANUAL', title: String(year) },
    select: { data: true },
  })
  if (!record?.data) return []

  interface Actividad {
    id: string
    titulo: string
    area: string
    mes: number
    estado: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA'
  }

  const data = record.data as { actividades?: Actividad[] }
  const actividades = Array.isArray(data.actividades) ? data.actividades : []

  // Cada actividad va al día 15 del mes (mid-month) si no tiene fecha exacta
  return actividades
    .filter((a) => a.estado !== 'COMPLETADA')
    .map((a) => ({
      id: `sst-plan-${a.id}`,
      title: `${a.area}: ${a.titulo}`,
      date: `${year}-${String(a.mes).padStart(2, '0')}-15`,
      type: 'SST',
      priority: a.estado === 'EN_CURSO' ? 'high' : 'medium',
      description: `Actividad del Plan Anual SST ${year}. Estado: ${a.estado.toLowerCase()}.`,
    }))
}

// ── Memoria Anual deadline (Q1 del siguiente año) ────────────────────────────
export function getMemoriaAnualDeadline(year: number): SstCalendarEvent[] {
  // La memoria anual del año Y debe estar lista para presentarse al Comité SST
  // antes de fin de marzo del año Y+1 (práctica estándar Ley 29783).
  return [
    {
      id: `sst-memoria-${year}`,
      title: `Cierre Memoria Anual SST ${year}`,
      date: `${year + 1}-03-31`,
      type: 'SST',
      priority: 'high',
      description: `Memoria Anual SST del año ${year} debe quedar firmada y archivada en el libro de actas del Comité antes del 31 de marzo.`,
    },
  ]
}

// ── Aggregate ────────────────────────────────────────────────────────────────
export async function getAllSstPremiumEvents(
  orgId: string,
  year: number,
): Promise<SstCalendarEvent[]> {
  const [emos, visitas, sat, comites, planAct] = await Promise.all([
    getEmoUpcoming(orgId).catch(() => [] as SstCalendarEvent[]),
    getVisitasProgramadas(orgId).catch(() => [] as SstCalendarEvent[]),
    getSatDeadlines(orgId).catch(() => [] as SstCalendarEvent[]),
    getComiteMandatoEnd(orgId).catch(() => [] as SstCalendarEvent[]),
    getPlanAnualActividades(orgId, year).catch(() => [] as SstCalendarEvent[]),
  ])
  const memoria = getMemoriaAnualDeadline(year)

  return [...emos, ...visitas, ...sat, ...comites, ...planAct, ...memoria]
}
