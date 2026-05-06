/**
 * POST /api/decisiones/cesar
 *
 * Endpoint orquestador del wizard "Cesar trabajador". NO ejecuta el proceso
 * de cese completo (eso vive en /api/workers/[id]/cese con sus etapas
 * carta-preaviso/descargos/carta-despido). Lo que hace este endpoint:
 *
 *   - Marca al trabajador con motivo y fecha de cese (en formato preliminar)
 *   - Crea ComplianceTask "Completar proceso de cese de X" → /plan-accion
 *   - Devuelve link al flujo profundo en /workers/[id]/cese para terminar
 *
 * Recibe: { workerId, tipoCese, fechaCese, motivoTexto?, riesgoLegalAsumido }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import type { InfracGravedad } from '@/generated/prisma/client'

export const runtime = 'nodejs'

const TIPO_CESE = [
  'RENUNCIA_VOLUNTARIA',
  'DESPIDO_CAUSA_JUSTA',
  'DESPIDO_ARBITRARIO',
  'MUTUO_DISENSO',
  'TERMINO_CONTRATO',
  'NO_RENOVACION',
  'FALLECIMIENTO',
  'JUBILACION',
  'PERIODO_PRUEBA',
] as const

const CesarSchema = z.object({
  workerId: z.string().min(1),
  tipoCese: z.enum(TIPO_CESE),
  fechaCese: z.string(),
  motivoTexto: z.string().max(500).optional().nullable(),
  riesgoLegalAsumido: z.boolean().default(false),
})

const TIPO_LABELS: Record<typeof TIPO_CESE[number], string> = {
  RENUNCIA_VOLUNTARIA: 'Renuncia voluntaria',
  DESPIDO_CAUSA_JUSTA: 'Despido por causa justa',
  DESPIDO_ARBITRARIO: 'Despido arbitrario',
  MUTUO_DISENSO: 'Mutuo disenso',
  TERMINO_CONTRATO: 'Término de contrato (vencimiento)',
  NO_RENOVACION: 'No renovación',
  FALLECIMIENTO: 'Fallecimiento',
  JUBILACION: 'Jubilación',
  PERIODO_PRUEBA: 'Cese durante período de prueba',
}

// Tipos con riesgo legal alto (indemnización + posibles juicios laborales)
const TIPOS_RIESGO_ALTO = new Set<typeof TIPO_CESE[number]>([
  'DESPIDO_ARBITRARIO',
  'DESPIDO_CAUSA_JUSTA',
])

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const parsed = CesarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const { workerId, tipoCese, fechaCese, motivoTexto, riesgoLegalAsumido } = parsed.data

  const worker = await prisma.worker.findFirst({
    where: { id: workerId, orgId: ctx.orgId },
    select: { id: true, firstName: true, lastName: true, status: true },
  })
  if (!worker) {
    return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
  }
  if (worker.status === 'TERMINATED') {
    return NextResponse.json(
      { error: 'El trabajador ya está cesado.' },
      { status: 409 },
    )
  }

  const isHighRisk = TIPOS_RIESGO_ALTO.has(tipoCese)
  if (isHighRisk && !riesgoLegalAsumido) {
    return NextResponse.json(
      {
        error: 'Cese de alto riesgo legal. Marca el checkbox de asunción de riesgo para continuar.',
        code: 'HIGH_RISK_NOT_ACKNOWLEDGED',
      },
      { status: 422 },
    )
  }

  const fullName = `${worker.firstName} ${worker.lastName}`
  const motivoMap: Record<typeof TIPO_CESE[number], string> = {
    RENUNCIA_VOLUNTARIA: 'renuncia',
    DESPIDO_CAUSA_JUSTA: 'despido_arbitrario', // mapea al schema simplificado
    DESPIDO_ARBITRARIO: 'despido_arbitrario',
    MUTUO_DISENSO: 'mutuo_acuerdo',
    TERMINO_CONTRATO: 'fin_contrato',
    NO_RENOVACION: 'fin_contrato',
    FALLECIMIENTO: 'fin_contrato',
    JUBILACION: 'fin_contrato',
    PERIODO_PRUEBA: 'fin_contrato',
  }

  const gravedad: InfracGravedad = isHighRisk ? 'GRAVE' : 'LEVE'

  const [, task] = await prisma.$transaction([
    prisma.worker.update({
      where: { id: worker.id },
      data: {
        // NO marcamos TERMINATED aquí — el flujo /workers/[id]/cese controla
        // las etapas (carta preaviso, descargos, etc.). Solo guardamos los
        // campos preliminares de planeación.
        fechaCese: new Date(fechaCese),
        motivoCese: motivoMap[tipoCese],
      },
    }),
    prisma.complianceTask.create({
      data: {
        orgId: ctx.orgId,
        sourceId: `cese:${worker.id}`,
        area: 'CESES',
        priority: isHighRisk ? 2 : 5,
        title: `Completar proceso de cese — ${fullName} (${TIPO_LABELS[tipoCese]})`,
        description:
          `Cese planificado vía Decisiones Laborales. Pasos pendientes en /workers/${worker.id}/cese: ` +
          `${isHighRisk ? 'carta de preaviso, periodo de descargos, carta de despido, ' : ''}` +
          `cálculo y pago de liquidación, certificado de trabajo. ` +
          `${motivoTexto ? `Motivo: ${motivoTexto}` : ''}`,
        baseLegal: 'D.Leg. 728 · Art. 16-41',
        gravedad,
        multaEvitable: isHighRisk ? 5500 : 0, // ~1 UIT si despido arbitrario sin proceso
        plazoSugerido: 'Inmediato (7 dias)',
        dueDate: new Date(fechaCese),
      },
    }),
  ])

  return NextResponse.json(
    {
      data: {
        workerId: worker.id,
        workerName: fullName,
        tipoCese,
        tipoCeseLabel: TIPO_LABELS[tipoCese],
        fechaCese,
        taskId: task.id,
      },
      links: {
        ceseFlow: `/dashboard/trabajadores/${worker.id}/cese`,
        liquidacion: `/dashboard/trabajadores/${worker.id}`,
        planAccion: '/dashboard/plan-accion',
      },
    },
    { status: 201 },
  )
})
