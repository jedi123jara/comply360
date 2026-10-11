import { InteresesLegalesCalculadora } from '@/components/calculadoras/intereses-legales-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'
import { EncabezadoCalculadora } from '@/components/calculadoras/shared/encabezado'

export default function InteresesLegalesPage() {
  return (
    <div className="space-y-6">
      <EncabezadoCalculadora calc="intereses_legales" />
      <InteresesLegalesCalculadora />
      <CalculationHistory type="INTERESES_LEGALES" />
    </div>
  )
}
