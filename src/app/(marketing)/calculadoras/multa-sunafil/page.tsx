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
  CalcBody,
  CalcCard,
  CalcHero,
  LeadCaptureCTA,
  LegalBasis,
  NumberInput,
  SignupCTA,
  Toggle,
} from '@/components/marketing/public-calc-ui'
import { pub } from '@/components/marketing/public-theme'

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
        description="Calcula el monto estimado de una multa laboral según D.S. 019-2006-TR, con el descuento por subsanación voluntaria (90%). UIT 2026 = 5,500 nuevos soles."
        icon={<ShieldAlert className="w-6 h-6" />}
      />

      <CalcBody>
        <div className="grid lg:grid-cols-5 gap-6">
          <CalcCard className="lg:col-span-3">
            <h2 className={`${pub.h3} mb-6 text-lg`}>Datos de la infracción</h2>

            <div className="space-y-5">
              {/* Tipo infracción */}
              <div>
                <span id="tipo-infraccion-label" className={pub.label}>
                  Tipo de infracción
                </span>
                <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="tipo-infraccion-label">
                  {(['LEVE', 'GRAVE', 'MUY_GRAVE'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipoInfraccion(t)}
                      aria-pressed={tipoInfraccion === t}
                      className={`rounded-lg px-1 py-2.5 text-sm font-semibold transition-colors ${
                        tipoInfraccion === t
                          ? t === 'MUY_GRAVE'
                            ? 'bg-[#FEF2F2] text-[#991B1B] ring-2 ring-[#B91C1C]'
                            : t === 'GRAVE'
                              ? 'bg-[#FFFBEB] text-[#92400E] ring-2 ring-[#B45309]'
                              : 'bg-[#EFF4FF] text-[#1D4ED8] ring-2 ring-[#2563EB]'
                          : 'bg-[#ffffff] text-[#475569] ring-1 ring-[#E5EAF2] hover:bg-[#F5F7FB] hover:text-[#0B1B36]'
                      }`}
                    >
                      {t.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Régimen */}
              <div>
                <label htmlFor="regimen" className={pub.label}>Régimen</label>
                <select
                  id="regimen"
                  value={regimen}
                  onChange={(e) => setRegimen(e.target.value as RegimenMype)}
                  aria-label="Régimen laboral"
                  className={`${pub.input} px-3`}
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
                'UIT 2026 = 5,500 nuevos soles (según D.S. vigente)',
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
                  accent={result.multaConDescuento !== null ? 'brand' : 'red'}
                />

                <CalcCard>
                  <h3 className={`${pub.h3} mb-2 text-sm`}>Rango de multa</h3>
                  <div className={pub.divide}>
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
                        <div className="my-2 border-t border-dashed border-[#2563EB]/35" />
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
                  <div className={pub.notice}>
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
                <p className="text-sm text-[#475569]">Ingresa los datos para ver la multa.</p>
              </CalcCard>
            )}
          </div>
        </div>

        <LeadCaptureCTA
          source="calc-multa-sunafil"
          title="¿Quieres evitar esta multa?"
          subtitle="Déjanos tu correo y coordinamos un diagnóstico gratis de 30 minutos para ver qué conviene subsanar primero."
        />
        <SignupCTA
          title="Evita esta multa con Comply360"
          subtitle="Te decimos qué te falta, lo implementamos y te dejamos la evidencia lista para el inspector. Ponerte al día antes de una inspección cuesta mucho menos que una multa."
        />
      </CalcBody>
    </>
  )
}
