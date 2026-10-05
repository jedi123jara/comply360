'use client'

import { useMemo, useState } from 'react'
import { Gift } from 'lucide-react'
import { calcularGratificacion } from '@/lib/legal-engine/calculators/gratificacion'
import {
  BigNumberResult,
  BreakdownRow,
  CalcBody,
  CalcCard,
  CalcHero,
  DateInput,
  LeadCaptureCTA,
  LegalBasis,
  NumberInput,
  SignupCTA,
  Toggle,
} from '@/components/marketing/public-calc-ui'
import { pub } from '@/components/marketing/public-theme'

export default function GratificacionCalculatorPage() {
  const [sueldo, setSueldo] = useState(2000)
  const [fechaIngreso, setFechaIngreso] = useState('2024-01-01')
  const [periodo, setPeriodo] = useState<'julio' | 'diciembre'>('julio')
  const [mesesTrabajados, setMesesTrabajados] = useState(6)
  const [asigFam, setAsigFam] = useState(false)

  const result = useMemo(() => {
    try {
      return calcularGratificacion({
        sueldoBruto: sueldo,
        fechaIngreso,
        periodo,
        mesesTrabajados: Math.min(6, Math.max(0, mesesTrabajados)),
        asignacionFamiliar: asigFam,
      })
    } catch {
      return null
    }
  }, [sueldo, fechaIngreso, periodo, mesesTrabajados, asigFam])

  return (
    <>
      <CalcHero
        eyebrow="Calculadora laboral — Perú 2026"
        title="Calcula tu gratificación — julio o diciembre"
        description="Gratificación legal (Ley 27735) + bonificación extraordinaria 9% por no retener EsSalud. Cálculo instantáneo, sin registro."
        icon={<Gift className="w-6 h-6" />}
      />

      <CalcBody>
        <div className="grid lg:grid-cols-5 gap-6">
          <CalcCard className="lg:col-span-3">
            <h2 className={`${pub.h3} mb-6 text-lg`}>Datos del trabajador</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <NumberInput
                id="sueldo"
                label="Sueldo bruto mensual"
                value={sueldo}
                onChange={setSueldo}
                prefix="S/"
                min={0}
                step={50}
              />
              <div>
                <span id="periodo-label" className={pub.label}>Periodo</span>
                <div className="flex rounded-lg border border-[#E5EAF2] bg-[#F5F7FB] p-1" role="group" aria-labelledby="periodo-label">
                  {(['julio', 'diciembre'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriodo(p)}
                      aria-pressed={periodo === p}
                      className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                        periodo === p
                          ? 'bg-[#0B1B36] text-[#ffffff] shadow-sm'
                          : 'text-[#475569] hover:bg-[#ffffff] hover:text-[#0B1B36]'
                      }`}
                    >
                      {p === 'julio' ? 'Julio (28 jul)' : 'Diciembre (25 dic)'}
                    </button>
                  ))}
                </div>
              </div>
              <DateInput
                id="fechaIngreso"
                label="Fecha de ingreso"
                value={fechaIngreso}
                onChange={setFechaIngreso}
              />
              <NumberInput
                id="meses"
                label="Meses trabajados en el semestre"
                value={mesesTrabajados}
                onChange={setMesesTrabajados}
                min={0}
                step={1}
                hint="Entre 0 y 6."
              />
              <div className="sm:col-span-2 pt-2">
                <Toggle
                  id="asigFam"
                  label="Tiene asignación familiar"
                  checked={asigFam}
                  onChange={setAsigFam}
                />
              </div>
            </div>

            <LegalBasis
              citations={[
                'Ley 27735 — Gratificaciones por Fiestas Patrias y Navidad',
                'Ley 29351 (permanente) — 9% bonificación extraordinaria',
                'Fórmula: (sueldo + asig. fam.) × meses/6 + 9% bonificación extraordinaria',
              ]}
            />
          </CalcCard>

          <div className="lg:col-span-2 space-y-4">
            {result ? (
              <>
                <BigNumberResult label="Total a pagar" amount={result.totalNeto} accent="brand" />

                <CalcCard>
                  <h3 className={`${pub.h3} mb-1 text-sm`}>Desglose</h3>
                  <div className={pub.divide}>
                    <BreakdownRow label="Gratificación bruta" amount={result.gratificacionBruta} />
                    <BreakdownRow
                      label="Bonificación extraordinaria (9%)"
                      amount={result.bonificacionExtraordinaria}
                      note="Ley 29351 — sustituye aporte EsSalud"
                    />
                    <BreakdownRow label="Total neto" amount={result.totalNeto} />
                  </div>
                </CalcCard>

                <div className={pub.note}>
                  <strong className="mb-1 block text-[#0B1B36]">Plazo de pago:</strong>
                  Gratificación de julio: <strong>antes del 15 de julio</strong>. De diciembre:{' '}
                  <strong>antes del 15 de diciembre</strong>. La bonificación 9% se paga junto con la
                  gratificación.
                </div>
              </>
            ) : (
              <CalcCard>
                <p className="text-sm text-[#475569]">
                  Completa los datos de la izquierda para ver el cálculo.
                </p>
              </CalcCard>
            )}
          </div>
        </div>

        <LeadCaptureCTA
          source="calc-grati"
          title="¿Te enviamos el cálculo en PDF?"
          subtitle="Te llega el resumen con la fórmula desglosada + 14 días gratis del simulacro SUNAFIL completo. Sin tarjeta."
        />
        <SignupCTA />
      </CalcBody>
    </>
  )
}
