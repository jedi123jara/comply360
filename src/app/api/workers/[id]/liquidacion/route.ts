import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { calcularLiquidacion } from '@/lib/legal-engine/calculators/liquidacion'
import type { LiquidacionInput, MotivoCese } from '@/lib/legal-engine/types'

// =============================================
// GET /api/workers/[id]/liquidacion
// Auto-populate liquidacion input from worker record
// and run the calculation. Returns input + result.
// =============================================
export const GET = withPlanGateParams<{ id: string }>('workers', 
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const { id } = params
    const orgId = ctx.orgId

    const worker = await prisma.worker.findUnique({
      where: { id },
      include: {
        vacations: {
          orderBy: { periodoInicio: 'asc' },
        },
      },
    })

    if (!worker || worker.orgId !== orgId) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    // ── Build LiquidacionInput from worker data ─────────────────────────
    const sueldoBruto = Number(worker.sueldoBruto)
    const fechaIngreso = worker.fechaIngreso.toISOString().slice(0, 10)
    const fechaCese = (worker.fechaCese ?? new Date()).toISOString().slice(0, 10)

    // Map motivoCese (DB string) → MotivoCese union
    const motivoMap: Record<string, MotivoCese> = {
      despido_arbitrario: 'despido_arbitrario',
      renuncia: 'renuncia',
      mutuo_acuerdo: 'mutuo_acuerdo',
      fin_contrato: 'fin_contrato',
      despido_nulo: 'despido_nulo',
      hostilidad: 'hostilidad',
    }
    const motivoCese: MotivoCese =
      motivoMap[worker.motivoCese ?? ''] ?? 'fin_contrato'

    // Vacaciones no gozadas: sum of pending days across all periods
    const vacacionesNoGozadas = worker.vacations.reduce(
      (acc, v) => acc + v.diasPendientes,
      0,
    )

    const input: LiquidacionInput = {
      sueldoBruto,
      fechaIngreso,
      fechaCese,
      motivoCese,
      asignacionFamiliar: worker.asignacionFamiliar,
      gratificacionesPendientes: false, // conservative default
      vacacionesNoGozadas,
      horasExtrasPendientes: 0,
      ultimaGratificacion: sueldoBruto, // approximate: 1 sueldo
      comisionesPromedio: 0,
    }

    // ── Apply regime-specific rules ─────────────────────────────────────
    const regimen = worker.regimenLaboral
    let regimenNota: string | null = null

    if (regimen === 'MYPE_MICRO') {
      // Microempresa: sin CTS ni gratificaciones, vacaciones 15 días
      input.ultimaGratificacion = 0
      input.gratificacionesPendientes = false
      regimenNota =
        'Régimen MYPE Microempresa (Ley 32353): sin CTS, sin gratificaciones. Vacaciones 15 días/año. Indemnización: 10 rem. diarias × año.'
    } else if (regimen === 'MYPE_PEQUENA') {
      // Pequeña empresa: 50% CTS, 50% gratificaciones, vacaciones 15 días
      input.ultimaGratificacion = sueldoBruto * 0.5
      regimenNota =
        'Régimen MYPE Pequeña Empresa (Ley 32353): CTS al 50%, gratificaciones al 50%. Vacaciones 15 días/año.'
    }

    // Run the calculation
    const result = calcularLiquidacion(input)

    // For MYPE_MICRO: zero out CTS and gratification
    if (regimen === 'MYPE_MICRO') {
      result.breakdown.cts = {
        label: 'CTS Trunca',
        amount: 0,
        formula: 'No aplica — Régimen Microempresa (Ley 32353)',
        baseLegal: 'Ley 32353 Art. 44',
        details: 'Las microempresas no están obligadas a pagar CTS.',
      }
      result.breakdown.gratificacionTrunca = {
        label: 'Gratificación Trunca',
        amount: 0,
        formula: 'No aplica — Régimen Microempresa (Ley 32353)',
        baseLegal: 'Ley 32353 Art. 44',
        details: 'Las microempresas no están obligadas a pagar gratificaciones.',
      }
      result.breakdown.bonificacionEspecial = {
        label: 'Bonificación Extraordinaria (9%)',
        amount: 0,
        formula: 'No aplica — sin gratificación en microempresa',
        baseLegal: 'Ley 30334',
        details: 'No aplica para microempresas.',
      }
      // Recalculate total
      const newTotal = Object.values(result.breakdown).reduce(
        (sum, item) => sum + (item?.amount ?? 0),
        0,
      )
      result.totalBruto = Math.round(newTotal * 100) / 100
      result.totalNeto = result.totalBruto
    }

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
        status: worker.status,
      },
      input,
      result,
      regimenNota,
    })
  },
)

// =============================================
// POST /api/workers/[id]/liquidacion
// Recalculate with custom overrides (user edits form)
// =============================================
export const POST = withPlanGateParams<{ id: string }>('workers', 
  async (req: NextRequest, ctx: AuthContext, params) => {
    const { id } = params
    const orgId = ctx.orgId

    // Verify worker belongs to org
    const worker = await prisma.worker.findUnique({
      where: { id },
      select: { id: true, orgId: true, firstName: true, lastName: true, regimenLaboral: true },
    })
    if (!worker || worker.orgId !== orgId) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const input = body.input as LiquidacionInput

    if (
      !input ||
      typeof input.sueldoBruto !== 'number' ||
      !input.fechaIngreso ||
      !input.fechaCese
    ) {
      return NextResponse.json({ error: 'Datos de liquidación inválidos' }, { status: 400 })
    }

    const result = calcularLiquidacion(input)

    // Apply MYPE_MICRO restrictions if regime hasn't changed
    const regimen = worker.regimenLaboral
    if (regimen === 'MYPE_MICRO') {
      result.breakdown.cts.amount = 0
      result.breakdown.gratificacionTrunca.amount = 0
      result.breakdown.bonificacionEspecial.amount = 0
      const newTotal = Object.values(result.breakdown).reduce(
        (sum, item) => sum + (item?.amount ?? 0),
        0,
      )
      result.totalBruto = Math.round(newTotal * 100) / 100
      result.totalNeto = result.totalBruto
    }

    return NextResponse.json({ result })
  },
)

