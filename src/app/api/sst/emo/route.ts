import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { emoCreateSchema, detectarCamposMedicosProhibidos } from '@/lib/sst/schemas'
import { encryptMedical } from '@/lib/sst/medical-vault'

// =============================================
// GET /api/sst/emo — List EMO de la org
// Query params:
//   workerId        — filtrar por trabajador
//   tipoExamen      — PRE_EMPLEO | PERIODICO | RETIRO | REINTEGRO_LARGA_AUSENCIA
//   aptitud         — APTO | APTO_CON_RESTRICCIONES | NO_APTO | OBSERVADO
//   proximoEnDias   — N: solo EMO con proximoExamenAntes ≤ now + N días
//
// IMPORTANTE: NUNCA descifra restricciones en el listado. Solo el detalle
// individual lo hace, on-demand y con audit log.
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const workerId = searchParams.get('workerId')
  const tipoExamen = searchParams.get('tipoExamen')
  const aptitud = searchParams.get('aptitud')
  const proximoEnDias = searchParams.get('proximoEnDias')

  const where: Record<string, unknown> = { orgId: ctx.orgId }
  if (workerId) where.workerId = workerId
  if (tipoExamen) where.tipoExamen = tipoExamen
  if (aptitud) where.aptitud = aptitud
  if (proximoEnDias) {
    const days = parseInt(proximoEnDias, 10)
    if (Number.isFinite(days) && days > 0) {
      const limit = new Date()
      limit.setDate(limit.getDate() + days)
      where.proximoExamenAntes = { lte: limit }
    }
  }

  const emos = await prisma.eMO.findMany({
    where,
    orderBy: [{ fechaExamen: 'desc' }],
    select: {
      id: true,
      workerId: true,
      tipoExamen: true,
      fechaExamen: true,
      centroMedicoNombre: true,
      centroMedicoRuc: true,
      aptitud: true,
      // restriccionesCifrado se EXCLUYE deliberadamente del listado
      consentimientoLey29733: true,
      fechaConsentimiento: true,
      proximoExamenAntes: true,
      certificadoUrl: true,
      createdAt: true,
      updatedAt: true,
      worker: {
        select: { id: true, firstName: true, lastName: true, dni: true },
      },
    },
  })

  // Stats por aptitud
  const stats = await prisma.eMO.groupBy({
    by: ['aptitud'],
    where: { orgId: ctx.orgId },
    _count: true,
  })

  return NextResponse.json({
    emos,
    total: emos.length,
    statsByAptitud: stats.reduce(
      (acc, g) => {
        acc[g.aptitud] = g._count
        return acc
      },
      {} as Record<string, number>,
    ),
  })
})

// =============================================
// POST /api/sst/emo — Registrar EMO
//
// Reglas de seguridad:
//   1. Detecta campos médicos prohibidos en el payload (diagnóstico, CIE-10,
//      historia clínica, tratamiento, medicamento) → 400.
//   2. Cifra `restricciones` con pgcrypto antes de persistir.
//   3. `consentimientoLey29733` debe ser true (validación Zod).
//   4. Solo persiste lo estrictamente necesario; jamás guarda diagnóstico.
// =============================================
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))

  // Validación crítica: detectar campos médicos prohibidos antes de cualquier
  // otra cosa. Si vienen, devolvemos 400 con explicación legal.
  const camposProhibidos = detectarCamposMedicosProhibidos(body)
  if (camposProhibidos) {
    return NextResponse.json(
      {
        error: `Campo médico prohibido en el payload: "${camposProhibidos}". COMPLY360 jamás persiste diagnóstico, historia clínica ni tratamientos (Ley 29733 + D.S. 016-2024-JUS). Esos datos quedan en el centro médico DIGESA.`,
        code: 'FORBIDDEN_MEDICAL_FIELD',
        campo: camposProhibidos,
      },
      { status: 400 },
    )
  }

  const parsed = emoCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  // Verificar worker
  const worker = await prisma.worker.findFirst({
    where: { id: data.workerId, orgId: ctx.orgId },
    select: { id: true },
  })
  if (!worker) {
    return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
  }

  // Cifrar restricciones si vienen
  let restriccionesCifrado: Uint8Array<ArrayBuffer> | null = null
  if (data.restricciones && data.restricciones.trim().length > 0) {
    restriccionesCifrado = await encryptMedical(prisma, data.restricciones.trim())
  }

  const emo = await prisma.eMO.create({
    data: {
      orgId: ctx.orgId,
      workerId: data.workerId,
      tipoExamen: data.tipoExamen,
      fechaExamen: new Date(data.fechaExamen),
      centroMedicoNombre: data.centroMedicoNombre,
      centroMedicoRuc: data.centroMedicoRuc ?? null,
      aptitud: data.aptitud,
      restriccionesCifrado,
      consentimientoLey29733: data.consentimientoLey29733,
      fechaConsentimiento: data.fechaConsentimiento ? new Date(data.fechaConsentimiento) : new Date(),
      proximoExamenAntes: data.proximoExamenAntes ? new Date(data.proximoExamenAntes) : null,
      certificadoUrl: data.certificadoUrl ?? null,
    },
    select: {
      id: true,
      workerId: true,
      tipoExamen: true,
      fechaExamen: true,
      centroMedicoNombre: true,
      aptitud: true,
      consentimientoLey29733: true,
      proximoExamenAntes: true,
      createdAt: true,
    },
  })

  // Audit log: registramos que se creó un EMO. NO logueamos restricciones.
  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'sst.emo.created',
        entityType: 'EMO',
        entityId: emo.id,
        metadataJson: {
          workerId: emo.workerId,
          tipoExamen: emo.tipoExamen,
          aptitud: emo.aptitud,
          tieneRestricciones: !!restriccionesCifrado,
        },
      },
    })
    .catch((e: unknown) => {
      console.error('[emo/POST] audit log failed:', e)
    })

  return NextResponse.json({ emo }, { status: 201 })
})
