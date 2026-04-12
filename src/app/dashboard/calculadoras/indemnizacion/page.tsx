import { IndemnizacionCalculadora } from '@/components/calculadoras/indemnizacion-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'

export default function IndemnizacionPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 text-gray-400 mb-2">
          <span>Calculadoras</span>
          <span>/</span>
          <span className="text-primary font-medium">Indemnización</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Calculadora de Indemnización por Despido
        </h1>
        <p className="text-gray-500 text-gray-400 mt-1">
          Calcula la indemnización por despido arbitrario para contratos a plazo indeterminado
          y plazo fijo, con topes legales según el D.S. 003-97-TR.
        </p>
      </div>
      <IndemnizacionCalculadora />

      {/* History */}
      <CalculationHistory type="INDEMNIZACION" />
    </div>
  )
}
