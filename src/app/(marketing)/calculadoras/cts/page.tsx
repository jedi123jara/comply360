'use client'

import { useEffect, useMemo, useState } from 'react'
import { Wallet } from 'lucide-react'
import { calcularCTS } from '@/lib/legal-engine/calculators/cts'
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

// Aproximamos al próximo corte semestral (15 may / 15 nov).
const DEFAULT_CTS_CUTOFF = '2026-05-15'

function nextCtsCutoff(today = new Date()): string {
  const y = today.getFullYear()
  const may15 = new Date(y, 4, 15)
  const nov15 = new Date(y, 10, 15)
  if (today <= may15) return may15.toISOString().slice(0, 10)
  if (today <= nov15) return nov15.toISOString().slice(0, 10)
  return new Date(y + 1, 4, 15).toISOString().slice(0, 10)
}

export default function CTSCalculatorPage() {
  const [sueldo, setSueldo] = useState(2000)
  const [ultimaGrati, setUltimaGrati] = useState(2000)
  const [fechaIngreso, setFechaIngreso] = useState('2024-01-01')
  const [fechaCorte, setFechaCorte] = useState(DEFAULT_CTS_CUTOFF)
  const [asigFam, setAsigFam] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const cutoff = nextCtsCutoff()
    const timer = window.setTimeout(() => {
      setFechaCorte((current) => (
        current === DEFAULT_CTS_CUTOFF ? cutoff : current
      ))
      setMounted(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const result = useMemo(() => {
    try {
      return calcularCTS({
        sueldoBruto: sueldo,
        ultimaGratificacion: ultimaGrati,
        fechaIngreso,
        fechaCorte,
        asignacionFamiliar: asigFam,
      })
    } catch {
      return null
    }
  }, [sueldo, ultimaGrati, fechaIngreso, fechaCorte, asigFam])

  return (
    <>
      <CalcHero
        eyebrow="Calculadora laboral — Perú 2026"
        title="Calcula tu CTS gratis, sin registro"
        description="Compensación por Tiempo de Servicios — actualizado con D.S. 001-97-TR. Ingresa los datos y obtienes el monto del depósito al instante."
        icon={<Wallet className="w-6 h-6" />}
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
              <NumberInput
                id="ultimaGrati"
                label="Última gratificación"
                value={ultimaGrati}
                onChange={setUltimaGrati}
                prefix="S/"
                min={0}
                step={50}
                hint="La más reciente (julio o diciembre). Se divide /6."
              />
              <DateInput
                id="fechaIngreso"
                label="Fecha de ingreso"
                value={fechaIngreso}
                onChange={setFechaIngreso}
              />
              <DateInput
                id="fechaCorte"
                label="Fecha de corte"
                value={fechaCorte}
                onChange={setFechaCorte}
                hint="15 de mayo o 15 de noviembre."
              />
              <div className="sm:col-span-2 pt-2">
                <Toggle
                  id="asigFam"
                  label="Tiene asignación familiar"
                  checked={asigFam}
                  onChange={setAsigFam}
                  hint="10% de la RMV (S/ 113 para 2026) si el trabajador tiene hijos menores."
                />
              </div>
            </div>

            <LegalBasis
              citations={[
                'D.S. 001-97-TR — Texto Único Ordenado de la Ley de CTS',
                'Remuneración computable: sueldo + asig. familiar + 1/6 última gratificación',
                'Fórmula: (Rem. computable / 12) × meses + (Rem. computable / 360) × días',
              ]}
            />
          </CalcCard>

          <div className="lg:col-span-2 space-y-4">
            {mounted && result ? (
              <>
                <BigNumberResult label="CTS a depositar" amount={result.ctsTotal} accent="brand" />

                <CalcCard>
                  <h3 className={`${pub.h3} mb-1 text-sm`}>Desglose</h3>
                  <div className={pub.divide}>
                    <BreakdownRow
                      label="Remuneración computable"
                      amount={result.remuneracionComputable}
                      note="Sueldo + asig. familiar + 1/6 gratificación"
                    />
                    <div className="flex items-center justify-between py-2 text-sm text-[#475569]">
                      <div className="font-medium">Tiempo computado</div>
                      <div className="text-right">
                        <div className="font-bold text-[#0B1B36]">
                          {result.mesesComputables} meses, {result.diasComputables} días
                        </div>
                      </div>
                    </div>
                    <BreakdownRow label="CTS total del semestre" amount={result.ctsTotal} />
                  </div>
                </CalcCard>

                <div className={pub.note}>
                  <strong className="mb-1 block text-[#0B1B36]">Recuerda:</strong>
                  El depósito debe hacerse <strong>antes del 15 de mayo</strong> (semestre
                  noviembre–abril) y <strong>antes del 15 de noviembre</strong> (semestre mayo–octubre).
                  Depósitos tardíos generan intereses legales.
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
          source="calc-cts"
          resultSummary={mounted && result ? { ctsDeposito: result.ctsTotal, sueldo, fechaCorte } : undefined}
          title="¿Quieres que revisemos la CTS de tu planilla?"
          subtitle="Déjanos tu correo y te escribimos para coordinar un diagnóstico gratis de 30 minutos. Sin compromiso."
        />
        <SignupCTA />
      </CalcBody>
    </>
  )
}
