import { UtilidadesCalculadora } from '@/components/calculadoras/utilidades-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'

export default function UtilidadesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <span>Calculadoras</span>
          <span>/</span>
          <span className="text-primary font-medium">Utilidades</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Calculadora de Participacion en Utilidades
        </h1>
        <p className="text-gray-400 mt-1">
          Calcula la distribucion de utilidades entre trabajadores segun D.Leg. 892.
          Incluye calculo por dias trabajados y remuneraciones, con tope de 18 sueldos mensuales.
        </p>
      </div>

      {/* Calculator */}
      <UtilidadesCalculadora />

      {/* History */}
      <CalculationHistory type="UTILIDADES" />
    </div>
  )
}
