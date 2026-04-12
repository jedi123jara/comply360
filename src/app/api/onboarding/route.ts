import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/onboarding — Full org profile
// =============================================
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const orgId = ctx.orgId

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        ruc: true,
        razonSocial: true,
        nombreComercial: true,
        sector: true,
        sizeRange: true,
        regimenPrincipal: true,
        regimenTributario: true,
        alertEmail: true,
        phone: true,
        address: true,
        city: true,
        province: true,
        district: true,
        logoUrl: true,
        repNombre: true,
        repDni: true,
        repCargo: true,
        contNombre: true,
        contCpc: true,
        contEmail: true,
        plan: true,
        onboardingCompleted: true,
      },
    })

    if (!org) {
      return NextResponse.json({ onboardingCompleted: false, org: null })
    }

    return NextResponse.json({ onboardingCompleted: org.onboardingCompleted, org })
  } catch (error) {
    console.error('Onboarding GET error:', error)
    return NextResponse.json({ error: 'Failed to check onboarding' }, { status: 500 })
  }
})

// =============================================
// POST /api/onboarding — Save org profile
// =============================================
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const {
      razonSocial,
      ruc,
      nombreComercial,
      sector,
      sizeRange,
      regimenPrincipal,
      regimenTributario,
      alertEmail,
      phone,
      address,
      city,
      province,
      district,
      // Representante legal
      repNombre,
      repDni,
      repCargo,
      // Contador
      contNombre,
      contCpc,
      contEmail,
    } = body

    if (!razonSocial?.trim()) {
      return NextResponse.json(
        { error: 'La razón social es obligatoria' },
        { status: 400 }
      )
    }

    // RUC is optional for partial updates but must be 11 digits if provided
    if (ruc && !/^\d{11}$/.test(String(ruc).trim())) {
      return NextResponse.json(
        { error: 'El RUC debe tener exactamente 11 dígitos' },
        { status: 400 }
      )
    }

    const orgId = ctx.orgId

    const data = {
      name: razonSocial.trim(),
      razonSocial: razonSocial.trim(),
      ...(ruc ? { ruc: String(ruc).trim() } : {}),
      nombreComercial: nombreComercial?.trim() || null,
      sector: sector || null,
      sizeRange: sizeRange || null,
      regimenPrincipal: regimenPrincipal || 'GENERAL',
      regimenTributario: regimenTributario || null,
      alertEmail: alertEmail?.trim() || null,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      province: province?.trim() || null,
      district: district?.trim() || null,
      repNombre: repNombre?.trim() || null,
      repDni: repDni?.trim() || null,
      repCargo: repCargo?.trim() || null,
      contNombre: contNombre?.trim() || null,
      contCpc: contCpc?.trim() || null,
      contEmail: contEmail?.trim() || null,
      onboardingCompleted: true,
    }

    let org = await prisma.organization.findUnique({ where: { id: orgId } })

    if (org) {
      org = await prisma.organization.update({ where: { id: orgId }, data })
    } else {
      org = await prisma.organization.create({
        data: { id: orgId, ...data, plan: 'STARTER' },
      })
    }

    return NextResponse.json({ data: org }, { status: 201 })
  } catch (error) {
    console.error('Onboarding POST error:', error)
    const message =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : 'Failed to save company data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
