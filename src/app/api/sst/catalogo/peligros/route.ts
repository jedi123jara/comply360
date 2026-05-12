import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'

// =============================================
// GET /api/sst/catalogo/peligros — Catálogo seed global de peligros (~80 entradas)
// Query params:
//   familia       — filtrar por familia (FISICO | QUIMICO | etc.)
//   sectorCiiu    — filtrar por CIIU (sectores específicos)
//   search        — búsqueda en nombre + descripción
// =============================================
export const GET = withPlanGate('sst_completo', async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const familia = searchParams.get('familia')
  const sectorCiiu = searchParams.get('sectorCiiu')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (familia) where.familia = familia
  if (sectorCiiu) {
    // null = aplica a todos los sectores; matchea null OR el sector específico
    where.OR = [{ sectorCiiu: null }, { sectorCiiu }]
  }
  if (search && search.length >= 2) {
    where.AND = [
      {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { descripcion: { contains: search, mode: 'insensitive' } },
        ],
      },
    ]
  }

  const peligros = await prisma.catalogoPeligro.findMany({
    where,
    orderBy: [{ familia: 'asc' }, { codigo: 'asc' }],
    take: 500,
  })

  // Agrupar por familia para que el frontend pueda renderizar selectores con grupos
  const byFamilia = peligros.reduce(
    (acc, p) => {
      if (!acc[p.familia]) acc[p.familia] = []
      acc[p.familia].push(p)
      return acc
    },
    {} as Record<string, typeof peligros>,
  )

  return NextResponse.json({
    peligros,
    byFamilia,
    total: peligros.length,
  })
})
