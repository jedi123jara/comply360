import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { analizarDocumento, TIPOS_DOCUMENTO_LABELS, type TipoDocumento } from '@/lib/compliance/contract-analyzer'

const TIPOS_VALIDOS: TipoDocumento[] = [
  'CONTRATO_INDEFINIDO',
  'CONTRATO_PLAZO_FIJO',
  'CONTRATO_TIEMPO_PARCIAL',
  'CONTRATO_MYPE',
  'LOCACION_SERVICIOS',
  'REGLAMENTO_INTERNO',
  'POLITICA_HOSTIGAMIENTO',
  'POLITICA_SST',
]

/**
 * POST /api/compliance/analyze-contract
 * Analiza el texto de un contrato o documento y detecta cláusulas ilegales,
 * omisiones obligatorias y riesgos según jurisprudencia SUNAFIL.
 *
 * Body: { texto: string, tipo: TipoDocumento }
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { texto, tipo } = body

    if (!texto || typeof texto !== 'string') {
      return NextResponse.json({ error: 'El campo "texto" es requerido' }, { status: 400 })
    }
    if (!tipo || !TIPOS_VALIDOS.includes(tipo as TipoDocumento)) {
      return NextResponse.json({
        error: `Tipo de documento inválido. Valores válidos: ${TIPOS_VALIDOS.join(', ')}`,
      }, { status: 400 })
    }
    if (texto.length < 50) {
      return NextResponse.json({ error: 'El texto es demasiado corto para analizarse (mínimo 50 caracteres)' }, { status: 400 })
    }
    if (texto.length > 200000) {
      return NextResponse.json({ error: 'El texto excede el tamaño máximo permitido (200,000 caracteres)' }, { status: 400 })
    }

    const resultado = analizarDocumento(texto, tipo as TipoDocumento)

    return NextResponse.json({
      ok: true,
      tipoLabel: TIPOS_DOCUMENTO_LABELS[tipo as TipoDocumento],
      ...resultado,
    })
  } catch (error) {
    console.error('[ANALYZE CONTRACT] Error:', error)
    return NextResponse.json({ error: 'Error al analizar el documento' }, { status: 500 })
  }
})

/**
 * GET /api/compliance/analyze-contract
 * Devuelve los tipos de documentos disponibles para análisis
 */
export const GET = withAuth(async () => {
  return NextResponse.json({
    tipos: TIPOS_VALIDOS.map(t => ({
      value: t,
      label: TIPOS_DOCUMENTO_LABELS[t],
    })),
  })
})
