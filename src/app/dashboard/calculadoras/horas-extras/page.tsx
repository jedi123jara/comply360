import { HorasExtrasCalculadora } from '@/components/calculadoras/horas-extras-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'

export default function HorasExtrasPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 text-gray-400 mb-2">
          <span>Calculadoras</span>
          <span>/</span>
          <span className="text-primary font-medium">Horas Extras</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Calculadora de Horas Extras
        </h1>
        <p className="text-gray-500 text-gray-400 mt-1">
          Calcula el pago de sobretiempo con sobretasas del 25%, 35% y 100% (domingos/feriados)
          según el D.S. 007-2002-TR.
        </p>
      </div>
      <HorasExtrasCalculadora />

      {/* History */}
      <CalculationHistory type="HORAS_EXTRAS" />
    </div>
  )
}
