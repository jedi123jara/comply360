import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  parsePublicSlug,
  computeFingerprint,
  ipercPayload,
  accidentePayload,
  emoPayload,
  visitaPayload,
} from '@/lib/sst/traceability'

// =============================================
// GET /api/verify/sst/[slug]
//
// PÚBLICO — sin auth. Verifica que un sello corresponde a un registro real
// en la base de datos. Devuelve metadata mínima sin exponer datos sensibles.
//
// Para verificar:
//   1. Parsea el slug → obtiene el tipo de recurso
//   2. Busca registros que coincidan con el hash prefix (3-4 candidatos máx)
//   3. Recomputa el fingerprint canónico y compara
//   4. Si coincide → devuelve metadata pública
//   5. Si no → devuelve 404 sin filtrar el motivo (defensa contra enumeración)
// =============================================

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params

  const parsed = parsePublicSlug(slug)
  if (!parsed) {
    return NextResponse.json({ valid: false, error: 'Slug inválido' }, { status: 400 })
  }

  const { kind, hashPrefix } = parsed

  if (kind === 'IPERC') {
    const candidates = await prisma.iPERCBase.findMany({
      where: { estado: { in: ['VIGENTE', 'VENCIDO', 'ARCHIVADO'] } },
      select: {
        id: true,
        orgId: true,
        sedeId: true,
        version: true,
        estado: true,
        fechaAprobacion: true,
        sede: {
          select: { nombre: true, tipoInstalacion: true, distrito: true },
        },
        organization: { select: { razonSocial: true, name: true, ruc: true } },
      },
      take: 200, // limite defensivo
    })

    for (const c of candidates) {
      const filas = await prisma.iPERCFila.findMany({
        where: { iperBaseId: c.id },
        select: {
          proceso: true,
          actividad: true,
          tarea: true,
          nivelRiesgo: true,
          clasificacion: true,
        },
        orderBy: [{ proceso: 'asc' }, { actividad: 'asc' }, { tarea: 'asc' }],
      })
      const fp = computeFingerprint(ipercPayload(c, filas))
      if (fp.startsWith(hashPrefix)) {
        return NextResponse.json({
          valid: true,
          kind: 'IPERC',
          fingerprint: fp,
          issuedAt: c.fechaAprobacion?.toISOString() ?? null,
          summary: {
            tipo: 'Matriz IPERC',
            version: c.version,
            estado: c.estado,
            sede: c.sede.nombre,
            tipoSede: c.sede.tipoInstalacion,
            distrito: c.sede.distrito,
            empresa: c.organization.razonSocial ?? c.organization.name,
            ruc: c.organization.ruc ?? null,
            filasCount: filas.length,
          },
        })
      }
    }
  } else if (kind === 'ACCIDENTE') {
    const candidates = await prisma.accidente.findMany({
      where: {},
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
        sede: { select: { nombre: true, distrito: true } },
        organization: { select: { razonSocial: true, name: true, ruc: true } },
      },
      take: 200,
    })

    for (const c of candidates) {
      const fp = computeFingerprint(accidentePayload(c))
      if (fp.startsWith(hashPrefix)) {
        return NextResponse.json({
          valid: true,
          kind: 'ACCIDENTE',
          fingerprint: fp,
          issuedAt: c.fechaHora.toISOString(),
          summary: {
            tipo: 'Notificación accidente',
            tipoEvento: c.tipo,
            sede: c.sede.nombre,
            distrito: c.sede.distrito,
            empresa: c.organization.razonSocial ?? c.organization.name,
            ruc: c.organization.ruc ?? null,
            satEstado: c.satEstado,
            satNumeroManual: c.satNumeroManual,
          },
        })
      }
    }
  } else if (kind === 'EMO') {
    const candidates = await prisma.eMO.findMany({
      where: {},
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
        organization: { select: { razonSocial: true, name: true, ruc: true } },
      },
      take: 200,
    })

    for (const c of candidates) {
      const fp = computeFingerprint(emoPayload(c))
      if (fp.startsWith(hashPrefix)) {
        return NextResponse.json({
          valid: true,
          kind: 'EMO',
          fingerprint: fp,
          issuedAt: c.fechaExamen.toISOString(),
          summary: {
            tipo: 'Examen Médico Ocupacional',
            tipoExamen: c.tipoExamen,
            aptitud: c.aptitud,
            centroMedico: c.centroMedicoNombre,
            empresa: c.organization.razonSocial ?? c.organization.name,
            ruc: c.organization.ruc ?? null,
          },
        })
      }
    }
  } else if (kind === 'VISITA') {
    const candidates = await prisma.visitaFieldAudit.findMany({
      where: {},
      select: {
        id: true,
        orgId: true,
        sedeId: true,
        colaboradorId: true,
        fechaProgramada: true,
        fechaCierreOficina: true,
        estado: true,
        sede: { select: { nombre: true, distrito: true } },
        colaborador: { select: { nombre: true, apellido: true } },
        organization: { select: { razonSocial: true, name: true, ruc: true } },
      },
      take: 200,
    })

    for (const c of candidates) {
      const hallazgos = await prisma.hallazgoFieldAudit.findMany({
        where: { visitaId: c.id },
        select: { tipo: true, severidad: true, descripcion: true },
        orderBy: [{ severidad: 'desc' }, { createdAt: 'asc' }],
      })
      const fp = computeFingerprint(visitaPayload(c, hallazgos))
      if (fp.startsWith(hashPrefix)) {
        return NextResponse.json({
          valid: true,
          kind: 'VISITA',
          fingerprint: fp,
          issuedAt: c.fechaCierreOficina?.toISOString() ?? c.fechaProgramada.toISOString(),
          summary: {
            tipo: 'Visita Field Audit',
            estado: c.estado,
            sede: c.sede.nombre,
            distrito: c.sede.distrito,
            inspector: `${c.colaborador.nombre} ${c.colaborador.apellido}`,
            empresa: c.organization.razonSocial ?? c.organization.name,
            ruc: c.organization.ruc ?? null,
            hallazgosCount: hallazgos.length,
          },
        })
      }
    }
  }

  // No match — devolvemos siempre el mismo error para no filtrar info
  return NextResponse.json(
    {
      valid: false,
      error: 'Sello no válido o registro no encontrado',
    },
    { status: 404 },
  )
}
