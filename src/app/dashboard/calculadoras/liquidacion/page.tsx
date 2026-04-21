import { LiquidacionCalculadora } from '@/components/calculadoras/liquidacion-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'

export default function LiquidacionPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <span>Calculadoras</span>
          <span>/</span>
          <span className="text-primary font-medium">Liquidación Total</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Calculadora de Liquidación Laboral
        </h1>
        <p className="text-gray-400 mt-1">
          Calcula todos los beneficios sociales del trabajador según la normativa peruana vigente.
          Los montos se actualizan en tiempo real.
        </p>
      </div>

      {/* Calculator */}
      <LiquidacionCalculadora />

      {/* History */}
      <CalculationHistory type="LIQUIDACION" />
    </div>
  )
}
