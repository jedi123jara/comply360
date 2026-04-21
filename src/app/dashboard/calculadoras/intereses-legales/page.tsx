import { InteresesLegalesCalculadora } from '@/components/calculadoras/intereses-legales-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'

export default function InteresesLegalesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <span>Calculadoras</span>
          <span>/</span>
          <span className="text-primary font-medium">Intereses Legales</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Calculadora de Intereses Legales
        </h1>
        <p className="text-gray-400 mt-1">
          Calcula los intereses legales laborales y efectivos sobre adeudos según la tasa del BCRP.
          Los montos se actualizan en tiempo real.
        </p>
      </div>

      {/* Calculator */}
      <InteresesLegalesCalculadora />

      {/* History */}
      <CalculationHistory type="INTERESES_LEGALES" />
    </div>
  )
}
