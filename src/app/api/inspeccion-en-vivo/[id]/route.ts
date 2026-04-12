/**
 * /api/inspeccion-en-vivo/[id]
 *
 * GET   — Load session with current state
 * PATCH — Update a specific hallazgo (mark status, upload evidence, add notes)
 * POST  — Complete or pause the session (action: "complete" | "pause" | "resume")
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import {
  getSolicitudesInspeccion,
  generarResultadoSimulacro,
  type InspeccionTipo,
  type HallazgoInspeccion,
  type DocumentoEstado,
} from '@/lib/compliance/simulacro-engine'

// ─── GET — Load inspection session ──────────────────────────────────────────

export const GET = withAuthParams<{ id: string }>(async (_req, ctx, params) => {
  try {
    const session = await prisma.inspeccionEnVivo.findUnique({
      where: { id: params.id },
    })

    if (!session || session.orgId !== ctx.orgId) {
      return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })
    }

    const solicitudes = getSolicitudesInspeccion(session.tipo as InspeccionTipo)
    const hallazgos = (session.hallazgosJson ?? []) as unknown as HallazgoInspeccion[]
    const evidencias = (session.evidenciasJson ?? {}) as Record<string, string[]>

    return NextResponse.json({
      id: session.id,
      tipo: session.tipo,
      status: session.status,
      inspectorName: session.inspectorName,
      inspectorDNI: session.inspectorDNI,
      ordenInspeccion: session.ordenInspeccion,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      scoreInspeccion: session.scoreInspeccion,
      multaEstimada: session.multaEstimada ? Number(session.multaEstimada) : null,
      notes: session.notes,
      solicitudes,
      hallazgos,
      evidencias,
      resultado: session.resultadoJson ? session.resultadoJson : null,
    })
  } catch (error) {
    console.error('[InspeccionEnVivo GET] Error:', error)
    return NextResponse.json({ error: 'Error al cargar sesion' }, { status: 500 })
  }
})

// ─── PATCH — Update a hallazgo ──────────────────────────────────────────────

export const PATCH = withAuthParams<{ id: string }>(async (req, ctx, params) => {
  try {
    const body = await req.json() as {
      solicitudId: string
      estado?: DocumentoEstado
      evidenceUrl?: string
      notes?: string
    }

    const session = await prisma.inspeccionEnVivo.findUnique({
      where: { id: params.id },
    })

    if (!session || session.orgId !== ctx.orgId) {
      return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })
    }

    if (session.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'La sesion no esta activa' }, { status: 400 })
    }

    const hallazgos = (session.hallazgosJson ?? []) as unknown as HallazgoInspeccion[]
    const evidencias = (session.evidenciasJson ?? {}) as Record<string, string[]>

    // Find and update the specific hallazgo
    const idx = hallazgos.findIndex(h => h.solicitudId === body.solicitudId)
    if (idx === -1) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    // Update estado if provided (manual override by user during live inspection)
    if (body.estado) {
      const UIT = 5500
      const totalWorkers = await prisma.worker.count({
        where: { orgId: ctx.orgId, status: { not: 'TERMINATED' } },
      })
      const workerFactor = Math.max(1, Math.min(totalWorkers, 10))

      hallazgos[idx].estado = body.estado
      hallazgos[idx].multaPEN =
        body.estado === 'NO_CUMPLE' ? Math.round(hallazgos[idx].multaUIT * UIT * workerFactor)
        : body.estado === 'PARCIAL' ? Math.round(hallazgos[idx].multaUIT * UIT * workerFactor * 0.3)
        : 0

      // Update mensaje based on new estado
      if (body.estado === 'CUMPLE') {
        hallazgos[idx].mensaje = `Verificado durante inspeccion. ${hallazgos[idx].documentoLabel} cumple con ${hallazgos[idx].baseLegal}.`
      } else if (body.estado === 'PARCIAL') {
        hallazgos[idx].mensaje = `Cumplimiento parcial verificado durante inspeccion. ${hallazgos[idx].documentoLabel} requiere completar.`
      } else if (body.estado === 'NO_CUMPLE') {
        hallazgos[idx].mensaje = `No cumple. ${hallazgos[idx].documentoLabel} no disponible durante la inspeccion.`
      }
    }

    // Add evidence URL if provided
    if (body.evidenceUrl) {
      if (!evidencias[body.solicitudId]) {
        evidencias[body.solicitudId] = []
      }
      evidencias[body.solicitudId].push(body.evidenceUrl)
    }

    // Add notes
    if (body.notes) {
      hallazgos[idx].mensaje = `${hallazgos[idx].mensaje} — Nota: ${body.notes}`
    }

    // Save updated hallazgos
    await prisma.inspeccionEnVivo.update({
      where: { id: params.id },
      data: {
        hallazgosJson: hallazgos as unknown as object[],
        evidenciasJson: evidencias,
      },
    })

    return NextResponse.json({
      updated: hallazgos[idx],
      hallazgos,
      evidencias,
    })
  } catch (error) {
    console.error('[InspeccionEnVivo PATCH] Error:', error)
    return NextResponse.json({ error: 'Error al actualizar hallazgo' }, { status: 500 })
  }
})

// ─── POST — Complete, pause, or resume the session ──────────────────────────

export const POST = withAuthParams<{ id: string }>(async (req, ctx, params) => {
  try {
    const body = await req.json() as {
      action: 'complete' | 'pause' | 'resume'
      notes?: string
    }

    const session = await prisma.inspeccionEnVivo.findUnique({
      where: { id: params.id },
    })

    if (!session || session.orgId !== ctx.orgId) {
      return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })
    }

    if (body.action === 'pause') {
      await prisma.inspeccionEnVivo.update({
        where: { id: params.id },
        data: { status: 'PAUSED', notes: body.notes || session.notes },
      })
      return NextResponse.json({ status: 'PAUSED' })
    }

    if (body.action === 'resume') {
      if (session.status !== 'PAUSED') {
        return NextResponse.json({ error: 'La sesion no esta pausada' }, { status: 400 })
      }
      await prisma.inspeccionEnVivo.update({
        where: { id: params.id },
        data: { status: 'ACTIVE' },
      })
      return NextResponse.json({ status: 'ACTIVE' })
    }

    if (body.action === 'complete') {
      const hallazgos = (session.hallazgosJson ?? []) as unknown as HallazgoInspeccion[]
      const resultado = generarResultadoSimulacro(session.tipo as InspeccionTipo, hallazgos)

      const updated = await prisma.inspeccionEnVivo.update({
        where: { id: params.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          resultadoJson: resultado as unknown as object,
          scoreInspeccion: resultado.scoreSimulacro,
          multaEstimada: resultado.multaTotal,
          notes: body.notes || session.notes,
        },
      })

      // Also save as ComplianceDiagnostic for history
      await prisma.complianceDiagnostic.create({
        data: {
          orgId: ctx.orgId,
          type: 'SIMULATION',
          scoreGlobal: resultado.scoreSimulacro,
          scoreByArea: {},
          totalMultaRiesgo: resultado.multaTotal,
          questionsJson: resultado as unknown as object,
          gapAnalysis: hallazgos.filter(h => h.estado !== 'CUMPLE' && h.estado !== 'NO_APLICA') as unknown as object[],
          completedAt: new Date(),
        },
      }).catch(() => {})

      // Log
      await prisma.auditLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'INSPECCION_COMPLETADA',
          entityType: 'InspeccionEnVivo',
          entityId: params.id,
          metadataJson: {
            score: resultado.scoreSimulacro,
            multaTotal: resultado.multaTotal,
            cumple: resultado.cumple,
            noCumple: resultado.noCumple,
          },
        },
      }).catch(() => {})

      return NextResponse.json({
        status: 'COMPLETED',
        resultado,
        sessionId: updated.id,
      })
    }

    return NextResponse.json({ error: 'Accion invalida' }, { status: 400 })
  } catch (error) {
    console.error('[InspeccionEnVivo POST] Error:', error)
    return NextResponse.json({ error: 'Error al procesar accion' }, { status: 500 })
  }
})
