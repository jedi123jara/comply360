import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularLiquidacion } from '@/lib/legal-engine/calculators/liquidacion'
import type { LiquidacionInput } from '@/lib/legal-engine/types'
import { getAuthContext } from '@/lib/auth'

// =============================================
// POST /api/calculations - Run and save a calculation
// PUBLIC: works for anonymous users (free calculator demo)
// Authenticated users get calculations linked to their org
// =============================================
export async function POST(request: NextRequest) {
  try {
    // Optional auth — public calculator still works without login
    const authCtx = await getAuthContext()
    const orgId = authCtx?.orgId ?? null

    const body = await request.json()
    const { type, inputs } = body

    if (!type || !inputs) {
      return NextResponse.json(
        { error: 'type and inputs are required' },
        { status: 400 }
      )
    }

    let result: unknown
    let totalAmount: number | null = null

    switch (type) {
      case 'LIQUIDACION': {
        const r = calcularLiquidacion(inputs as LiquidacionInput)
        result = r
        totalAmount = r.totalBruto
        break
      }
      case 'CTS': {
        const { calcularCTS } = await import('@/lib/legal-engine/calculators/cts')
        const r = calcularCTS(inputs)
        result = r
        totalAmount = r.ctsTotal
        break
      }
      case 'GRATIFICACION': {
        const { calcularGratificacion } = await import('@/lib/legal-engine/calculators/gratificacion')
        const r = calcularGratificacion(inputs)
        result = r
        totalAmount = r.totalNeto
        break
      }
      case 'INDEMNIZACION': {
        const { calcularIndemnizacion } = await import('@/lib/legal-engine/calculators/indemnizacion')
        const r = calcularIndemnizacion(inputs)
        result = r
        totalAmount = r.indemnizacion
        break
      }
      case 'HORAS_EXTRAS': {
        const { calcularHorasExtras } = await import('@/lib/legal-engine/calculators/horas-extras')
        const r = calcularHorasExtras(inputs)
        result = r
        totalAmount = r.montoTotal
        break
      }
      case 'VACACIONES': {
        const { calcularVacaciones } = await import('@/lib/legal-engine/calculators/vacaciones')
        const r = calcularVacaciones(inputs)
        result = r
        totalAmount = r.total
        break
      }
      case 'MULTA_SUNAFIL': {
        const { calcularMultaSunafil } = await import('@/lib/legal-engine/calculators/multa-sunafil')
        const r = calcularMultaSunafil(inputs)
        result = r
        totalAmount = r.multaEstimada
        break
      }
      case 'INTERESES_LEGALES': {
        const { calcularInteresesLegales } = await import('@/lib/legal-engine/calculators/intereses-legales')
        const r = calcularInteresesLegales(inputs)
        result = r
        totalAmount = r.total
        break
      }
      case 'APORTES_PREVISIONALES': {
        const { calcularAportesPrevisionales } = await import('@/lib/legal-engine/calculators/aportes-previsionales')
        const r = calcularAportesPrevisionales(inputs)
        result = r
        totalAmount = r.costoTotalEmpleador
        break
      }
      case 'UTILIDADES': {
        const { calcularUtilidades } = await import('@/lib/legal-engine/calculators/utilidades')
        const r = calcularUtilidades(inputs)
        result = r
        totalAmount = r.totalDistribuido
        break
      }
      default:
        return NextResponse.json(
          { error: `Unknown calculation type: ${type}` },
          { status: 400 }
        )
    }

    // Save to database — link to org if authenticated
    const calculation = await prisma.calculation.create({
      data: {
        type: type as 'LIQUIDACION',
        inputsJson: inputs,
        resultJson: result as object,
        totalAmount: totalAmount,
        isPublic: !orgId, // public only when no org
        ...(orgId ? { orgId } : {}),
      },
    })

    return NextResponse.json({
      data: {
        id: calculation.id,
        type: calculation.type,
        inputs,
        result,
        totalAmount,
        createdAt: calculation.createdAt.toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Calculation error:', error)
    return NextResponse.json(
      { error: 'Calculation failed. Check your inputs.' },
      { status: 500 }
    )
  }
}

// =============================================
// GET /api/calculations - List recent calculations
// PUBLIC: anonymous users see public calcs
// Authenticated users see their org's calcs
// =============================================
export async function GET(request: NextRequest) {
  try {
    // Optional auth — public listing still works without login
    const authCtx = await getAuthContext()
    const orgId = authCtx?.orgId ?? null

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (type) where.type = type as 'LIQUIDACION'
    if (orgId) {
      where.orgId = orgId
    } else {
      where.isPublic = true
    }

    const [calculations, total] = await Promise.all([
      prisma.calculation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          totalAmount: true,
          createdAt: true,
        },
      }),
      prisma.calculation.count({ where }),
    ])

    return NextResponse.json({
      data: calculations.map(c => ({
        id: c.id,
        type: c.type,
        totalAmount: c.totalAmount ? Number(c.totalAmount) : null,
        createdAt: c.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error fetching calculations:', error)
    return NextResponse.json({ error: 'Failed to fetch calculations' }, { status: 500 })
  }
}
