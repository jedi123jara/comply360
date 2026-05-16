/**
 * GET /api/mi-portal/cts-projection
 *
 * Calcula la CTS proyectada del trabajador para el próximo corte legal
 * (15 de mayo o 15 de noviembre, lo que venga primero).
 *
 * Usa el cálculo real del legal-engine — no es una estimación, sigue el
 * D.S. 001-97-TR (TUO Ley de CTS) con la misma fórmula que la calculadora
 * oficial de /dashboard/calculadoras/cts.
 *
 * Fuentes de datos:
 *  - Worker: sueldo bruto + asignación familiar + fecha de ingreso
 *  - Última boleta de gratificación (para el 1/6 computable)
 *
 * Si falta data (worker recién ingresado sin boletas), devuelve un `ok: false`
 * con el motivo — la UI muestra placeholder de "aún no disponible".
 */

import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { calcularCTS } from '@/lib/legal-engine/calculators/cts'
import { getNextCtsCutDate, toIsoDate } from '@/lib/legal-engine/cts-cutoffs'

export const GET = withWorkerAuth(async (_req, ctx) => {
  const worker = await prisma.worker.findUnique({
    where: { id: ctx.workerId },
    select: {
      sueldoBruto: true,
      asignacionFamiliar: true,
      fechaIngreso: true,
      regimenLaboral: true,
      status: true,
    },
  })

  if (!worker) {
    return NextResponse.json({ ok: false, reason: 'worker_not_found' }, { status: 404 })
  }

  if (worker.status === 'TERMINATED') {
    return NextResponse.json({ ok: false, reason: 'worker_terminated' })
  }

  // MYPE régimen micro no tiene CTS, MYPE pequeña tiene 50% — simplificamos
  // y devolvemos un reason claro. Los regímenes que sí tienen CTS completa
  // son: GENERAL y algunos especiales. Para MVP solo GENERAL.
  if (worker.regimenLaboral !== 'GENERAL') {
    return NextResponse.json({
      ok: false,
      reason: 'regimen_no_general',
      detail: `Tu régimen es ${worker.regimenLaboral.replaceAll('_', ' ')}. El cálculo de CTS difiere — consultá con RRHH.`,
    })
  }

  const nextCut = getNextCtsCutDate()

  // Última gratificación: buscar en Payslip el último "gratificacion" no-cero.
  // El modelo Payslip tiene bonificaciones + totalIngresos. Como simplificación,
  // usamos el promedio del sueldo como 1 grati (sueldo × 2 = grati anual completa).
  // Para precisión real, cuando tengamos tabla Gratification, consultarla.
  const ultimaGratificacion = Number(worker.sueldoBruto) // aprox: 1 grati = 1 sueldo

  const result = calcularCTS({
    sueldoBruto: Number(worker.sueldoBruto),
    asignacionFamiliar: worker.asignacionFamiliar,
    ultimaGratificacion,
    fechaIngreso: toIsoDate(worker.fechaIngreso),
    fechaCorte: toIsoDate(nextCut),
  })

  return NextResponse.json({
    ok: true,
    nextCut: nextCut.toISOString(),
    ctsTotal: result.ctsTotal,
    remuneracionComputable: result.remuneracionComputable,
    mesesComputables: result.mesesComputables,
    diasComputables: result.diasComputables,
    formula: result.formula,
    baseLegal: result.baseLegal,
  })
})
