/**
 * GET /api/orgchart/memoria-anual?year=2026
 *
 * Genera y descarga la **Memoria Anual del Organigrama** en PDF.
 *
 * Es el artefacto institucional entregable a Directorio o SUNAFIL: ~9
 * páginas con portada, score, estructura, responsables legales, hallazgos
 * del Org Doctor, anexo MOF, evolución del ejercicio y certificado de
 * gobernanza con hash SHA-256 del snapshot de cierre.
 */
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'

import { withRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  buildMemoriaAnualData,
  MemoriaAnualPDF,
} from '@/lib/orgchart/memoria-pdf'
import { silentLog } from '@/lib/orgchart/_v2-utils/silent-log'

export const runtime = 'nodejs'
// La generación del PDF puede tomar varios segundos en orgs grandes.
// Le subimos el límite de tiempo del Edge para evitar 504.
export const maxDuration = 60

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  const yearParam = req.nextUrl.searchParams.get('year')
  const year = yearParam ? Number(yearParam) : new Date().getFullYear()

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json(
      { error: `Año inválido: ${yearParam}. Debe estar entre 2000 y 2100.` },
      { status: 400 },
    )
  }

  let data
  try {
    data = await buildMemoriaAnualData(ctx.orgId, year)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al construir datos'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const buffer = await renderToBuffer(<MemoriaAnualPDF data={data} />)

  // Audit log para trazabilidad — útil para SUNAFIL ("¿cuándo generó la empresa este informe?")
  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'orgchart.memoria_anual_generated',
        metadataJson: {
          year,
          workerCount: data.stats.workerCount,
          unitCount: data.stats.unitCount,
          findingsCount: data.doctorReport.findings.length,
          snapshotHash: data.evolution.endSnapshot.hash,
          globalScore: data.coverage.globalScore,
        } as object,
      },
    })
    .catch(silentLog('orgchart.memoria_anual.audit_log_failed', {
      orgId: ctx.orgId,
      userId: ctx.userId,
      year,
    }))

  // Conversión Buffer → ArrayBuffer para el body de Next.
  const ab = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(ab).set(buffer)

  const filename = `memoria-anual-organigrama-${year}.pdf`
  return new NextResponse(new Blob([ab], { type: 'application/pdf' }), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
})
