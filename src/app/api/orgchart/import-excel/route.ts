import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import {
  applyOrgChartImport,
  OrgChartImportValidationError,
  orgChartImportTemplateCsv,
  previewOrgChartImport,
} from '@/lib/orgchart/import-excel'
import { requestIp } from '@/lib/orgchart/change-log'
import { takeSnapshot } from '@/lib/orgchart/snapshot-service'

export const runtime = 'nodejs'

export const GET = withRole('ADMIN', async () => {
  return new NextResponse(orgChartImportTemplateCsv(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="plantilla-organigrama.csv"',
    },
  })
})

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const formData = await req.formData()
  const upload = formData.get('file')
  if (!isUploadFile(upload)) {
    return NextResponse.json({ error: 'Adjunta un archivo Excel o CSV.' }, { status: 400 })
  }

  const buffer = Buffer.from(await upload.arrayBuffer())
  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: 'El archivo está vacío.' }, { status: 400 })
  }

  const fileName = upload.name || 'import-organigrama.xlsx'
  const shouldApply = formData.get('apply') === 'true' || formData.get('mode') === 'apply'

  if (!shouldApply) {
    const preview = await previewOrgChartImport(ctx.orgId, buffer, { fileName })
    return NextResponse.json(preview)
  }

  try {
    const result = await applyOrgChartImport(ctx.orgId, buffer, {
      fileName,
      userId: ctx.userId,
      ipAddress: requestIp(req.headers),
    })

    await takeSnapshot(ctx.orgId, {
      label: `Importación Excel - ${fileName}`.slice(0, 120),
      reason: 'Snapshot automático posterior a importación de estructura organizacional',
      takenById: ctx.userId,
      isAuto: true,
    }).catch(() => {})

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof OrgChartImportValidationError) {
      return NextResponse.json(error.preview, { status: 422 })
    }
    throw error
  }
})

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    typeof value.arrayBuffer === 'function'
  )
}
