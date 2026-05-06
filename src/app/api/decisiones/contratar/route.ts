/**
 * POST /api/decisiones/contratar
 *
 * Endpoint orquestador del wizard "Contratar trabajador" (Decisiones Laborales,
 * Fase 2). Crea en una sola transacción:
 *   - Un Worker con los datos del wizard
 *   - Enrollments para las capacitaciones obligatorias seleccionadas (status NOT_STARTED)
 *   - Un ComplianceTask de "Onboarding pendiente" para que aparezca en /plan-accion
 *
 * NO crea el contrato — eso queda como acción inmediatamente posterior desde
 * el perfil del worker (el usuario puede usar plantillas propias o generadores).
 *
 * Permisos: requiere rol con permiso de creación de trabajadores
 * (OWNER, ADMIN, MEMBER). withAuth ya valida el orgId del contexto.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { generateWorkerAlerts } from '@/lib/alerts/alert-engine'
import { syncComplianceScore } from '@/lib/compliance/sync-score'
import { checkWorkerLimit } from '@/lib/plan-gate'

export const runtime = 'nodejs'

const ContratarSchema = z.object({
  // Paso 1 — datos básicos
  dni: z.string().regex(/^\d{8}$/, 'DNI debe tener 8 dígitos'),
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  fechaIngreso: z.string(),
  sueldoBruto: z.number().positive().lt(1_000_000),
  // Paso 1/3 — régimen y modalidad
  regimenLaboral: z.enum([
    'GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA', 'AGRARIO',
    'CONSTRUCCION_CIVIL', 'MINERO', 'PESQUERO', 'TEXTIL_EXPORTACION',
    'DOMESTICO', 'CAS', 'MODALIDAD_FORMATIVA', 'TELETRABAJO',
  ]),
  tipoContrato: z.enum([
    'INDEFINIDO', 'PLAZO_FIJO', 'TIEMPO_PARCIAL',
    'INICIO_ACTIVIDAD', 'NECESIDAD_MERCADO', 'RECONVERSION',
    'SUPLENCIA', 'EMERGENCIA', 'OBRA_DETERMINADA',
    'INTERMITENTE', 'EXPORTACION',
  ]),
  asignacionFamiliar: z.boolean(),
  // Paso 2 — previsional (parte del costo total)
  tipoAporte: z.enum(['AFP', 'ONP', 'SIN_APORTE']),
  sctr: z.boolean(),
  essaludVida: z.boolean(),
  // Paso 4 — capacitaciones obligatorias seleccionadas (IDs de curso)
  trainingCourseIds: z.array(z.string()).default([]),
})

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = ContratarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const data = parsed.data

  // Plan gate — mismo check que /api/workers POST
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { plan: true },
  })
  const limit = await checkWorkerLimit(ctx.orgId, org?.plan ?? 'STARTER')
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: 'Límite de trabajadores alcanzado para tu plan actual.',
        code: 'WORKER_LIMIT_REACHED',
        current: limit.current,
        max: limit.max,
        upgradeUrl: '/dashboard/planes',
      },
      { status: 403 },
    )
  }

  // DNI duplicado en el org
  const existing = await prisma.worker.findUnique({
    where: { orgId_dni: { orgId: ctx.orgId, dni: data.dni } },
  })
  if (existing) {
    return NextResponse.json(
      { error: `Ya existe un trabajador con DNI ${data.dni} en esta organización` },
      { status: 409 },
    )
  }

  // Verificar que los courseIds pertenezcan a cursos obligatorios y activos
  let validCourseIds: string[] = []
  if (data.trainingCourseIds.length > 0) {
    const courses = await prisma.course.findMany({
      where: {
        id: { in: data.trainingCourseIds },
        isActive: true,
      },
      select: { id: true },
    })
    validCourseIds = courses.map((c) => c.id)
  }

  // Transacción: worker + enrollments + tarea de onboarding
  const created = await prisma.$transaction(async (tx) => {
    const worker = await tx.worker.create({
      data: {
        orgId: ctx.orgId,
        dni: data.dni,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        position: data.position || null,
        department: data.department || null,
        regimenLaboral: data.regimenLaboral,
        tipoContrato: data.tipoContrato,
        fechaIngreso: new Date(data.fechaIngreso),
        sueldoBruto: data.sueldoBruto,
        asignacionFamiliar: data.asignacionFamiliar,
        tipoAporte: data.tipoAporte,
        sctr: data.sctr,
        essaludVida: data.essaludVida,
        status: 'ACTIVE',
        legajoScore: 0,
      },
    })

    let enrollments: Array<{ id: string; courseId: string }> = []
    if (validCourseIds.length > 0) {
      const workerName = `${worker.firstName} ${worker.lastName}`
      enrollments = await Promise.all(
        validCourseIds.map((courseId) =>
          tx.enrollment.create({
            data: {
              orgId: ctx.orgId,
              courseId,
              workerId: worker.id,
              workerName,
              status: 'NOT_STARTED',
              progress: 0,
            },
            select: { id: true, courseId: true },
          }),
        ),
      )
    }

    // Tarea de onboarding en /plan-accion — el responsable termina el flujo
    // (firmar contrato, subir documentos legajo, asignar más capacitaciones).
    const task = await tx.complianceTask.create({
      data: {
        orgId: ctx.orgId,
        sourceId: `onboarding:${worker.id}`,
        area: 'ONBOARDING',
        priority: 5,
        title: `Completar onboarding de ${worker.firstName} ${worker.lastName}`,
        description: `Trabajador recién creado vía Decisiones Laborales (Contratar). Pasos: firmar contrato, subir documentos del legajo${enrollments.length > 0 ? `, completar ${enrollments.length} capacitación${enrollments.length !== 1 ? 'es' : ''} obligatoria${enrollments.length !== 1 ? 's' : ''} asignada${enrollments.length !== 1 ? 's' : ''}` : ''}.`,
        baseLegal: 'D.Leg. 728 · Art. 4',
        gravedad: 'LEVE',
        multaEvitable: 0,
        plazoSugerido: 'Corto plazo (15 dias)',
        // 15 días desde alta para completar onboarding
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    })

    return { worker, enrollments, taskId: task.id }
  })

  // Side effects fire-and-forget (igual que /api/workers POST)
  generateWorkerAlerts(created.worker.id).catch((err: unknown) => {
    console.error('[decisiones/contratar] generateWorkerAlerts failed', err)
  })
  syncComplianceScore(ctx.orgId).catch(() => {})

  return NextResponse.json(
    {
      data: {
        workerId: created.worker.id,
        workerName: `${created.worker.firstName} ${created.worker.lastName}`,
        enrollmentsCreated: created.enrollments.length,
        taskId: created.taskId,
      },
      // URLs útiles para el wizard tras éxito
      links: {
        workerProfile: `/dashboard/trabajadores/${created.worker.id}`,
        planAccion: '/dashboard/plan-accion',
        contractGenerator: `/dashboard/contratos/nuevo?workerId=${created.worker.id}`,
      },
    },
    { status: 201 },
  )
})
