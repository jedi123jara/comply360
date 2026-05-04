import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  buildPublicSlug,
  buildPublicVerifyUrl,
  computeFingerprint,
  ipercPayload,
  accidentePayload,
  emoPayload,
  visitaPayload,
  type SstResourceKind,
} from '@/lib/sst/traceability'

// =============================================
// GET /api/sst/seal/[kind]/[id]
//
// Genera el sello de trazabilidad de un registro SST: hash SHA-256, slug
// público, URL pública de verificación y QR (data URL PNG).
//
// kind ∈ { iperc, accidente, emo, visita }
// =============================================
export const GET = withAuthParams<{ kind: string; id: string }>(
  async (req: NextRequest, ctx: AuthContext, { kind, id }) => {
    const url = new URL(req.url)
    const includeQr = url.searchParams.get('qr') !== 'false'

    const upper = kind.toUpperCase() as SstResourceKind
    const valid: SstResourceKind[] = ['IPERC', 'ACCIDENTE', 'EMO', 'VISITA']
    if (!valid.includes(upper)) {
      return NextResponse.json(
        { error: `Tipo no soportado: ${kind}. Válidos: ${valid.join(', ').toLowerCase()}` },
        { status: 400 },
      )
    }

    let payload: unknown
    let resourceLabel: string

    if (upper === 'IPERC') {
      const rec = await prisma.iPERCBase.findFirst({
        where: { id, orgId: ctx.orgId },
        select: {
          id: true,
          orgId: true,
          sedeId: true,
          version: true,
          estado: true,
          fechaAprobacion: true,
        },
      })
      if (!rec) {
        return NextResponse.json({ error: 'IPERC no encontrado' }, { status: 404 })
      }
      const filas = await prisma.iPERCFila.findMany({
        where: { iperBaseId: id },
        select: {
          proceso: true,
          actividad: true,
          tarea: true,
          nivelRiesgo: true,
          clasificacion: true,
        },
        orderBy: [{ proceso: 'asc' }, { actividad: 'asc' }, { tarea: 'asc' }],
      })
      payload = ipercPayload(rec, filas)
      resourceLabel = `IPERC v${rec.version}`
    } else if (upper === 'ACCIDENTE') {
      const rec = await prisma.accidente.findFirst({
        where: { id, orgId: ctx.orgId },
        select: {
          id: true,
          orgId: true,
          sedeId: true,
          workerId: true,
          tipo: true,
          fechaHora: true,
          plazoLegalHoras: true,
          satEstado: true,
          satNumeroManual: true,
          satFechaEnvioManual: true,
        },
      })
      if (!rec) {
        return NextResponse.json({ error: 'Accidente no encontrado' }, { status: 404 })
      }
      payload = accidentePayload(rec)
      resourceLabel = `Accidente ${rec.tipo}`
    } else if (upper === 'EMO') {
      const rec = await prisma.eMO.findFirst({
        where: { id, orgId: ctx.orgId },
        select: {
          id: true,
          orgId: true,
          workerId: true,
          tipoExamen: true,
          fechaExamen: true,
          centroMedicoNombre: true,
          aptitud: true,
          consentimientoLey29733: true,
          restriccionesCifrado: true,
        },
      })
      if (!rec) {
        return NextResponse.json({ error: 'EMO no encontrado' }, { status: 404 })
      }
      payload = emoPayload(rec)
      resourceLabel = `EMO ${rec.tipoExamen}`
    } else {
      // VISITA
      const rec = await prisma.visitaFieldAudit.findFirst({
        where: { id, orgId: ctx.orgId },
        select: {
          id: true,
          orgId: true,
          sedeId: true,
          colaboradorId: true,
          fechaProgramada: true,
          fechaCierreOficina: true,
          estado: true,
        },
      })
      if (!rec) {
        return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
      }
      const hallazgos = await prisma.hallazgoFieldAudit.findMany({
        where: { visitaId: id },
        select: { tipo: true, severidad: true, descripcion: true },
        orderBy: [{ severidad: 'desc' }, { createdAt: 'asc' }],
      })
      payload = visitaPayload(rec, hallazgos)
      resourceLabel = `Visita Field Audit ${rec.estado}`
    }

    const fingerprint = computeFingerprint(payload)
    const slug = buildPublicSlug(upper, fingerprint)
    const publicUrl = buildPublicVerifyUrl(slug)

    let qrDataUrl: string | null = null
    if (includeQr) {
      qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 256,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
    }

    // Audit log: alguien generó/regeneró el sello (útil para detectar
    // re-emisiones sospechosas si el contenido cambia).
    await prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'sst.seal.issued',
          entityType: upper,
          entityId: id,
          metadataJson: {
            slug,
            fingerprint,
            kind: upper,
          },
        },
      })
      .catch((e: unknown) => {
        console.error('[sst/seal] audit log failed:', e)
      })

    return NextResponse.json({
      kind: upper,
      resourceId: id,
      resourceLabel,
      fingerprint,
      slug,
      publicUrl,
      qrDataUrl,
      issuedAt: new Date().toISOString(),
    })
  },
)
