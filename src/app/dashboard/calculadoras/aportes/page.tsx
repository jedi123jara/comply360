import { AportesCalculadora } from '@/components/calculadoras/aportes-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'
import { EncabezadoCalculadora } from '@/components/calculadoras/shared/encabezado'

export default function AportesPage() {
  return (
    <div className="space-y-6">
      <EncabezadoCalculadora calc="aportes_previsionales" />
      <AportesCalculadora />
      <CalculationHistory type="APORTES_PREVISIONALES" />
    </div>
  )
}
