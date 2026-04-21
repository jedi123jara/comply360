import { GratificacionCalculadora } from '@/components/calculadoras/gratificacion-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'

export default function GratificacionPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <span>Calculadoras</span>
          <span>/</span>
          <span className="text-primary font-medium">Gratificaciones</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Calculadora de Gratificaciones
        </h1>
        <p className="text-gray-400 mt-1">
          Calcula gratificaciones de julio y diciembre con bonificación extraordinaria del 9%.
          Incluye gratificaciones truncas.
        </p>
      </div>
      <GratificacionCalculadora />

      {/* History */}
      <CalculationHistory type="GRATIFICACION" />
    </div>
  )
}
