import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { runBulkGeneration } from '@/lib/contracts/bulk/runner'
import type { ContractType } from '@/generated/prisma/client'

// =============================================
// POST /api/contracts/bulk/generate
// Toma un array de filas validadas + contractType y devuelve el ZIP con
// los DOCX + manifest.json. Procesa síncronamente (sin Redis): para
// volúmenes grandes use lotes ≤ 200 filas.
//
// Cabe destacar que cada fila crea un Contract real en BD (con motor de
// validación, hash-chain, etc.), no solo el .docx — la respuesta es el
// ZIP listo para descarga.
// =============================================

const RowSchema = z.object({
  trabajador_nombre: z.string().min(2),
  trabajador_dni: z.string().regex(/^\d{8,12}$/),
  cargo: z.string().min(2),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  remuneracion: z.number().positive(),
  causa_objetiva: z.string().optional(),
  jornada_semanal: z.number().optional(),
  email: z.string().optional(),
  direccion: z.string().optional(),
}).passthrough()

const BodySchema = z.object({
  contractType: z.enum(['LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO', 'LABORAL_TIEMPO_PARCIAL']),
  rows: z.array(RowSchema).min(1).max(200),
  templateId: z.string().optional(),
  titleTemplate: z.string().optional(),
  sourceFileName: z.string().optional(),
})

export const POST = withPlanGate('contratos', async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Body inválido', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const result = await runBulkGeneration({
      orgId: ctx.orgId,
      userId: ctx.userId,
      rows: parsed.data.rows as never,
      contractType: parsed.data.contractType as ContractType,
      templateId: parsed.data.templateId,
      titleTemplate: parsed.data.titleTemplate,
      sourceFileName: parsed.data.sourceFileName,
    })

    const fileName = `contratos-bulk-${result.jobId}.zip`
    return new NextResponse(result.zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(result.zipBuffer.byteLength),
        'X-Bulk-Job-Id': result.jobId,
        'X-Bulk-Total': String(result.totalRows),
        'X-Bulk-Succeeded': String(result.succeededRows),
        'X-Bulk-Failed': String(result.failedRows),
        'X-Bulk-Sha256': result.zipSha256,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[POST /api/contracts/bulk/generate]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error generando contratos en lote.' },
      { status: 500 },
    )
  }
})
