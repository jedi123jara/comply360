'use client'

import { useMemo, useState } from 'react'
import { ShieldAlert, AlertTriangle } from 'lucide-react'
import {
  calcularMultaSunafil,
  type RegimenMype,
} from '@/lib/legal-engine/calculators/multa-sunafil'
import {
  BigNumberResult,
  BreakdownRow,
  CalcCard,
  CalcHero,
  LegalBasis,
  NumberInput,
  SignupCTA,
  Toggle,
} from '@/components/calc/calc-shell'

export default function MultaSunafilPage() {
  const [tipoInfraccion, setTipoInfraccion] = useState<'LEVE' | 'GRAVE' | 'MUY_GRAVE'>('GRAVE')
  const [numeroTrabajadores, setNumeroTrabajadores] = useState(15)
  const [reincidente, setReincidente] = useState(false)
  const [subsanacionVoluntaria, setSubsanacionVoluntaria] = useState(true)
  const [regimen, setRegimen] = useState<RegimenMype>('GENERAL')

  const result = useMemo(() => {
    try {
      return calcularMultaSunafil({
        tipoInfraccion,
        numeroTrabajadores,
        reincidente,
        subsanacionVoluntaria,
        regimenMype: regimen,
      })
    } catch {
      return null
    }
  }, [tipoInfraccion, numeroTrabajadores, reincidente, subsanacionVoluntaria, regimen])

  return (
    <>
      <CalcHero
        eyebrow="Calculadora SUNAFIL — Perú 2026"
        title="¿Cuánto te costaría una multa SUNAFIL?"
        description="Calcula el monto estimado de una multa laboral según D.S. 019-2006-TR, con el descuento por subsanación voluntaria (90%). UIT 2026 = S/ 5,500."
        icon={<ShieldAlert className="w-6 h-6" />}
      />

      <div className="grid lg:grid-cols-5 gap-6">
        <CalcCard className="lg:col-span-3">
          <h2 className="text-base font-semibold text-slate-900 mb-6">Datos de la infracción</h2>

          <div className="space-y-5">
            {/* Tipo infracción */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tipo de infracción
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['LEVE', 'GRAVE', 'MUY_GRAVE'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipoInfraccion(t)}
                    className={`rounded-lg py-2.5 text-sm font-medium ring-1 transition-colors ${
                      tipoInfraccion === t
                        ? t === 'MUY_GRAVE'
                          ? 'bg-red-50 text-red-800 ring-red-300'
                          : t === 'GRAVE'
                            ? 'bg-amber-50 text-amber-800 ring-amber-300'
                            : 'bg-blue-50 text-blue-800 ring-blue-300'
                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Régimen */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Régimen</label>
              <select
                value={regimen}
                onChange={(e) => setRegimen(e.target.value as RegimenMype)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="GENERAL">Régimen General / Mediana–Gran Empresa</option>
                <option value="PEQUEÑA_EMPRESA">Pequeña Empresa (Ley 30056)</option>
                <option value="MICROEMPRESA">Microempresa (D.Leg. 1086)</option>
              </select>
            </div>

            <NumberInput
              id="trab"
              label="Número de trabajadores afectados"
              value={numeroTrabajadores}
              onChange={setNumeroTrabajadores}
              min={1}
              step={1}
              hint="La escala de la multa sube con más trabajadores afectados."
            />

            <Toggle
              id="reincidente"
              label="¿Reincidente?"
              checked={reincidente}
              onChange={setReincidente}
              hint="Si la empresa ya fue multada antes por la misma infracción, la multa sube +50%."
            />

            <Toggle
              id="subsanacion"
              label="Subsanación voluntaria antes de la inspección (90% descuento)"
              checked={subsanacionVoluntaria}
              onChange={setSubsanacionVoluntaria}
              hint="Art. 40 de la Ley 28806 — la mayor reducción posible."
            />
          </div>

          <LegalBasis
            citations={[
              'D.S. 019-2006-TR — Cuadro de infracciones laborales',
              'Ley 28806 — Ley General de Inspección del Trabajo',
              'UIT 2026 = S/ 5,500 (según D.S. vigente)',
            ]}
          />
        </CalcCard>

        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              <BigNumberResult
                label={
                  result.multaConDescuento !== null ? 'Multa con descuento' : 'Multa estimada'
                }
                amount={result.multaConDescuento ?? result.multaEstimada}
                accent={result.multaConDescuento !== null ? 'emerald' : 'red'}
              />

              <CalcCard>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Rango de multa</h3>
                <div className="divide-y divide-slate-100">
                  <BreakdownRow
                    label="Mínimo"
                    amount={result.multaMinima}
                    note={`${result.enUITs.min.toFixed(2)} UIT`}
                  />
                  <BreakdownRow
                    label="Estimado"
                    amount={result.multaEstimada}
                    note={`${result.enUITs.estimada.toFixed(2)} UIT`}
                  />
                  <BreakdownRow
                    label="Máximo"
                    amount={result.multaMaxima}
                    note={`${result.enUITs.max.toFixed(2)} UIT`}
                  />
                  {result.multaConDescuento !== null && (
                    <>
                      <div className="my-2 border-t border-dashed border-emerald-200" />
                      <BreakdownRow
                        label={
                          result.descuentoTipo === 'voluntaria_90'
                            ? 'Con subsanación voluntaria (–90%)'
                            : 'Con subsanación durante inspección (–70%)'
                        }
                        amount={result.multaConDescuento}
                      />
                    </>
                  )}
                </div>
              </CalcCard>

              {result.recomendaciones.length > 0 && (
                <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-4 text-xs text-amber-900">
                  <div className="font-semibold mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Recomendaciones
                  </div>
                  <ul className="space-y-1 list-disc list-inside">
                    {result.recomendaciones.slice(0, 4).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <CalcCard>
              <p className="text-sm text-slate-500">Ingresá los datos para ver la multa.</p>
            </CalcCard>
          )}
        </div>
      </div>

      <SignupCTA
        title="Evitá esta multa con COMPLY360"
        subtitle="Nuestro diagnóstico SUNAFIL de 135 preguntas detecta estas infracciones antes de que te inspeccionen, y te da un plan de acción priorizado. La subsanación voluntaria es 90% más barata que una multa."
      />
    </>
  )
}
