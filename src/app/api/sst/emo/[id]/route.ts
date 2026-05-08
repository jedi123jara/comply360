import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { emoUpdateSchema, detectarCamposMedicosProhibidos } from '@/lib/sst/schemas'
import { encryptMedical, decryptMedical } from '@/lib/sst/medical-vault'

// =============================================
// GET /api/sst/emo/[id]
//
// Por defecto NO descifra restricciones — solo metadata clínica permitida.
// Si el cliente pasa `?descifrar=1`, descifra las restricciones server-side
// y registra un audit log con el userId que accedió. Esto permite trazabilidad
// completa de quién leyó qué dato médico (Art. 41 Ley 29733).
// =============================================
export const GET = withPlanGateParams<{ id: string }>('sst_completo',
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const url = new URL(req.url)
    const descifrar = url.searchParams.get('descifrar') === '1'

    const emo = await prisma.eMO.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dni: true,
            position: true,
            fechaIngreso: true,
          },
        },
      },
    })

    if (!emo) {
      return NextResponse.json({ error: 'EMO no encontrado' }, { status: 404 })
    }

    // Output base — sin restricciones cifradas
    const { restriccionesCifrado, ...rest } = emo
    const result: Record<string, unknown> = {
      ...rest,
      tieneRestricciones: !!restriccionesCifrado,
    }

    if (descifrar && restriccionesCifrado) {
      try {
        const plain = await decryptMedical(prisma, Buffer.from(restriccionesCifrado))
        result.restricciones = plain

        // Audit log: alguien leyó datos médicos cifrados.
        await prisma.auditLog
          .create({
            data: {
              orgId: ctx.orgId,
              userId: ctx.userId,
              action: 'sst.emo.restricciones.read',
              entityType: 'EMO',
              entityId: emo.id,
              metadataJson: {
                workerId: emo.workerId,
                aptitud: emo.aptitud,
              },
            },
          })
          .catch((e: unknown) => {
            console.error('[emo/GET] audit log failed:', e)
          })
      } catch (e) {
        console.error('[emo/GET] decrypt failed:', e)
        result.restriccionesError = 'No se pudo descifrar el campo (clave o formato inválido)'
      }
    }

    return NextResponse.json({ emo: result })
  },
)

// =============================================
// PATCH /api/sst/emo/[id]
// Permite actualizar aptitud, restricciones (re-cifra), próximo examen,
// certificadoUrl. Detecta campos médicos prohibidos.
// =============================================
export const PATCH = withPlanGateParams<{ id: string }>('sst_completo',
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))

    const camposProhibidos = detectarCamposMedicosProhibidos(body)
    if (camposProhibidos) {
      return NextResponse.json(
        {
          error: `Campo médico prohibido: "${camposProhibidos}". COMPLY360 jamás persiste diagnóstico.`,
          code: 'FORBIDDEN_MEDICAL_FIELD',
        },
        { status: 400 },
      )
    }

    const parsed = emoUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const existing = await prisma.eMO.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'EMO no encontrado' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.aptitud) data.aptitud = parsed.data.aptitud
    if (parsed.data.proximoExamenAntes !== undefined) {
      data.proximoExamenAntes = parsed.data.proximoExamenAntes
        ? new Date(parsed.data.proximoExamenAntes)
        : null
    }
    if (parsed.data.certificadoUrl !== undefined) {
      data.certificadoUrl = parsed.data.certificadoUrl
    }
    if (parsed.data.restricciones !== undefined) {
      if (parsed.data.restricciones === null || parsed.data.restricciones.trim() === '') {
        data.restriccionesCifrado = null
      } else {
        data.restriccionesCifrado = await encryptMedical(prisma, parsed.data.restricciones.trim())
      }
    }

    const emo = await prisma.eMO.update({
      where: { id },
      data,
      select: {
        id: true,
        workerId: true,
        tipoExamen: true,
        fechaExamen: true,
        aptitud: true,
        proximoExamenAntes: true,
      },
    })

    return NextResponse.json({ emo })
  },
)
