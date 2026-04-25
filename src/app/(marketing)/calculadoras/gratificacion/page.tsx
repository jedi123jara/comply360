'use client'

import { useMemo, useState } from 'react'
import { Gift } from 'lucide-react'
import { calcularGratificacion } from '@/lib/legal-engine/calculators/gratificacion'
import {
  BigNumberResult,
  BreakdownRow,
  CalcCard,
  CalcHero,
  DateInput,
  LegalBasis,
  NumberInput,
  SignupCTA,
  Toggle,
} from '@/components/calc/calc-shell'

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

      <div className="grid lg:grid-cols-5 gap-6">
        <CalcCard className="lg:col-span-3">
          <h2 className="text-base font-semibold text-slate-900 mb-6">Datos del trabajador</h2>
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Periodo</label>
              <div className="flex rounded-lg bg-slate-100 p-1">
                {(['julio', 'diciembre'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodo(p)}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      periodo === p
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
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
              <BigNumberResult label="Total a pagar" amount={result.totalNeto} accent="emerald" />

              <CalcCard>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Desglose</h3>
                <div className="divide-y divide-slate-100">
                  <BreakdownRow label="Gratificación bruta" amount={result.gratificacionBruta} />
                  <BreakdownRow
                    label="Bonificación extraordinaria (9%)"
                    amount={result.bonificacionExtraordinaria}
                    note="Ley 29351 — sustituye aporte EsSalud"
                  />
                  <BreakdownRow label="Total neto" amount={result.totalNeto} />
                </div>
              </CalcCard>

              <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4 text-xs text-slate-600">
                <strong className="text-slate-800 block mb-1">Plazo de pago:</strong>
                Gratificación de julio: <strong>antes del 15 de julio</strong>. De diciembre:{' '}
                <strong>antes del 15 de diciembre</strong>. La bonificación 9% se paga junto con la
                gratificación.
              </div>
            </>
          ) : (
            <CalcCard>
              <p className="text-sm text-slate-500">
                Completa los datos de la izquierda para ver el cálculo.
              </p>
            </CalcCard>
          )}
        </div>
      </div>

      <SignupCTA />
    </>
  )
}
