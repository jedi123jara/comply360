import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { verifyChallenge } from '@/lib/webauthn-server'

// =============================================
// POST /api/sst/comites/[id]/elecciones/voto
// Registra el voto de un trabajador (un voto por elector). Persiste hash
// SHA-256 del voto en el SstRecord ACTA_COMITE.
//
// WebAuthn opcional pero recomendado:
//   - Si el cliente envía `webauthn: { token, challenge, credentialId }`,
//     verificamos el JWT y firmamos el voto con `BIOMETRIC` para validez
//     legal fuerte (Ley 27269).
//   - Si NO envía webauthn, el voto se acepta como `SIMPLE` (escenario:
//     admin transcribiendo papeleta o votación de respaldo). Queda audit
//     trail con el userId del admin.
// =============================================

const webauthnPayloadSchema = z.object({
  token: z.string().min(20),
  challenge: z.string().min(20),
  credentialId: z.string().min(1),
})

const votoSchema = z.object({
  electorWorkerId: z.string().min(1),
  candidatoWorkerId: z.string().min(1),
  webauthn: webauthnPayloadSchema.optional(),
})

type SignatureLevel = 'SIMPLE' | 'BIOMETRIC'

interface Voto {
  electorWorkerId: string
  candidatoWorkerId: string
  timestamp: string
  hashFirma: string
  signatureLevel: SignatureLevel
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

export const POST = withAuthParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = votoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const { electorWorkerId, candidatoWorkerId, webauthn } = parsed.data

    // Validar comité y elección activa
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

    // Ventana de tiempo
    const now = new Date()
    if (now < new Date(data.fechaInicio)) {
      return NextResponse.json({ error: 'La votación aún no ha empezado' }, { status: 409 })
    }
    if (now > new Date(data.fechaCierre)) {
      return NextResponse.json(
        { error: 'La ventana de votación se cerró' },
        { status: 409 },
      )
    }

    // Validar elector y candidato
    const elector = await prisma.worker.findFirst({
      where: { id: electorWorkerId, orgId: ctx.orgId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!elector) {
      return NextResponse.json(
        { error: 'Elector no encontrado o inactivo' },
        { status: 404 },
      )
    }

    const esCandidato = data.candidatos.find((c) => c.workerId === candidatoWorkerId)
    if (!esCandidato) {
      return NextResponse.json(
        { error: 'El candidato no está en el padrón electoral' },
        { status: 400 },
      )
    }

    // Anti-double-voting: un trabajador solo vota una vez
    if (data.votos.some((v) => v.electorWorkerId === electorWorkerId)) {
      return NextResponse.json(
        { error: 'Este elector ya emitió su voto', code: 'YA_VOTO' },
        { status: 409 },
      )
    }

    // Verificar WebAuthn si vino — eleva la firma a BIOMETRIC.
    let signatureLevel: SignatureLevel = 'SIMPLE'
    let credentialId: string | undefined
    if (webauthn) {
      const verify = verifyChallenge({
        token: webauthn.token,
        challenge: webauthn.challenge,
        workerId: electorWorkerId,
        action: 'vote_committee',
        entityId: id,
      })
      if (!verify.valid) {
        return NextResponse.json(
          {
            error: `Verificación WebAuthn falló: ${verify.reason}`,
            code: 'WEBAUTHN_INVALID',
          },
          { status: 401 },
        )
      }
      signatureLevel = 'BIOMETRIC'
      credentialId = webauthn.credentialId
    }

    const timestamp = now.toISOString()
    // Incluimos signatureLevel + credentialId en el hash → la prueba de la
    // ceremonia biométrica queda enlazada al hash del voto.
    const hashFirma = createHash('sha256')
      .update(
        `${electorWorkerId}|${candidatoWorkerId}|${timestamp}|${id}|${signatureLevel}|${credentialId ?? ''}`,
      )
      .digest('hex')

    const nuevoVoto: Voto = {
      electorWorkerId,
      candidatoWorkerId,
      timestamp,
      hashFirma,
      signatureLevel,
      ...(credentialId ? { credentialId } : {}),
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
          action: 'sst.comite.eleccion.voto',
          entityType: 'ComiteSST',
          entityId: id,
          metadataJson: {
            hashFirma,
            electorWorkerId,
            candidatoWorkerId,
            signatureLevel,
            ...(credentialId ? { credentialId } : {}),
          },
        },
      })
      .catch(() => undefined)

    return NextResponse.json({
      ok: true,
      hashFirma,
      timestamp,
      signatureLevel,
      votosTotal: updated.votos.length,
    })
  },
)
