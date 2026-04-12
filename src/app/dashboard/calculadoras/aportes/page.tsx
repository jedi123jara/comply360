import { AportesCalculadora } from '@/components/calculadoras/aportes-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'

export default function AportesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 text-gray-400 mb-2">
          <span>Calculadoras</span>
          <span>/</span>
          <span className="text-primary font-medium">Aportes Previsionales</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Calculadora de Aportes Previsionales
        </h1>
        <p className="text-gray-500 text-gray-400 mt-1">
          Calcula las contribuciones a AFP/ONP, EsSalud y SCTR. Incluye comparacion entre
          sistemas previsionales y desglose de costos empleador vs trabajador.
        </p>
      </div>

      {/* Calculator */}
      <AportesCalculadora />

      {/* History */}
      <CalculationHistory type="APORTES_PREVISIONALES" />
    </div>
  )
}
