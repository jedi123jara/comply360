/**
 * POST /api/workers/check-duplicate
 *
 * Verifica si un trabajador ya existe por DNI en la organización.
 * Devuelve los datos existentes para comparación en el wizard de importación.
 *
 * Body: { dni: string }
 * Retorna: { exists: boolean, worker?: {...} }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json()
  const { dni } = body as { dni?: string }

  if (!dni || !/^\d{8}$/.test(dni)) {
    return NextResponse.json({ exists: false })
  }

  const worker = await prisma.worker.findUnique({
    where: { orgId_dni: { orgId: ctx.orgId, dni } },
    select: {
      id: true,
      dni: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      birthDate: true,
      gender: true,
      nationality: true,
      address: true,
      position: true,
      department: true,
      regimenLaboral: true,
      tipoContrato: true,
      fechaIngreso: true,
      fechaCese: true,
      sueldoBruto: true,
      asignacionFamiliar: true,
      jornadaSemanal: true,
      tipoAporte: true,
      afpNombre: true,
      status: true,
      legajoScore: true,
    },
  })

  if (!worker) {
    return NextResponse.json({ exists: false })
  }

  return NextResponse.json({
    exists: true,
    worker: {
      ...worker,
      sueldoBruto: Number(worker.sueldoBruto),
      birthDate: worker.birthDate?.toISOString().split('T')[0] ?? null,
      fechaIngreso: worker.fechaIngreso.toISOString().split('T')[0],
      fechaCese: worker.fechaCese?.toISOString().split('T')[0] ?? null,
    },
  })
})
