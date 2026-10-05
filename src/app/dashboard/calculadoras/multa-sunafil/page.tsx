import { MultaSunafilCalculadora } from '@/components/calculadoras/multa-sunafil-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'
import { EncabezadoCalculadora } from '@/components/calculadoras/shared/encabezado'

export default function MultaSunafilPage() {
  return (
    <div className="space-y-6">
      <EncabezadoCalculadora calc="multa_sunafil" />
      <MultaSunafilCalculadora />
      <CalculationHistory type="MULTA_SUNAFIL" />
    </div>
  )
}
