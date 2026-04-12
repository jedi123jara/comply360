import { MultaSunafilCalculadora } from '@/components/calculadoras/multa-sunafil-form'
import { CalculationHistory } from '@/components/calculadoras/calculation-history'

export default function MultaSunafilPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 text-gray-400 mb-2">
          <span>Calculadoras</span>
          <span>/</span>
          <span className="text-primary font-medium">Multas SUNAFIL</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Estimador de Multas SUNAFIL
        </h1>
        <p className="text-gray-500 text-gray-400 mt-1">
          Estima el rango de multas por infracciones laborales según el tipo de infracción,
          tamaño de empresa y circunstancias atenuantes (D.S. 019-2006-TR).
        </p>
      </div>
      <MultaSunafilCalculadora />

      {/* History */}
      <CalculationHistory type="MULTA_SUNAFIL" />
    </div>
  )
}
