/**
 * POST /api/decisiones/auditar
 *
 * Endpoint orquestador del wizard "Auditar nómina". Analiza las boletas de un
 * período y devuelve hallazgos. Opcionalmente crea ComplianceTask por cada
 * hallazgo crítico.
 *
 * Modos:
 *   { periodo: 'YYYY-MM', createTasks: false } — solo análisis (preview)
 *   { periodo: 'YYYY-MM', createTasks: true  } — análisis + crea tareas
 *
 * Reglas de auditoría (simples, deterministas):
 *  1. Aporte AFP/ONP fuera de rango (AFP 10-13%, ONP 13%)
 *  2. EsSalud distinto de 9% del sueldo bruto (con tolerancia ±0.5%)
 *  3. Total ingresos no coincide con suma de componentes
 *  4. Neto pagar no coincide con ingresos - descuentos
 *  5. Sueldo bruto bajo el RMV (S/1,130 en 2026)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'

const RMV = 1130 // 2026
const ESSALUD_RATE = 0.09
const AFP_MIN = 0.10
const AFP_MAX = 0.13
const TOLERANCE = 0.5 // soles, para errores de redondeo

const AuditarSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}$/, 'Periodo formato YYYY-MM'),
  createTasks: z.boolean().default(false),
})

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface Finding {
  type: string
  severity: Severity
  payslipId: string
  workerId: string
  workerName: string
  message: string
  expected?: number
  actual?: number
}

function near(a: number, b: number, tol = TOLERANCE): boolean {
  return Math.abs(a - b) <= tol
}

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const parsed = AuditarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const { periodo, createTasks } = parsed.data

  const payslips = await prisma.payslip.findMany({
    where: { orgId: ctx.orgId, periodo },
    select: {
      id: true,
      workerId: true,
      sueldoBruto: true,
      asignacionFamiliar: true,
      horasExtras: true,
      bonificaciones: true,
      totalIngresos: true,
      aporteAfpOnp: true,
      essalud: true,
      otrosDescuentos: true,
      rentaQuintaCat: true,
      totalDescuentos: true,
      netoPagar: true,
      worker: {
        select: { firstName: true, lastName: true, tipoAporte: true },
      },
    },
  })

  if (payslips.length === 0) {
    return NextResponse.json({
      data: {
        periodo,
        boletasAnalizadas: 0,
        findings: [],
        summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
        tasksCreated: 0,
      },
    })
  }

  const findings: Finding[] = []

  for (const p of payslips) {
    const workerName = `${p.worker.firstName} ${p.worker.lastName}`
    const sueldo = Number(p.sueldoBruto)
    const asigFam = Number(p.asignacionFamiliar ?? 0)
    const horasExtras = Number(p.horasExtras ?? 0)
    const bonificaciones = Number(p.bonificaciones ?? 0)
    const totalIngresos = Number(p.totalIngresos)
    const aporteAfpOnp = Number(p.aporteAfpOnp ?? 0)
    const essalud = Number(p.essalud ?? 0)
    const otrosDescuentos = Number(p.otrosDescuentos ?? 0)
    const rentaQuinta = Number(p.rentaQuintaCat ?? 0)
    const totalDescuentos = Number(p.totalDescuentos)
    const netoPagar = Number(p.netoPagar)

    // Regla 1: sueldo bajo RMV
    if (sueldo < RMV) {
      findings.push({
        type: 'SUELDO_BAJO_RMV',
        severity: 'CRITICAL',
        payslipId: p.id,
        workerId: p.workerId,
        workerName,
        message: `Sueldo bruto S/${sueldo.toFixed(2)} bajo el RMV (S/${RMV}).`,
        expected: RMV,
        actual: sueldo,
      })
    }

    // Regla 2: AFP/ONP fuera de rango
    if (aporteAfpOnp > 0) {
      const ratio = aporteAfpOnp / sueldo
      const tipo = p.worker.tipoAporte
      if (tipo === 'AFP' && (ratio < AFP_MIN - 0.005 || ratio > AFP_MAX + 0.005)) {
        findings.push({
          type: 'APORTE_AFP_FUERA_RANGO',
          severity: 'HIGH',
          payslipId: p.id,
          workerId: p.workerId,
          workerName,
          message: `Aporte AFP ${(ratio * 100).toFixed(2)}% fuera del rango esperado (10-13%).`,
        })
      } else if (tipo === 'ONP' && Math.abs(ratio - 0.13) > 0.005) {
        findings.push({
          type: 'APORTE_ONP_INCORRECTO',
          severity: 'HIGH',
          payslipId: p.id,
          workerId: p.workerId,
          workerName,
          message: `Aporte ONP ${(ratio * 100).toFixed(2)}% (esperado 13%).`,
        })
      }
    }

    // Regla 3: EsSalud (9% del bruto)
    if (essalud > 0) {
      const expectedEssalud = sueldo * ESSALUD_RATE
      if (!near(essalud, expectedEssalud, 1)) {
        findings.push({
          type: 'ESSALUD_INCORRECTO',
          severity: 'MEDIUM',
          payslipId: p.id,
          workerId: p.workerId,
          workerName,
          message: `EsSalud S/${essalud.toFixed(2)} no coincide con 9% del sueldo (esperado S/${expectedEssalud.toFixed(2)}).`,
          expected: expectedEssalud,
          actual: essalud,
        })
      }
    }

    // Regla 4: total ingresos suma componentes
    const expectedIngresos = sueldo + asigFam + horasExtras + bonificaciones
    if (!near(totalIngresos, expectedIngresos)) {
      findings.push({
        type: 'TOTAL_INGRESOS_INCORRECTO',
        severity: 'HIGH',
        payslipId: p.id,
        workerId: p.workerId,
        workerName,
        message: `Total ingresos S/${totalIngresos.toFixed(2)} no coincide con suma componentes (S/${expectedIngresos.toFixed(2)}).`,
      })
    }

    // Regla 5: neto = ingresos - descuentos
    const expectedNeto = totalIngresos - totalDescuentos
    if (!near(netoPagar, expectedNeto)) {
      findings.push({
        type: 'NETO_INCORRECTO',
        severity: 'CRITICAL',
        payslipId: p.id,
        workerId: p.workerId,
        workerName,
        message: `Neto pagar S/${netoPagar.toFixed(2)} no coincide con ingresos - descuentos (S/${expectedNeto.toFixed(2)}).`,
      })
    }

    // Regla 6: total descuentos suma componentes (informativo)
    const expectedDescuentos = aporteAfpOnp + rentaQuinta + otrosDescuentos
    if (!near(totalDescuentos, expectedDescuentos)) {
      findings.push({
        type: 'TOTAL_DESCUENTOS_INCORRECTO',
        severity: 'MEDIUM',
        payslipId: p.id,
        workerId: p.workerId,
        workerName,
        message: `Total descuentos S/${totalDescuentos.toFixed(2)} no coincide con suma componentes (S/${expectedDescuentos.toFixed(2)}).`,
      })
    }
  }

  const summary = {
    total: findings.length,
    critical: findings.filter((f) => f.severity === 'CRITICAL').length,
    high: findings.filter((f) => f.severity === 'HIGH').length,
    medium: findings.filter((f) => f.severity === 'MEDIUM').length,
    low: findings.filter((f) => f.severity === 'LOW').length,
  }

  let tasksCreated = 0
  if (createTasks && findings.length > 0) {
    // Una tarea por hallazgo crítico/high — los medium/low se agregan en una sola
    const criticalAndHigh = findings.filter(
      (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH',
    )
    const mediumAndLow = findings.filter(
      (f) => f.severity === 'MEDIUM' || f.severity === 'LOW',
    )

    const taskPromises: Promise<unknown>[] = []
    for (const f of criticalAndHigh) {
      taskPromises.push(
        prisma.complianceTask.create({
          data: {
            orgId: ctx.orgId,
            sourceId: `audit:${f.payslipId}:${f.type}`,
            area: 'PLANILLA',
            priority: f.severity === 'CRITICAL' ? 1 : 3,
            title: `Auditoría ${periodo}: ${f.workerName} — ${f.type.replace(/_/g, ' ')}`,
            description: f.message,
            baseLegal: 'D.S. 001-98-TR · D.S. 050-2002-EF',
            gravedad: f.severity === 'CRITICAL' ? 'GRAVE' : 'LEVE',
            multaEvitable: f.severity === 'CRITICAL' ? 5500 : 1100,
            plazoSugerido: 'Inmediato (7 dias)',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        }),
      )
    }

    if (mediumAndLow.length > 0) {
      const summaryDescription = mediumAndLow
        .slice(0, 10)
        .map((f) => `• ${f.workerName}: ${f.message}`)
        .join('\n')
      taskPromises.push(
        prisma.complianceTask.create({
          data: {
            orgId: ctx.orgId,
            sourceId: `audit:${periodo}:bundle`,
            area: 'PLANILLA',
            priority: 6,
            title: `Auditoría ${periodo}: ${mediumAndLow.length} observaciones menores`,
            description: summaryDescription,
            baseLegal: 'D.S. 001-98-TR',
            gravedad: 'LEVE',
            multaEvitable: 0,
            plazoSugerido: 'Corto plazo (15 dias)',
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          },
        }),
      )
    }

    const results = await Promise.allSettled(taskPromises)
    tasksCreated = results.filter((r) => r.status === 'fulfilled').length
  }

  return NextResponse.json({
    data: {
      periodo,
      boletasAnalizadas: payslips.length,
      findings,
      summary,
      tasksCreated,
    },
    links: {
      planAccion: '/dashboard/plan-accion',
      boletas: `/dashboard/boletas?periodo=${periodo}`,
    },
  })
})
