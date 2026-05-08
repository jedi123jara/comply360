import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import type { ContractType } from '@/generated/prisma/client'

// =============================================
// GET /api/contracts/clauses
// Catálogo de cláusulas activas. Soporta filtros:
//   ?category=POTESTATIVA|CAUSA_OBJETIVA|OBLIGATORIA
//   ?type=CONFIDENCIALIDAD|...
//   ?contractType=LABORAL_PLAZO_FIJO|... (filtra por applicableTo)
// =============================================
export const GET = withPlanGate('contratos', async (req: NextRequest, _ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const type = searchParams.get('type')
  const contractType = searchParams.get('contractType') as ContractType | null

  const where: {
    active: boolean
    category?: string
    type?: string
  } = { active: true }
  if (category) where.category = category
  if (type) where.type = type

  const clauses = await prisma.contractClause.findMany({
    where,
    orderBy: [{ category: 'asc' }, { type: 'asc' }, { code: 'asc' }],
  })

  // Filtro post-query por contractType (applicableTo es JSON, no se puede filtrar
  // de forma fiable en query — lo hacemos en memoria y devolvemos el subset).
  const filtered = contractType
    ? clauses.filter((c) => {
        const a = c.applicableTo as { contractTypes?: ContractType[] } | null
        if (!a || !a.contractTypes || a.contractTypes.length === 0) return true
        return a.contractTypes.includes(contractType)
      })
    : clauses

  return NextResponse.json({
    data: filtered.map((c) => ({
      id: c.id,
      code: c.code,
      category: c.category,
      type: c.type,
      title: c.title,
      bodyTemplate: c.bodyTemplate,
      legalBasis: c.legalBasis,
      variables: c.variables,
      applicableTo: c.applicableTo,
      version: c.version,
    })),
  })
})
