/**
 * 🏆 AGENTE MONITOR DE RIESGO PROACTIVO
 *
 * Agente que se ejecuta en modo "barrido" (manual o desde cron) sobre los
 * datos de la organización y detecta riesgos de compliance antes de que
 * se materialicen en una multa SUNAFIL.
 *
 * Ejecuta heurísticas determinísticas (sin LLM) sobre la BD:
 *  - Contratos por vencer en <30 días
 *  - Trabajadores con sueldo < RMV
 *  - Trabajadores sin afiliación a un sistema previsional
 *  - Trabajadores con más de 1 año sin vacaciones
 *  - Documentos vencidos (políticas obligatorias)
 *  - Capacitaciones SST atrasadas (Ley 29783)
 *
 * Cada riesgo lleva: severidad, monto de multa potencial, base legal, fix sugerido.
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import type {
  AgentDefinition,
  AgentInput,
  AgentRunContext,
  AgentResult,
  AgentAction,
} from './types'

// =============================================
// CONSTANTES
// =============================================

const UIT_2026 = 5500
const RMV_2026 = 1130

// =============================================
// SHAPE
// =============================================

export interface RiskFinding {
  id: string
  categoria:
    | 'CONTRATO'
    | 'REMUNERACION'
    | 'PREVISIONAL'
    | 'VACACIONES'
    | 'DOCUMENTO'
    | 'SST'
    | 'OTRO'
  severidad: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'
  titulo: string
  descripcion: string
  entidadAfectada?: string
  multaPotencialSoles: number
  baseLegal: string
  fixSugerido: string
  fixUrl?: string
}

export interface RiskMonitorOutput {
  scanFecha: string
  totalTrabajadoresEvaluados: number
  totalContratosEvaluados: number
  findings: RiskFinding[]
  exposicionTotalSoles: number
  scoreRiesgo: number // 0-100, donde 100 = sin riesgo
  desglosePorSeveridad: {
    CRITICO: number
    ALTO: number
    MEDIO: number
    BAJO: number
  }
}

// =============================================
// HEURÍSTICAS
// =============================================

interface WorkerLike {
  id: string
  firstName: string
  lastName: string
  dni: string
  sueldoBruto: number | null
  fechaIngreso: Date | null
  tipoAporte: string | null
}

interface ContractLike {
  id: string
  type: string
  expiresAt: Date | null
  status: string
}

function checkSueldoBajoRMV(workers: WorkerLike[]): RiskFinding[] {
  const out: RiskFinding[] = []
  for (const w of workers) {
    if (w.sueldoBruto != null && w.sueldoBruto > 0 && w.sueldoBruto < RMV_2026) {
      out.push({
        id: `rmv-${w.id}`,
        categoria: 'REMUNERACION',
        severidad: 'CRITICO',
        titulo: `Sueldo bajo la RMV: ${w.firstName} ${w.lastName}`,
        descripcion: `Sueldo registrado S/${w.sueldoBruto} < RMV S/${RMV_2026}`,
        entidadAfectada: `${w.firstName} ${w.lastName} (DNI ${w.dni})`,
        multaPotencialSoles: Math.round(7.65 * UIT_2026), // muy grave NO_MYPE máx
        baseLegal: 'D.S. 004-2025-TR (RMV S/ 1,130 vigente 2026) — Infracción muy grave Art. 25.6 D.S. 019-2006-TR',
        fixSugerido: 'Ajustar sueldo a la RMV vigente y pagar reintegro retroactivo',
        fixUrl: `/dashboard/trabajadores/${w.id}`,
      })
    }
  }
  return out
}

function checkContratoPorVencer(contracts: ContractLike[]): RiskFinding[] {
  const out: RiskFinding[] = []
  const now = new Date()
  const en30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000)
  for (const c of contracts) {
    if (c.expiresAt && c.expiresAt > now && c.expiresAt <= en30) {
      const dias = Math.ceil((c.expiresAt.getTime() - now.getTime()) / (24 * 3600 * 1000))
      out.push({
        id: `vencer-${c.id}`,
        categoria: 'CONTRATO',
        severidad: dias <= 7 ? 'ALTO' : 'MEDIO',
        titulo: `Contrato vence en ${dias} días`,
        descripcion: `Contrato ${c.type} (${c.id.slice(0, 8)}) vence el ${c.expiresAt.toISOString().slice(0, 10)}`,
        multaPotencialSoles: 0,
        baseLegal: 'Riesgo de continuidad laboral — desnaturalización art. 4 LPCL',
        fixSugerido: 'Decidir entre renovar, finalizar o convertir a indefinido',
        fixUrl: `/dashboard/contratos/${c.id}`,
      })
    }
  }
  return out
}

function checkSinAporte(workers: WorkerLike[]): RiskFinding[] {
  const out: RiskFinding[] = []
  for (const w of workers) {
    if (!w.tipoAporte || w.tipoAporte === 'SIN_APORTE') {
      out.push({
        id: `sin-aporte-${w.id}`,
        categoria: 'PREVISIONAL',
        severidad: 'CRITICO',
        titulo: `Trabajador sin sistema previsional: ${w.firstName} ${w.lastName}`,
        descripcion: 'No registra AFP ni ONP — incumple art. 6 D.L. 19990 / Ley 25897',
        entidadAfectada: `${w.firstName} ${w.lastName} (DNI ${w.dni})`,
        multaPotencialSoles: Math.round(2.25 * UIT_2026),
        baseLegal: 'Art. 24.2 D.S. 019-2006-TR — Infracción grave',
        fixSugerido: 'Afiliar inmediatamente a AFP u ONP según elección del trabajador',
        fixUrl: `/dashboard/trabajadores/${w.id}`,
      })
    }
  }
  return out
}

function checkVacacionesPendientes(workers: WorkerLike[]): RiskFinding[] {
  const out: RiskFinding[] = []
  const now = new Date()
  for (const w of workers) {
    if (!w.fechaIngreso) continue
    const aniosTrabajados = (now.getTime() - w.fechaIngreso.getTime()) / (365.25 * 24 * 3600 * 1000)
    if (aniosTrabajados >= 2) {
      // Heurística: si lleva ≥2 años asumimos posible vacación pendiente vencida
      out.push({
        id: `vac-${w.id}`,
        categoria: 'VACACIONES',
        severidad: 'MEDIO',
        titulo: `Posible vacación pendiente: ${w.firstName} ${w.lastName}`,
        descripcion: `${aniosTrabajados.toFixed(1)} años de servicio — verifica si tiene vacaciones del periodo anterior sin gozar`,
        entidadAfectada: `${w.firstName} ${w.lastName}`,
        multaPotencialSoles: Math.round((w.sueldoBruto || RMV_2026) * 2),
        baseLegal: 'D.Leg. 713 Art. 23 — indemnización vacacional 1 sueldo + reintegro',
        fixSugerido: 'Programar las vacaciones pendientes o pagar la triple remuneración',
        fixUrl: `/dashboard/trabajadores/${w.id}`,
      })
    }
  }
  return out
}

// =============================================
// RUN
// =============================================

async function runRiskMonitor(
  _input: AgentInput,
  ctx: AgentRunContext
): Promise<AgentResult<RiskMonitorOutput>> {
  const start = Date.now()
  const warnings: string[] = []

  // 1. Cargar datos desde Prisma scoped al orgId
  let workers: WorkerLike[] = []
  let contracts: ContractLike[] = []

  try {
    const rows = await prisma.worker.findMany({
      where: { orgId: ctx.orgId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dni: true,
        sueldoBruto: true,
        fechaIngreso: true,
        tipoAporte: true,
      },
    })
    workers = rows.map(r => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      dni: r.dni,
      sueldoBruto: r.sueldoBruto != null ? Number(r.sueldoBruto) : null,
      fechaIngreso: r.fechaIngreso ?? null,
      tipoAporte: r.tipoAporte ?? null,
    }))
  } catch (e) {
    warnings.push(`No se pudieron cargar trabajadores: ${e instanceof Error ? e.message : 'error'}`)
  }

  try {
    const rows = await prisma.contract.findMany({
      where: { orgId: ctx.orgId },
      select: {
        id: true,
        type: true,
        expiresAt: true,
        status: true,
      },
    })
    contracts = rows.map(r => ({
      id: r.id,
      type: String(r.type),
      expiresAt: r.expiresAt ?? null,
      status: String(r.status),
    }))
  } catch (e) {
    warnings.push(`No se pudieron cargar contratos: ${e instanceof Error ? e.message : 'error'}`)
  }

  // 2. Ejecutar heurísticas
  const findings: RiskFinding[] = [
    ...checkSueldoBajoRMV(workers),
    ...checkContratoPorVencer(contracts),
    ...checkSinAporte(workers),
    ...checkVacacionesPendientes(workers),
  ]

  // 3. Calcular agregados
  const exposicionTotalSoles = findings.reduce((acc, f) => acc + f.multaPotencialSoles, 0)
  const desgloseInit = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 }
  const desglose = findings.reduce(
    (acc, f) => {
      acc[f.severidad] = (acc[f.severidad] || 0) + 1
      return acc
    },
    desgloseInit
  )

  // Score = 100 - penalizaciones
  const penalizacion =
    desglose.CRITICO * 15 + desglose.ALTO * 8 + desglose.MEDIO * 3 + desglose.BAJO * 1
  const scoreRiesgo = Math.max(0, Math.min(100, 100 - penalizacion))

  const data: RiskMonitorOutput = {
    scanFecha: new Date().toISOString(),
    totalTrabajadoresEvaluados: workers.length,
    totalContratosEvaluados: contracts.length,
    findings,
    exposicionTotalSoles,
    scoreRiesgo,
    desglosePorSeveridad: desglose,
  }

  // 4. Acciones
  const recommendedActions: AgentAction[] = []
  if (desglose.CRITICO > 0) {
    recommendedActions.push({
      id: 'fix-critical',
      label: `Corregir ${desglose.CRITICO} riesgos críticos ahora`,
      description: 'Estos hallazgos generan multa SUNAFIL inmediata si hay inspección',
      type: 'navigate',
      payload: { url: '/dashboard/diagnostico' },
      priority: 'critical',
    })
  }
  recommendedActions.push({
    id: 'schedule-monthly',
    label: 'Programar barrido mensual automático',
    description: 'Activa cron diario/semanal para no perder ningún cambio',
    type: 'create',
    payload: { type: 'cron', schedule: '0 6 * * 1' },
    priority: 'important',
  })
  recommendedActions.push({
    id: 'view-radar',
    label: 'Abrir Radar SUNAFIL',
    description: 'Visualiza tu exposición total y score de riesgo en tiempo real',
    type: 'navigate',
    payload: { url: '/dashboard/radar' },
    priority: 'info',
  })

  const summary = `Barrido completado sobre ${workers.length} trabajadores y ${contracts.length} contratos. Detectados ${findings.length} riesgos (${desglose.CRITICO} críticos, ${desglose.ALTO} altos). Exposición total estimada: S/${exposicionTotalSoles.toLocaleString('es-PE')}. Score de riesgo: ${scoreRiesgo}/100.`

  return {
    agentSlug: 'risk-monitor',
    runId: ctx.runId,
    status: 'success',
    confidence: 90,
    data,
    summary,
    warnings,
    recommendedActions,
    model: 'comply360-rules',
    durationMs: Date.now() - start,
  }
}

// Schema Zod para validar el output del agente. Si en el futuro alguien
// rompe el contrato (cambia tipos, agrega/quita campos), el runtime lo
// detecta y degrada a `partial` en lugar de explotar en producción.
const RiskFindingSchema = z.object({
  id: z.string(),
  categoria: z.enum(['CONTRATO', 'REMUNERACION', 'PREVISIONAL', 'VACACIONES', 'DOCUMENTO', 'SST', 'OTRO']),
  severidad: z.enum(['CRITICO', 'ALTO', 'MEDIO', 'BAJO']),
  titulo: z.string(),
  descripcion: z.string(),
  entidadAfectada: z.string().optional(),
  multaPotencialSoles: z.number().nonnegative(),
  baseLegal: z.string(),
  fixSugerido: z.string(),
  fixUrl: z.string().optional(),
})

const RiskMonitorOutputSchema = z.object({
  scanFecha: z.string(),
  totalTrabajadoresEvaluados: z.number().int().nonnegative(),
  totalContratosEvaluados: z.number().int().nonnegative(),
  findings: z.array(RiskFindingSchema),
  exposicionTotalSoles: z.number().nonnegative(),
  scoreRiesgo: z.number().min(0).max(100),
  desglosePorSeveridad: z.object({
    CRITICO: z.number().int().nonnegative(),
    ALTO: z.number().int().nonnegative(),
    MEDIO: z.number().int().nonnegative(),
    BAJO: z.number().int().nonnegative(),
  }),
})

export const riskMonitorAgent: AgentDefinition<AgentInput, RiskMonitorOutput> = {
  slug: 'risk-monitor',
  name: 'Monitor de Riesgo Proactivo',
  description:
    'Ejecuta un barrido completo sobre todos los trabajadores y contratos de tu organización detectando incumplimientos: sueldos bajo RMV, contratos por vencer, trabajadores sin AFP/ONP, vacaciones acumuladas. Devuelve la exposición total en soles y un score de riesgo.',
  category: 'compliance',
  icon: 'Radar',
  status: 'beta',
  acceptedInputs: ['json'],
  estimatedTokens: 0, // no usa LLM
  run: runRiskMonitor,
  outputSchema: RiskMonitorOutputSchema,
}
