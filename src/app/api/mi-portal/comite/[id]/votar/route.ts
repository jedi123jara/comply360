import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withWorkerAuthParams } from '@/lib/api-auth'
import { verifyChallenge } from '@/lib/webauthn-server'

/**
 * POST /api/mi-portal/comite/[id]/votar
 *
 * Endpoint dedicado al portal del trabajador para votar con WebAuthn por una
 * candidatura del Comité SST. A diferencia del endpoint admin
 * `/api/sst/comites/[id]/elecciones/voto`, aquí:
 *   - El elector es ALWAYS el worker autenticado (ctx.workerId), nunca viene
 *     en el body — esto evita que un atacante con cuenta worker pueda votar
 *     a nombre de otro.
 *   - WebAuthn es REQUERIDO (no opcional). La validez legal del voto depende
 *     de la ceremonia biométrica + audit trail con credentialId.
 *   - Idempotente: doble-click no genera doble voto (returns 409 YA_VOTO).
 */

const votarSchema = z.object({
  candidatoWorkerId: z.string().min(1),
  webauthn: z.object({
    token: z.string().min(20),
    challenge: z.string().min(20),
    credentialId: z.string().min(1),
  }),
})

interface Voto {
  electorWorkerId: string
  candidatoWorkerId: string
  timestamp: string
  hashFirma: string
  signatureLevel: 'SIMPLE' | 'BIOMETRIC'
  credentialId?: string
}

interface EleccionData {
  estado: 'EN_VOTACION' | 'CERRADA'
  fechaInicio: string
  fechaCierre: string
  cuposEmpleador: number
  cuposTrabajadores: number
  candidatos: Array<{ workerId: string; origen: string }>
  votos: Voto[]
}

export const POST = withWorkerAuthParams<{ id: string }>(
  async (req: NextRequest, ctx, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = votarSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const { candidatoWorkerId, webauthn } = parsed.data

    // Verificar comité
    const comite = await prisma.comiteSST.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!comite) {
      return NextResponse.json({ error: 'Comité no encontrado' }, { status: 404 })
    }

    const record = await prisma.sstRecord.findFirst({
      where: { orgId: ctx.orgId, type: 'ACTA_COMITE', title: id },
    })
    if (!record) {
      return NextResponse.json({ error: 'No hay elección activa' }, { status: 404 })
    }

    const data = record.data as unknown as EleccionData
    if (data.estado !== 'EN_VOTACION') {
      return NextResponse.json(
        { error: 'La votación está cerrada', code: 'ELECCION_CERRADA' },
        { status: 409 },
      )
    }

    const now = new Date()
    if (now < new Date(data.fechaInicio)) {
      return NextResponse.json({ error: 'La votación aún no ha empezado' }, { status: 409 })
    }
    if (now > new Date(data.fechaCierre)) {
      return NextResponse.json({ error: 'La ventana de votación se cerró' }, { status: 409 })
    }

    const esCandidato = data.candidatos.find((c) => c.workerId === candidatoWorkerId)
    if (!esCandidato) {
      return NextResponse.json(
        { error: 'El candidato no está en el padrón electoral' },
        { status: 400 },
      )
    }

    // Anti-double-voting
    if (data.votos.some((v) => v.electorWorkerId === ctx.workerId)) {
      return NextResponse.json(
        { error: 'Ya emitiste tu voto en esta elección', code: 'YA_VOTO' },
        { status: 409 },
      )
    }

    // Verificar WebAuthn (obligatorio)
    const verify = verifyChallenge({
      token: webauthn.token,
      challenge: webauthn.challenge,
      workerId: ctx.workerId,
      action: 'vote_committee',
      entityId: id,
    })
    if (!verify.valid) {
      return NextResponse.json(
        {
          error: `Verificación biométrica falló: ${verify.reason}`,
          code: 'WEBAUTHN_INVALID',
        },
        { status: 401 },
      )
    }

    const timestamp = now.toISOString()
    const hashFirma = createHash('sha256')
      .update(
        `${ctx.workerId}|${candidatoWorkerId}|${timestamp}|${id}|BIOMETRIC|${webauthn.credentialId}`,
      )
      .digest('hex')

    const nuevoVoto: Voto = {
      electorWorkerId: ctx.workerId,
      candidatoWorkerId,
      timestamp,
      hashFirma,
      signatureLevel: 'BIOMETRIC',
      credentialId: webauthn.credentialId,
    }

    const updated: EleccionData = {
      ...data,
      votos: [...data.votos, nuevoVoto],
    }

    await prisma.sstRecord.update({
      where: { id: record.id },
      data: { data: updated as never },
    })

    await prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'sst.comite.eleccion.voto.biometrico',
          entityType: 'ComiteSST',
          entityId: id,
          metadataJson: {
            hashFirma,
            electorWorkerId: ctx.workerId,
            candidatoWorkerId,
            credentialId: webauthn.credentialId,
            ip:
              req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
              req.headers.get('x-real-ip') ??
              null,
            userAgent: req.headers.get('user-agent') ?? null,
          },
        },
      })
      .catch(() => undefined)

    return NextResponse.json({
      ok: true,
      hashFirma,
      timestamp,
      signatureLevel: 'BIOMETRIC' as const,
    })
  },
)
