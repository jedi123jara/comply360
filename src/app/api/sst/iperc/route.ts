import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import {
  calcularProbabilidad,
  calcularNivelRiesgo,
  validateIpercEntry,
  type PeligroTipo,
  type Severidad,
  type ProbabilidadFactors,
  type MedidaControl,
  type NivelRiesgo,
} from '@/lib/sst/iperc-template'

// =============================================
// GET /api/sst/iperc — List IPERC entries for org
// =============================================
export const GET = withPlanGate('sst_completo', async (req, ctx) => {
  try {
    const orgId = ctx.orgId
    const { searchParams } = new URL(req.url)
    const nivelFilter = searchParams.get('nivel') as NivelRiesgo | null

    // Fetch all org's IPERC records (no take limit) for accurate stats,
    // then apply the nivel filter only for the returned entries list.
    const allRecords = await prisma.sstRecord.findMany({
      where: {
        orgId,
        type: 'IPERC',
      },
      orderBy: { createdAt: 'desc' },
    })

    // Parse IPERC data from each record
    const allEntries = allRecords.map(r => {
      const data = (r.data || {}) as Record<string, unknown>
      return {
        id: r.id,
        proceso: data.proceso || '',
        area: data.area || '',
        actividad: data.actividad || '',
        tarea: data.tarea || '',
        peligroTipo: data.peligroTipo || '',
        peligroDescripcion: data.peligroDescripcion || '',
        riesgoAsociado: data.riesgoAsociado || '',
        consecuencia: data.consecuencia || '',
        probabilidadFactors: data.probabilidadFactors || {},
        probabilidad: data.probabilidad || 0,
        severidad: data.severidad || 1,
        nivelRiesgo: data.nivelRiesgo || 0,
        nivelRiesgoLabel: (data.nivelRiesgoLabel as NivelRiesgo) || 'TRIVIAL',
        medidasControl: data.medidasControl || [],
        responsable: data.responsable || r.responsibleId || '',
        fecha: data.fecha || r.createdAt,
        status: r.status,
        createdAt: r.createdAt,
      }
    })

    // Stats always computed on the full unfiltered set for this org
    const totalRisks = allEntries.length
    const byLevel = {
      TRIVIAL: allEntries.filter(e => e.nivelRiesgoLabel === 'TRIVIAL').length,
      TOLERABLE: allEntries.filter(e => e.nivelRiesgoLabel === 'TOLERABLE').length,
      MODERADO: allEntries.filter(e => e.nivelRiesgoLabel === 'MODERADO').length,
      IMPORTANTE: allEntries.filter(e => e.nivelRiesgoLabel === 'IMPORTANTE').length,
      INTOLERABLE: allEntries.filter(e => e.nivelRiesgoLabel === 'INTOLERABLE').length,
    }

    // Count entries where at least one control measure is PENDIENTE
    const pendingControls = allEntries.filter(e => {
      const controls = e.medidasControl as MedidaControl[]
      return Array.isArray(controls) && controls.some(c => c.estado === 'PENDIENTE')
    }).length

    // Apply nivel filter AFTER computing stats so totals are always accurate
    const entries = nivelFilter
      ? allEntries.filter(e => e.nivelRiesgoLabel === nivelFilter)
      : allEntries

    return NextResponse.json({
      entries,
      stats: {
        totalRisks,
        byLevel,
        pendingControls,
        criticalRisks: byLevel.IMPORTANTE + byLevel.INTOLERABLE,
      },
    })
  } catch (error) {
    console.error('IPERC GET error:', error)
    return NextResponse.json({ error: 'Error al obtener registros IPERC' }, { status: 500 })
  }
})

// =============================================
// POST /api/sst/iperc — Create IPERC entry
// =============================================
export const POST = withPlanGate('sst_completo', async (req, ctx) => {
  try {
    const orgId = ctx.orgId
    const body = await req.json()

    const {
      proceso,
      area,
      actividad,
      tarea,
      peligroTipo,
      peligroDescripcion,
      riesgoAsociado,
      consecuencia,
      probabilidadFactors,
      severidad,
      medidasControl = [],
      responsable,
      fecha,
    } = body as {
      proceso: string
      area: string
      actividad: string
      tarea: string
      peligroTipo: PeligroTipo
      peligroDescripcion: string
      riesgoAsociado: string
      consecuencia: string
      probabilidadFactors: ProbabilidadFactors
      severidad: Severidad
      medidasControl: MedidaControl[]
      responsable: string
      fecha: string
    }

    // Validate
    const errors = validateIpercEntry({
      proceso,
      area,
      actividad,
      tarea,
      peligroTipo,
      peligroDescripcion,
      riesgoAsociado,
      consecuencia,
      probabilidadFactors,
      severidad,
      responsable,
    })

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Datos invalidos', details: errors }, { status: 400 })
    }

    // Calculate risk
    const probabilidad = calcularProbabilidad(probabilidadFactors)
    const { nivel: nivelRiesgo, label: nivelRiesgoLabel } = calcularNivelRiesgo(probabilidad, severidad)

    // Store as SstRecord with type IPERC
    const record = await prisma.sstRecord.create({
      data: {
        orgId,
        type: 'IPERC',
        title: `IPERC: ${proceso} - ${actividad} - ${peligroDescripcion}`,
        description: `Riesgo: ${riesgoAsociado}. Nivel: ${nivelRiesgoLabel}`,
        responsibleId: responsable || null,
        status: nivelRiesgoLabel === 'INTOLERABLE' || nivelRiesgoLabel === 'IMPORTANTE' ? 'PENDING' : 'COMPLETED',
        data: JSON.parse(JSON.stringify({
          proceso,
          area,
          actividad,
          tarea,
          peligroTipo,
          peligroDescripcion,
          riesgoAsociado,
          consecuencia,
          probabilidadFactors,
          probabilidad,
          severidad,
          nivelRiesgo,
          nivelRiesgoLabel,
          medidasControl: medidasControl.map((mc) => ({
            tipo: mc.tipo,
            descripcion: mc.descripcion,
            responsable: mc.responsable || responsable,
            fecha: mc.fecha || fecha || null,
            estado: mc.estado || 'PENDIENTE',
          })),
          responsable,
          fecha: fecha || new Date().toISOString(),
        })),
      },
    })

    return NextResponse.json({
      id: record.id,
      proceso,
      area,
      actividad,
      tarea,
      peligroTipo,
      peligroDescripcion,
      riesgoAsociado,
      consecuencia,
      probabilidad,
      severidad,
      nivelRiesgo,
      nivelRiesgoLabel,
      medidasControl,
      responsable,
    })
  } catch (error) {
    console.error('IPERC POST error:', error)
    return NextResponse.json({ error: 'Error al crear registro IPERC' }, { status: 500 })
  }
})
