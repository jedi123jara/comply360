import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

// =============================================
// Helpers: riesgo de desnaturalizacion
// =============================================
// Cada indicador suma peso. SUNAFIL usa el "principio de primacia de la
// realidad": si hay subordinacion real, se reclasifica a 5ta categoria.
function calcDesnaturalizacionRisk(flags: {
  hasFixedSchedule?: boolean
  hasExclusivity?: boolean
  worksOnPremises?: boolean
  usesCompanyTools?: boolean
  reportsToSupervisor?: boolean
  receivesOrders?: boolean
}): number {
  let score = 0
  if (flags.hasFixedSchedule) score += 25      // el mas critico
  if (flags.reportsToSupervisor) score += 20
  if (flags.receivesOrders) score += 20
  if (flags.hasExclusivity) score += 15
  if (flags.usesCompanyTools) score += 10
  if (flags.worksOnPremises) score += 10
  return Math.min(score, 100)
}

// =============================================
// GET /api/prestadores — Lista con filtros
// =============================================
export const GET = withPlanGate('workers', async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const area = searchParams.get('area')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where = {
    orgId,
    ...(status ? { status: status as 'ACTIVE' } : {}),
    ...(area ? { area } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { documentNumber: { contains: search } },
            { ruc: { contains: search } },
            { servicioDescripcion: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [providers, total] = await Promise.all([
    prisma.serviceProvider.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        documentType: true,
        documentNumber: true,
        ruc: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        profession: true,
        servicioDescripcion: true,
        area: true,
        startDate: true,
        endDate: true,
        monthlyAmount: true,
        hasSuspensionRetencion: true,
        desnaturalizacionRisk: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.serviceProvider.count({ where }),
  ])

  return NextResponse.json({
    data: providers.map(p => ({
      ...p,
      monthlyAmount: Number(p.monthlyAmount),
      startDate: p.startDate.toISOString(),
      endDate: p.endDate?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

// =============================================
// POST /api/prestadores — Crear prestador
// =============================================
export const POST = withPlanGate('workers', async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const body = await req.json()
  const {
    documentType = 'DNI',
    documentNumber,
    ruc,
    firstName,
    lastName,
    email,
    phone,
    address,
    profession,
    servicioDescripcion,
    area,
    startDate,
    endDate,
    monthlyAmount,
    currency = 'PEN',
    paymentFrequency = 'MONTHLY',
    hasSuspensionRetencion = false,
    suspensionExpiryDate,
    hasFixedSchedule = false,
    hasExclusivity = false,
    worksOnPremises = false,
    usesCompanyTools = false,
    reportsToSupervisor = false,
    receivesOrders = false,
    notes,
  } = body

  // Validaciones basicas
  if (!documentNumber || !firstName || !lastName || !servicioDescripcion || !startDate || monthlyAmount == null) {
    return NextResponse.json(
      { error: 'documentNumber, firstName, lastName, servicioDescripcion, startDate y monthlyAmount son obligatorios' },
      { status: 400 }
    )
  }

  if (documentType === 'DNI' && !/^\d{8}$/.test(documentNumber)) {
    return NextResponse.json({ error: 'El DNI debe tener 8 digitos' }, { status: 400 })
  }

  if (ruc && !/^\d{11}$/.test(ruc)) {
    return NextResponse.json({ error: 'El RUC debe tener 11 digitos' }, { status: 400 })
  }

  const montoNum = Number(monthlyAmount)
  if (isNaN(montoNum) || montoNum <= 0 || montoNum >= 1_000_000) {
    return NextResponse.json(
      { error: 'monthlyAmount debe ser un numero mayor a 0 y menor a 1,000,000' },
      { status: 400 }
    )
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Formato de email invalido' }, { status: 400 })
  }

  // Evitar duplicados por documento dentro de la organizacion
  const existing = await prisma.serviceProvider.findUnique({
    where: { orgId_documentNumber: { orgId, documentNumber } },
  })
  if (existing) {
    return NextResponse.json(
      { error: `Ya existe un prestador con documento ${documentNumber} en esta organizacion` },
      { status: 409 }
    )
  }

  // Calcular riesgo de desnaturalizacion
  const desnaturalizacionRisk = calcDesnaturalizacionRisk({
    hasFixedSchedule,
    hasExclusivity,
    worksOnPremises,
    usesCompanyTools,
    reportsToSupervisor,
    receivesOrders,
  })

  // Si el riesgo es >= 60, marcar como AT_RISK
  const status = desnaturalizacionRisk >= 60 ? 'AT_RISK' : 'ACTIVE'

  const provider = await prisma.serviceProvider.create({
    data: {
      orgId,
      documentType,
      documentNumber,
      ruc: ruc || null,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      address: address || null,
      profession: profession || null,
      servicioDescripcion,
      area: area || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      monthlyAmount: montoNum,
      currency,
      paymentFrequency,
      hasSuspensionRetencion,
      suspensionExpiryDate: suspensionExpiryDate ? new Date(suspensionExpiryDate) : null,
      hasFixedSchedule,
      hasExclusivity,
      worksOnPremises,
      usesCompanyTools,
      reportsToSupervisor,
      receivesOrders,
      desnaturalizacionRisk,
      status,
      notes: notes || null,
    },
  })

  return NextResponse.json(
    {
      data: {
        ...provider,
        monthlyAmount: Number(provider.monthlyAmount),
      },
    },
    { status: 201 }
  )
})

