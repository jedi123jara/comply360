import { VacacionesCalculadora } from '@/components/calculadoras/vacaciones-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'

export default function VacacionesPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <span>Calculadoras</span>
          <span>/</span>
          <span className="text-primary font-medium">Vacaciones</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Calculadora de Vacaciones
        </h1>
        <p className="text-gray-400 mt-1">
          Calcula vacaciones truncas, no gozadas e indemnización vacacional
          según el D.Leg. 713 y D.S. 012-92-TR.
        </p>
      </div>
      <VacacionesCalculadora />

      {/* History */}
      <CalculationHistory type="VACACIONES" />
    </div>
  )
}
