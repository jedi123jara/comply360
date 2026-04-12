import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { generateWorkerAlerts } from '@/lib/alerts/alert-engine'

// =============================================
// GET /api/workers - List workers
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const regimen = searchParams.get('regimen')
  const department = searchParams.get('department')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where = {
    orgId,
    ...(status
      ? status.includes(',')
        ? { status: { in: status.split(',').map(s => s.trim()) as ('ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED')[] } }
        : { status: status as 'ACTIVE' }
      : {}),
    ...(regimen ? { regimenLaboral: regimen as 'GENERAL' } : {}),
    ...(department ? { department } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { dni: { contains: search } },
            { position: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [workers, total] = await Promise.all([
    prisma.worker.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        dni: true,
        firstName: true,
        lastName: true,
        position: true,
        department: true,
        regimenLaboral: true,
        tipoContrato: true,
        fechaIngreso: true,
        sueldoBruto: true,
        tipoAporte: true,
        asignacionFamiliar: true,
        status: true,
        legajoScore: true,
        createdAt: true,
      },
    }),
    prisma.worker.count({ where }),
  ])

  return NextResponse.json({
    data: workers.map(w => ({
      ...w,
      sueldoBruto: Number(w.sueldoBruto),
      fechaIngreso: w.fechaIngreso.toISOString(),
      createdAt: w.createdAt.toISOString(),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

// =============================================
// POST /api/workers - Create worker
// =============================================
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const body = await req.json()
  const {
    dni,
    firstName,
    lastName,
    email,
    phone,
    birthDate,
    gender,
    nationality,
    address,
    position,
    department,
    regimenLaboral = 'GENERAL',
    tipoContrato = 'INDEFINIDO',
    fechaIngreso,
    sueldoBruto,
    asignacionFamiliar = false,
    jornadaSemanal = 48,
    tiempoCompleto = true,
    tipoAporte = 'AFP',
    afpNombre,
    cuspp,
    essaludVida = false,
    sctr = false,
  } = body

  // Validations
  if (!dni || !firstName || !lastName || !fechaIngreso || sueldoBruto == null) {
    return NextResponse.json(
      { error: 'dni, firstName, lastName, fechaIngreso, and sueldoBruto are required' },
      { status: 400 }
    )
  }

  if (!/^\d{8}$/.test(dni)) {
    return NextResponse.json(
      { error: 'DNI must be 8 digits' },
      { status: 400 }
    )
  }

  // sueldoBruto numeric range validation
  const sueldoNum = Number(sueldoBruto)
  if (isNaN(sueldoNum) || sueldoNum <= 0 || sueldoNum >= 1_000_000) {
    return NextResponse.json(
      { error: 'sueldoBruto must be a number greater than 0 and less than 1,000,000' },
      { status: 400 }
    )
  }

  // birthDate must be in the past
  if (birthDate) {
    const birth = new Date(birthDate)
    if (isNaN(birth.getTime()) || birth >= new Date()) {
      return NextResponse.json(
        { error: 'birthDate must be a valid date in the past' },
        { status: 400 }
      )
    }
  }

  // Basic email format validation
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    )
  }

  // Check duplicate DNI within org
  const existing = await prisma.worker.findUnique({
    where: { orgId_dni: { orgId, dni } },
  })
  if (existing) {
    return NextResponse.json(
      { error: `Ya existe un trabajador con DNI ${dni} en esta organizacion` },
      { status: 409 }
    )
  }

  const worker = await prisma.worker.create({
    data: {
      orgId,
      dni,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      gender: gender || null,
      nationality: nationality || 'peruana',
      address: address || null,
      position: position || null,
      department: department || null,
      regimenLaboral: regimenLaboral as 'GENERAL',
      tipoContrato: tipoContrato as 'INDEFINIDO',
      fechaIngreso: new Date(fechaIngreso),
      sueldoBruto,
      asignacionFamiliar,
      jornadaSemanal,
      tiempoCompleto,
      tipoAporte: tipoAporte as 'AFP',
      afpNombre: afpNombre || null,
      cuspp: cuspp || null,
      essaludVida,
      sctr,
      status: 'ACTIVE',
      legajoScore: 0,
    },
  })

  // Trigger alert computation (calendar-based alerts apply from day one).
  // Wrapped so a failure in alerting never blocks worker creation.
  try {
    await generateWorkerAlerts(worker.id)
  } catch (err) {
    console.error('[workers/POST] generateWorkerAlerts failed', { workerId: worker.id, err })
  }

  return NextResponse.json({ data: worker }, { status: 201 })
})
