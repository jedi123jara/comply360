import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  createJurisprudenceUpdate,
  listJurisprudence,
} from '@/lib/contracts/jurisprudence/service'

// =============================================
// GET /api/admin/jurisprudence-updates
// Lista todas las entradas del ingestor jurisprudencial. SUPER_ADMIN.
// Query params:
//   ?status=PENDING|APPROVED|APPLIED|REJECTED
//   ?source=CORTE_SUPREMA|TRIBUNAL_CONSTITUCIONAL|SUNAFIL|MTPE|OTRO
//   ?limit=N (max 200)
// =============================================
export const GET = withRole('SUPER_ADMIN', async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as 'PENDING' | 'APPROVED' | 'APPLIED' | 'REJECTED' | null
  const source = searchParams.get('source')
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)

  const items = await listJurisprudence({
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
    limit,
  })

  return NextResponse.json({
    data: items.map((i) => ({
      ...i,
      publicationDate: i.publicationDate.toISOString(),
      reviewedAt: i.reviewedAt?.toISOString() ?? null,
      appliedAt: i.appliedAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
  })
})

// =============================================
// POST /api/admin/jurisprudence-updates
// Crea un update con afectaciones declarativas. Queda en PENDING hasta
// que un admin lo apruebe y aplique.
// =============================================

// Para mantener Zod simple, validamos las afectaciones como records flexibles
// con los campos mínimos. La validación profunda vive en apply.ts.
const RuleAffectationSchema = z.object({
  ruleCode: z.string().min(1),
  action: z.enum(['ADD', 'MODIFY', 'DEPRECATE']),
}).passthrough()

const ClauseAffectationSchema = z.object({
  code: z.string().min(1),
  action: z.enum(['ADD', 'MODIFY', 'DEPRECATE']),
}).passthrough()

const CreateSchema = z.object({
  source: z.enum(['CORTE_SUPREMA', 'TRIBUNAL_CONSTITUCIONAL', 'SUNAFIL', 'MTPE', 'OTRO']),
  reference: z.string().min(2),
  title: z.string().min(5),
  publicationDate: z.coerce.date(),
  topic: z.string().min(2),
  summary: z.string().min(10),
  fullTextUrl: z.string().url().optional().nullable(),
  affectedRules: z.array(RuleAffectationSchema).default([]),
  affectedClauses: z.array(ClauseAffectationSchema).default([]),
  notes: z.string().optional().nullable(),
})

export const POST = withRole('SUPER_ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Body inválido', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Validación de coherencia: al menos una afectación
  if (parsed.data.affectedRules.length + parsed.data.affectedClauses.length === 0) {
    return NextResponse.json(
      { error: 'Debe declarar al menos una afectación de regla o cláusula.' },
      { status: 400 },
    )
  }

  try {
    const created = await createJurisprudenceUpdate(
      {
        ...parsed.data,
        affectedRules: parsed.data.affectedRules as never,
        affectedClauses: parsed.data.affectedClauses as never,
      },
      ctx.userId,
    )
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/jurisprudence-updates]', err)
    return NextResponse.json({ error: 'Error creando jurisprudence update' }, { status: 500 })
  }
})
