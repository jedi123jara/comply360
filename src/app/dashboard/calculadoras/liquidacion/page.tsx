import { LiquidacionCalculadora } from '@/components/calculadoras/liquidacion-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'
import { EncabezadoCalculadora } from '@/components/calculadoras/shared/encabezado'

/**
 * Acepta `?dni=` para precargar al trabajador (y su régimen) desde su ficha.
 */
export default async function LiquidacionPage({
  searchParams,
}: {
  searchParams: Promise<{ dni?: string | string[] }>
}) {
  const { dni } = await searchParams
  return (
    <div className="space-y-6">
      <EncabezadoCalculadora calc="liquidacion" />
      <LiquidacionCalculadora prefillDni={typeof dni === 'string' ? dni : undefined} />
      <CalculationHistory type="LIQUIDACION" />
    </div>
  )
}
