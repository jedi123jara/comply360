import { IndemnizacionCalculadora } from '@/components/calculadoras/indemnizacion-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'
import { EncabezadoCalculadora } from '@/components/calculadoras/shared/encabezado'

/**
 * Acepta `?dni=` para precargar al trabajador (y su régimen) desde su ficha.
 */
export default async function IndemnizacionPage({
  searchParams,
}: {
  searchParams: Promise<{ dni?: string | string[] }>
}) {
  const { dni } = await searchParams
  return (
    <div className="space-y-6">
      <EncabezadoCalculadora calc="indemnizacion" />
      <IndemnizacionCalculadora prefillDni={typeof dni === 'string' ? dni : undefined} />
      <CalculationHistory type="INDEMNIZACION" />
    </div>
  )
}
