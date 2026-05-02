import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { parseBulkFile } from '@/lib/contracts/bulk/parser'
import { validateBulkPreview } from '@/lib/contracts/bulk/validator'

// =============================================
// POST /api/contracts/bulk/preview
// Recibe un Excel/CSV via FormData (campo "file") + contractType y devuelve
// el set de filas validadas. NO crea contratos — solo previsualiza.
//
// Limit: 200 filas por archivo (suficiente para una empresa mediana).
// Para volúmenes mayores el flujo debe partir el archivo en lotes.
// =============================================

const MAX_ROWS = 200

export const POST = withAuth(async (req: NextRequest, _ctx: AuthContext) => {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const contractTypeRaw = formData.get('contractType')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Falta el archivo (campo "file").' }, { status: 400 })
    }

    const contractType = String(contractTypeRaw ?? 'LABORAL_INDEFINIDO') as
      | 'LABORAL_INDEFINIDO'
      | 'LABORAL_PLAZO_FIJO'
      | 'LABORAL_TIEMPO_PARCIAL'

    const allowed = ['LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO', 'LABORAL_TIEMPO_PARCIAL']
    if (!allowed.includes(contractType)) {
      return NextResponse.json(
        { error: `contractType inválido. Permitidos: ${allowed.join(', ')}` },
        { status: 400 },
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const parsed = parseBulkFile({ buffer: arrayBuffer })

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        { error: 'El archivo no contiene filas con datos.' },
        { status: 422 },
      )
    }

    if (parsed.rows.length > MAX_ROWS) {
      return NextResponse.json(
        {
          error: `El archivo tiene ${parsed.rows.length} filas — el máximo permitido es ${MAX_ROWS}. Divide en lotes y reintenta.`,
        },
        { status: 413 },
      )
    }

    const result = validateBulkPreview(parsed.rows, parsed.detectedColumns, { contractType })

    return NextResponse.json({
      data: {
        ...result,
        contractType,
        sourceFileName: file.name,
        columnMapping: parsed.columnMapping,
      },
    })
  } catch (err) {
    console.error('[POST /api/contracts/bulk/preview]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error procesando el archivo.' },
      { status: 500 },
    )
  }
})
