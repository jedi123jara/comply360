import { NextRequest, NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import { analizarDocumento, TIPOS_DOCUMENTO_LABELS, type TipoDocumento } from '@/lib/compliance/contract-analyzer'
import { reviewContract, type ContractReviewResult } from '@/lib/ai/contract-review'

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
 * Body: { texto: string, tipo: TipoDocumento, deep?: boolean }
 *
 * Requiere plan EMPRESA+ (feature `ia_contratos`). Si `deep=true` requiere
 * PRO (`review_ia`) ya que hace AI review adicional.
 */
export const POST = withPlanGate('ia_contratos', async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { texto, tipo, deep } = body as {
      texto?: string
      tipo?: string
      deep?: boolean
    }

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

    const deepMode = deep !== false // default true, explicit false to disable

    // Rule-based (rápido) + AI (paralelo si deep). Si la IA falla → sigue null.
    const [analisis, aiReview] = await Promise.all([
      Promise.resolve(analizarDocumento(texto, tipo as TipoDocumento)),
      deepMode
        ? reviewContract({ contractHtml: texto, contractType: tipo }).catch((err) => {
            console.warn('[analyze-contract] AI review falló:', err)
            return null as ContractReviewResult | null
          })
        : Promise.resolve(null as ContractReviewResult | null),
    ])

    return NextResponse.json({
      ok: true,
      tipoLabel: TIPOS_DOCUMENTO_LABELS[tipo as TipoDocumento],
      aiReview,
      aiAttempted: deepMode,
      ...analisis,
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
export const GET = withPlanGate('ia_contratos', async () => {
  return NextResponse.json({
    tipos: TIPOS_VALIDOS.map(t => ({
      value: t,
      label: TIPOS_DOCUMENTO_LABELS[t],
    })),
  })
})
