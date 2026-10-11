import { UtilidadesCalculadora } from '@/components/calculadoras/utilidades-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'
import { EncabezadoCalculadora } from '@/components/calculadoras/shared/encabezado'

export default function UtilidadesPage() {
  return (
    <div className="space-y-6">
      <EncabezadoCalculadora calc="utilidades" />
      <UtilidadesCalculadora />
      <CalculationHistory type="UTILIDADES" />
    </div>
  )
}
