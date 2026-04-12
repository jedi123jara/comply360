import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import {
  getSolicitudesInspeccion,
  evaluarSolicitud,
  generarResultadoSimulacro,
} from '@/lib/compliance/simulacro-engine'
import type { InspeccionTipo } from '@/lib/compliance/simulacro-engine'

// =============================================
// GET /api/simulacro — Get inspection solicitudes
// =============================================
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url)
  const tipo = (searchParams.get('tipo') || 'PREVENTIVA') as InspeccionTipo

  const solicitudes = getSolicitudesInspeccion(tipo)
  return NextResponse.json({ tipo, solicitudes })
})

// =============================================
// POST /api/simulacro — Run full simulacro against org data
// =============================================
export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json()
    const { tipo = 'PREVENTIVA' } = body as {
      tipo?: InspeccionTipo
    }
    const orgId = ctx.orgId

    // Get all worker documents for the org
    const workers = await prisma.worker.findMany({
      where: { orgId, status: { not: 'TERMINATED' } },
      include: {
        documents: { select: { documentType: true, status: true, category: true } },
      },
    })

    const totalWorkers = workers.length
    const allDocs = workers.flatMap(w => w.documents)

    // Get solicitudes for this inspection type
    const solicitudes = getSolicitudesInspeccion(tipo)

    // Evaluate each solicitud
    const hallazgos = solicitudes.map(s => evaluarSolicitud(s, allDocs, totalWorkers))

    // Generate result
    const resultado = generarResultadoSimulacro(tipo, hallazgos)

    // Save as a SIMULATION diagnostic
    const diagnostic = await prisma.complianceDiagnostic.create({
      data: {
        orgId,
        type: 'SIMULATION',
        scoreGlobal: resultado.scoreSimulacro,
        scoreByArea: {
          contratos: hallazgos.filter(h => h.solicitudId.startsWith('S-0')).filter(h => h.estado === 'CUMPLE').length,
          sst: hallazgos.filter(h => ['S-12','S-13','S-14','S-15','S-16','S-17','S-18','S-19','S-20','S-21','S-25'].includes(h.solicitudId)).filter(h => h.estado === 'CUMPLE').length,
        },
        totalMultaRiesgo: resultado.multaTotal,
        questionsJson: hallazgos as object[],
        gapAnalysis: hallazgos.filter(h => h.estado !== 'CUMPLE' && h.estado !== 'NO_APLICA') as object[],
        actionPlan: hallazgos
          .filter(h => h.estado === 'NO_CUMPLE')
          .map((h, i) => ({
            priority: i + 1,
            documentoLabel: h.documentoLabel,
            baseLegal: h.baseLegal,
            multaEvitable: h.multaPEN,
            gravedad: h.gravedad,
          })) as object[],
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      diagnosticId: diagnostic.id,
      ...resultado,
    })
  } catch (error) {
    console.error('Simulacro error:', error)
    return NextResponse.json({ error: 'Failed to run simulacro' }, { status: 500 })
  }
})
