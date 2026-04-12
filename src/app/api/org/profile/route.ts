/**
 * GET /api/org/profile
 *
 * Devuelve el perfil completo de la organizacion del usuario autenticado
 * para pre-llenar formularios (contratos, trabajadores, etc.) con datos
 * reales de la empresa.
 *
 * Incluye:
 *  - Datos fiscales: RUC, razonSocial, name, sector, sizeRange
 *  - Regimen principal laboral
 *  - OWNER (representante legal por defecto): nombre completo y email
 *  - Logo
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const [org, owner] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: ctx.orgId },
        select: {
          id: true,
          name: true,
          ruc: true,
          sector: true,
          sizeRange: true,
          logoUrl: true,
          plan: true,
          regimenPrincipal: true,
          alertEmail: true,
          razonSocial: true,
        },
      }),
      prisma.user.findFirst({
        where: { orgId: ctx.orgId, role: 'OWNER' },
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      }),
    ])

    if (!org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    // Construir el nombre del representante legal (OWNER)
    const representanteLegal =
      owner && (owner.firstName || owner.lastName)
        ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim()
        : null

    return NextResponse.json({
      org: {
        id: org.id,
        name: org.name,
        ruc: org.ruc,
        razonSocial: org.razonSocial || org.name,
        sector: org.sector,
        sizeRange: org.sizeRange,
        logoUrl: org.logoUrl,
        plan: org.plan,
        regimenPrincipal: org.regimenPrincipal,
      },
      representanteLegal,
      representanteEmail: owner?.email || null,
      alertEmail: org.alertEmail,
    })
  } catch (error) {
    console.error('Error fetching org profile:', error)
    return NextResponse.json(
      { error: 'No se pudo cargar el perfil de la organización' },
      { status: 500 }
    )
  }
})
