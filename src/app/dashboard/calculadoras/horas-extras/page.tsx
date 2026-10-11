import { HorasExtrasCalculadora } from '@/components/calculadoras/horas-extras-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'
import { EncabezadoCalculadora } from '@/components/calculadoras/shared/encabezado'

export default function HorasExtrasPage() {
  return (
    <div className="space-y-6">
      <EncabezadoCalculadora calc="horas_extras" />
      <HorasExtrasCalculadora />
      <CalculationHistory type="HORAS_EXTRAS" />
    </div>
  )
}
