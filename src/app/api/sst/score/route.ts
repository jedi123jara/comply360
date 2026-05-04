import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { calcularScoreSst, type SstScoreSnapshot } from '@/lib/sst/scoring'

// =============================================
// GET /api/sst/score
//
// Calcula y devuelve el score SST específico de la org del usuario logueado:
//   - scoreGlobal 0-100
//   - semáforo VERDE/AMARILLO/ROJO
//   - breakdown por dimensión (IPERC, EMO, SAT, Comité, Field Audit, Sedes)
//   - exposición económica en S/ (D.S. 019-2006-TR + UIT 2026)
//   - recomendaciones priorizadas
// =============================================
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const now = new Date()
  const ult12meses = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  const ult6meses = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  const [org, sedes, ipercs, ipercFilas, emos, workersActivos, accidentes, comite, visitas] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, sizeRange: true, regimenPrincipal: true },
    }),
    prisma.sede.findMany({
      where: { orgId },
      select: { id: true, activa: true, ubigeo: true },
    }),
    prisma.iPERCBase.findMany({
      where: { orgId },
      select: { id: true, sedeId: true, estado: true, fechaAprobacion: true },
    }),
    // Filas significativas con plazoCierre vencido o sin plazoCierre asignado
    prisma.iPERCFila.findMany({
      where: {
        iperBase: { orgId },
        esSignificativo: true,
        OR: [{ plazoCierre: null }, { plazoCierre: { lt: now } }],
      },
      select: { iperBaseId: true },
    }),
    prisma.eMO.findMany({
      where: { orgId },
      select: { workerId: true, proximoExamenAntes: true },
    }),
    prisma.worker.findMany({
      where: { orgId, status: 'ACTIVE' },
      select: { id: true },
    }),
    prisma.accidente.findMany({
      where: { orgId, fechaHora: { gte: ult12meses } },
      select: {
        id: true,
        fechaHora: true,
        plazoLegalHoras: true,
        satEstado: true,
        satFechaEnvioManual: true,
      },
    }),
    prisma.comiteSST.findFirst({
      where: { orgId, estado: 'VIGENTE' },
      include: {
        miembros: {
          where: { fechaBaja: null },
          select: { cargo: true, origen: true },
        },
      },
    }),
    prisma.visitaFieldAudit.findMany({
      where: { orgId, fechaProgramada: { gte: ult6meses } },
      select: {
        id: true,
        estado: true,
        hallazgos: {
          select: { severidad: true, plazoCierre: true },
        },
      },
    }),
  ])

  // Contar filas significativas abiertas por iperBaseId
  const filasPorBase = new Map<string, number>()
  for (const f of ipercFilas) {
    filasPorBase.set(f.iperBaseId, (filasPorBase.get(f.iperBaseId) ?? 0) + 1)
  }

  // Construir snapshot
  const numeroTrabajadores = workersActivos.length
  const esMype =
    org?.regimenPrincipal === 'MYPE_MICRO' || org?.regimenPrincipal === 'MYPE_PEQUENA'

  const snapshot: SstScoreSnapshot = {
    numeroTrabajadores,
    esMype,
    sedes: sedes.map((x) => ({
      id: x.id,
      activa: x.activa,
      ubigeoCompleto: !!x.ubigeo && x.ubigeo.length === 6,
    })),
    ipercBases: ipercs.map((ip) => ({
      sedeId: ip.sedeId,
      estado: ip.estado,
      fechaAprobacion: ip.fechaAprobacion,
      filasSignificativasAbiertas: filasPorBase.get(ip.id) ?? 0,
    })),
    emos: emos.map((e) => ({
      workerId: e.workerId,
      proximoExamenAntes: e.proximoExamenAntes,
    })),
    workerIdsActivos: workersActivos.map((w) => w.id),
    accidentes: accidentes.map((a) => ({
      id: a.id,
      fechaHora: a.fechaHora,
      plazoLegalHoras: a.plazoLegalHoras,
      satEstado: a.satEstado,
      satFechaEnvioManual: a.satFechaEnvioManual,
    })),
    comite: comite
      ? {
          estado: comite.estado,
          miembrosActivos: comite.miembros.length,
          representantesEmpleador: comite.miembros.filter(
            (m) => m.origen === 'REPRESENTANTE_EMPLEADOR',
          ).length,
          representantesTrabajadores: comite.miembros.filter(
            (m) => m.origen === 'REPRESENTANTE_TRABAJADORES',
          ).length,
          tienePresidente: comite.miembros.some((m) => m.cargo === 'PRESIDENTE'),
          tieneSecretario: comite.miembros.some((m) => m.cargo === 'SECRETARIO'),
          mandatoFin: comite.mandatoFin,
        }
      : null,
    visitasUlt6Meses: visitas.map((v) => ({
      id: v.id,
      estado: v.estado,
      hallazgosTotal: v.hallazgos.length,
      hallazgosSignificativosAbiertos: v.hallazgos.filter(
        (h) =>
          (h.severidad === 'MODERADO' ||
            h.severidad === 'IMPORTANTE' ||
            h.severidad === 'INTOLERABLE') &&
          (!h.plazoCierre || h.plazoCierre < now),
      ).length,
    })),
  }

  const result = calcularScoreSst(snapshot, now)

  return NextResponse.json({
    ...result,
    contexto: {
      numeroTrabajadores,
      esMype,
      plan: org?.plan ?? null,
    },
    snapshotResumen: {
      sedes: sedes.length,
      sedesActivas: sedes.filter((s) => s.activa).length,
      ipercVigentes: ipercs.filter((ip) => ip.estado === 'VIGENTE').length,
      emosVigentes: emos.filter((e) => !e.proximoExamenAntes || e.proximoExamenAntes >= now)
        .length,
      accidentesUlt12m: accidentes.length,
      visitasUlt6m: visitas.length,
    },
  })
})
