/**
 * POST /api/decisiones/renovar
 *
 * Endpoint orquestador del wizard "Renovar contrato" (Decisiones Laborales).
 * NO genera el contrato nuevo — eso lo hace el flujo de generación existente
 * (/dashboard/contratos/nuevo o plantillas propias). Lo que hace:
 *   - Marca el contrato actual con la decisión tomada (renovar / convertir / no renovar)
 *   - Crea ComplianceTask "Completar renovación de contrato X" → aparece en /plan-accion
 *   - Si la decisión es "convertir a indeterminado" o "no renovar", deja nota en formData
 *
 * Recibe: { contractId, action, notes? }
 *  action: 'renew_same' | 'convert_to_indefinite' | 'do_not_renew'
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'

const RenovarSchema = z.object({
  contractId: z.string().min(1),
  action: z.enum(['renew_same', 'convert_to_indefinite', 'do_not_renew']),
  notes: z.string().optional().nullable(),
})

const ACTION_LABELS: Record<z.infer<typeof RenovarSchema>['action'], string> = {
  renew_same: 'Renovar con misma modalidad',
  convert_to_indefinite: 'Convertir a indeterminado',
  do_not_renew: 'No renovar (cesar al vencimiento)',
}

export const POST = withPlanGate('ia_contratos', async (req: NextRequest, ctx: AuthContext) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const parsed = RenovarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const { contractId, action, notes } = parsed.data

  const contract = await prisma.contract.findFirst({
    where: { id: contractId, orgId: ctx.orgId },
    select: {
      id: true,
      title: true,
      type: true,
      expiresAt: true,
      formData: true,
      workerContracts: {
        take: 1,
        select: { worker: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  })
  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  const worker = contract.workerContracts[0]?.worker
  const workerName = worker ? `${worker.firstName} ${worker.lastName}` : 'el trabajador'

  // Mark decision in contract.formData (no schema migration needed)
  const existingFormData = (contract.formData as Record<string, unknown> | null) ?? {}
  const updatedFormData = {
    ...existingFormData,
    _renewalDecision: {
      action,
      actionLabel: ACTION_LABELS[action],
      notes: notes ?? null,
      decidedAt: new Date().toISOString(),
      decidedBy: ctx.userId,
    },
  }

  const [updatedContract, task] = await prisma.$transaction([
    prisma.contract.update({
      where: { id: contract.id },
      data: { formData: updatedFormData },
      select: { id: true, title: true },
    }),
    prisma.complianceTask.create({
      data: {
        orgId: ctx.orgId,
        sourceId: `renewal:${contract.id}`,
        area: 'CONTRATOS',
        priority: action === 'do_not_renew' ? 3 : 5,
        title: `${ACTION_LABELS[action]} — ${workerName}`,
        description:
          action === 'renew_same'
            ? `Generar adenda de renovación del contrato "${contract.title}". Vence ${contract.expiresAt?.toLocaleDateString('es-PE') ?? 'sin fecha'}. ${notes ? `Notas: ${notes}` : ''}`
            : action === 'convert_to_indefinite'
              ? `Generar nuevo contrato a plazo indeterminado para ${workerName}, sustituyendo "${contract.title}". ${notes ? `Notas: ${notes}` : ''}`
              : `Preparar documentación de no renovación de "${contract.title}" — ${workerName}. Comunicar al trabajador con al menos 30 días de anticipación. ${notes ? `Notas: ${notes}` : ''}`,
        baseLegal: 'D.Leg. 728 · Art. 16',
        gravedad: action === 'do_not_renew' ? 'GRAVE' : 'LEVE',
        multaEvitable: 0,
        plazoSugerido: 'Corto plazo (15 dias)',
        dueDate: contract.expiresAt ?? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    }),
  ])

  return NextResponse.json(
    {
      data: {
        contractId: updatedContract.id,
        contractTitle: updatedContract.title,
        action,
        actionLabel: ACTION_LABELS[action],
        taskId: task.id,
      },
      links: {
        contractDetail: `/dashboard/contratos/${updatedContract.id}`,
        contractGenerator: worker
          ? `/dashboard/contratos/nuevo?workerId=${worker.id}`
          : '/dashboard/contratos/nuevo',
        planAccion: '/dashboard/plan-accion',
      },
    },
    { status: 201 },
  )
})
