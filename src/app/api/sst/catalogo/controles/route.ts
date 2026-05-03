import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/sst/catalogo/controles — Catálogo seed global de controles (40 entradas)
// distribuidos en 5 niveles de jerarquía R.M. 050-2013-TR.
// Query params:
//   nivel             — ELIMINACION | SUSTITUCION | INGENIERIA | ADMINISTRATIVO | EPP
//   peligroIdSugerido — filtrar controles sugeridos para un peligro
// =============================================
export const GET = withAuth(async (req: NextRequest, _ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const nivel = searchParams.get('nivel')
  const peligroIdSugerido = searchParams.get('peligroIdSugerido')

  const where: Record<string, unknown> = {}
  if (nivel) where.nivel = nivel
  if (peligroIdSugerido) where.peligroIdSugerido = peligroIdSugerido

  const controles = await prisma.catalogoControl.findMany({
    where,
    orderBy: [{ nivel: 'asc' }, { codigo: 'asc' }],
  })

  // Agrupar por nivel para que el editor IPERC pueda renderizar la jerarquía
  const byNivel = controles.reduce(
    (acc, c) => {
      if (!acc[c.nivel]) acc[c.nivel] = []
      acc[c.nivel].push(c)
      return acc
    },
    {} as Record<string, typeof controles>,
  )

  return NextResponse.json({
    controles,
    byNivel,
    total: controles.length,
  })
})
