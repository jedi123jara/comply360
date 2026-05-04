/**
 * Demo público del motor IPERC SUNAFIL R.M. 050-2013-TR.
 *
 * SEO + lead magnet: cualquiera puede entrar sin registro y calcular el nivel
 * de riesgo de una tarea con la matriz P×S oficial. Es la misma función pura
 * que usa el dashboard interno (`@/lib/sst/iperc-matrix`), sin LLM, sin DB.
 *
 * Por qué exponerla pública:
 *   - El motor IPERC es nuestro killer feature. Mostrarlo gratis genera trust.
 *   - Lead magnet: capturamos email para nurturing sectorial.
 *   - SEO: keywords "matriz IPERC", "calculadora IPERC SUNAFIL", "R.M. 050-2013-TR"
 *     no tienen una herramienta interactiva en el mercado peruano. Posicionamos.
 */

'use client'

import { useMemo, useState } from 'react'
import { ShieldCheck, AlertTriangle, AlertCircle, AlertOctagon, Info } from 'lucide-react'
import {
  calcularNivelRiesgo,
  NivelRiesgoIPERC,
  type NivelRiesgoIPERC as NivelRiesgo,
} from '@/lib/sst/iperc-matrix'
import {
  CalcCard,
  CalcHero,
  LeadCaptureCTA,
  LegalBasis,
  SignupCTA,
} from '@/components/calc/calc-shell'

interface IndiceOption {
  value: 1 | 2 | 3
  label: string
  description: string
}

const PERSONAS_OPTS: IndiceOption[] = [
  { value: 1, label: '1', description: 'De 1 a 3 personas expuestas' },
  { value: 2, label: '2', description: 'De 4 a 12 personas expuestas' },
  { value: 3, label: '3', description: 'Más de 12 personas expuestas' },
]

const PROCEDIMIENTO_OPTS: IndiceOption[] = [
  { value: 1, label: '1', description: 'Existen procedimientos satisfactorios y se aplican' },
  { value: 2, label: '2', description: 'Existen parcialmente o no se aplican siempre' },
  { value: 3, label: '3', description: 'No existen procedimientos documentados' },
]

const CAPACITACION_OPTS: IndiceOption[] = [
  { value: 1, label: '1', description: 'Personal entrenado, conoce el peligro y lo previene' },
  { value: 2, label: '2', description: 'Personal parcialmente entrenado' },
  { value: 3, label: '3', description: 'Personal no entrenado, no toma acciones de control' },
]

const EXPOSICION_OPTS: IndiceOption[] = [
  { value: 1, label: '1', description: 'Esporádica (al menos 1 vez al año)' },
  { value: 2, label: '2', description: 'Eventual (varias veces al mes)' },
  { value: 3, label: '3', description: 'Permanente (varias veces al día)' },
]

const SEVERIDAD_OPTS: IndiceOption[] = [
  {
    value: 1,
    label: '1',
    description: 'Ligeramente dañino — lesión leve sin baja, molestias e irritación',
  },
  {
    value: 2,
    label: '2',
    description: 'Dañino — lesión con incapacidad temporal, daño a la salud reversible',
  },
  {
    value: 3,
    label: '3',
    description: 'Extremadamente dañino — lesión grave/fatal, enfermedad crónica',
  },
]

const NIVEL_STYLES: Record<NivelRiesgo, {
  badge: string
  card: string
  icon: typeof Info
  iconColor: string
  label: string
}> = {
  TRIVIAL: {
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    card: 'from-emerald-500 to-emerald-600',
    icon: ShieldCheck,
    iconColor: 'text-emerald-100',
    label: 'Trivial',
  },
  TOLERABLE: {
    badge: 'bg-blue-50 text-blue-700 ring-blue-200',
    card: 'from-blue-500 to-blue-600',
    icon: Info,
    iconColor: 'text-blue-100',
    label: 'Tolerable',
  },
  MODERADO: {
    badge: 'bg-amber-50 text-amber-800 ring-amber-200',
    card: 'from-amber-500 to-amber-600',
    icon: AlertTriangle,
    iconColor: 'text-amber-100',
    label: 'Moderado',
  },
  IMPORTANTE: {
    badge: 'bg-orange-50 text-orange-800 ring-orange-200',
    card: 'from-orange-500 to-orange-600',
    icon: AlertCircle,
    iconColor: 'text-orange-100',
    label: 'Importante',
  },
  INTOLERABLE: {
    badge: 'bg-red-50 text-red-800 ring-red-200',
    card: 'from-red-500 to-red-600',
    icon: AlertOctagon,
    iconColor: 'text-red-100',
    label: 'Intolerable',
  },
}

function IndiceSelector({
  id,
  title,
  letter,
  options,
  value,
  onChange,
}: {
  id: string
  title: string
  letter: string
  options: IndiceOption[]
  value: 1 | 2 | 3
  onChange: (v: 1 | 2 | 3) => void
}) {
  const selected = options.find((o) => o.value === value)
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800">
          <span className="inline-block w-7 h-7 mr-2 rounded-md bg-slate-900 text-white text-xs font-bold leading-7 text-center">
            {letter}
          </span>
          {title}
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2" role="radiogroup" aria-labelledby={id}>
        {options.map((opt) => {
          const isActive = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(opt.value)}
              className={`rounded-xl py-3 text-base font-bold ring-1 transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white ring-emerald-700 shadow-md'
                  : 'bg-white text-slate-700 ring-slate-300 hover:ring-emerald-400 hover:bg-emerald-50'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-slate-600 min-h-[2.5em]">{selected?.description}</p>
    </div>
  )
}

export default function IpercDemoPage() {
  const [personas, setPersonas] = useState<1 | 2 | 3>(2)
  const [procedimiento, setProcedimiento] = useState<1 | 2 | 3>(2)
  const [capacitacion, setCapacitacion] = useState<1 | 2 | 3>(2)
  const [exposicion, setExposicion] = useState<1 | 2 | 3>(2)
  const [severidad, setSeveridad] = useState<1 | 2 | 3>(2)

  const result = useMemo(() => {
    try {
      return calcularNivelRiesgo({
        indicePersonas: personas,
        indiceProcedimiento: procedimiento,
        indiceCapacitacion: capacitacion,
        indiceExposicion: exposicion,
        indiceSeveridad: severidad,
      })
    } catch {
      return null
    }
  }, [personas, procedimiento, capacitacion, exposicion, severidad])

  const styles = result ? NIVEL_STYLES[result.clasificacion] : NIVEL_STYLES.MODERADO
  const Icon = styles.icon

  return (
    <>
      <CalcHero
        eyebrow="Motor IPERC — SUNAFIL R.M. 050-2013-TR"
        title="Calcula el nivel de riesgo de una tarea"
        description="Matriz oficial Probabilidad × Severidad. La misma función pura que usa COMPLY360 internamente — sin IA, sin estimaciones, defendible en juicio."
        icon={<ShieldCheck className="w-6 h-6" />}
      />

      <CalcCard className="mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Probabilidad (IP = A + B + C + D)
          </h2>
          <p className="text-sm text-slate-600">
            Cuatro factores que determinan qué tan probable es el accidente. Cada uno va de 1 a 3.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <IndiceSelector
            id="personas"
            letter="A"
            title="Personas expuestas"
            options={PERSONAS_OPTS}
            value={personas}
            onChange={setPersonas}
          />
          <IndiceSelector
            id="procedimiento"
            letter="B"
            title="Procedimientos existentes"
            options={PROCEDIMIENTO_OPTS}
            value={procedimiento}
            onChange={setProcedimiento}
          />
          <IndiceSelector
            id="capacitacion"
            letter="C"
            title="Capacitación del personal"
            options={CAPACITACION_OPTS}
            value={capacitacion}
            onChange={setCapacitacion}
          />
          <IndiceSelector
            id="exposicion"
            letter="D"
            title="Exposición al riesgo"
            options={EXPOSICION_OPTS}
            value={exposicion}
            onChange={setExposicion}
          />
        </div>

        <div className="my-6 border-t border-slate-200" />

        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Severidad (S)</h2>
          <p className="text-sm text-slate-600">Qué tan grave es la consecuencia si el accidente ocurre.</p>
        </div>

        <IndiceSelector
          id="severidad"
          letter="S"
          title="Severidad de la consecuencia"
          options={SEVERIDAD_OPTS}
          value={severidad}
          onChange={setSeveridad}
        />
      </CalcCard>

      {result && (
        <>
          <div
            className={`rounded-2xl bg-gradient-to-br ${styles.card} p-6 sm:p-8 text-white ring-1 ring-white/20`}
          >
            <div className="flex items-start gap-4">
              <Icon className={`w-10 h-10 shrink-0 ${styles.iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium opacity-90 mb-1">Nivel de Riesgo</div>
                <div className="text-3xl sm:text-4xl font-bold tracking-tight">
                  {styles.label}{' '}
                  <span className="text-2xl sm:text-3xl opacity-80 font-mono">
                    NR = {result.nivelRiesgo}
                  </span>
                </div>
                <div className="mt-2 text-sm opacity-90">
                  IP = {result.indiceProbabilidad} (A+B+C+D) ×{' '}
                  IS = {result.indiceSeveridad} = NR {result.nivelRiesgo}
                </div>
                {result.esSignificativo && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 ring-1 ring-white/30 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Riesgo significativo — requiere acción documentada (Ley 29783 Art. 21)
                  </div>
                )}
              </div>
            </div>
          </div>

          <CalcCard className="mt-6">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              Acción recomendada (Tabla 11 R.M. 050-2013-TR)
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">{result.accionRecomendada}</p>
            {result.slaPlanAccionDias !== null && (
              <div className="mt-4 rounded-lg bg-slate-50 ring-1 ring-slate-200 px-4 py-3 text-sm text-slate-700">
                <span className="font-semibold">Plazo sugerido COMPLY360:</span>{' '}
                {result.slaPlanAccionDias === 0
                  ? 'Inmediato (alerta crítica)'
                  : `${result.slaPlanAccionDias} días para implementar el plan de control`}
              </div>
            )}
          </CalcCard>

          <LeadCaptureCTA
            source="iperc-public-demo"
            resultSummary={{
              clasificacion: result.clasificacion,
              nivelRiesgo: result.nivelRiesgo,
              indiceProbabilidad: result.indiceProbabilidad,
              indiceSeveridad: result.indiceSeveridad,
              esSignificativo: result.esSignificativo,
              indices: { personas, procedimiento, capacitacion, exposicion, severidad },
            }}
            title="¿Te enviamos el resultado + plantilla IPERC editable?"
            subtitle="Plantilla Excel con 80 peligros base ya validados + 14 días gratis del módulo SST completo."
          />
        </>
      )}

      <SignupCTA
        title="Esto es 1 fila. La matriz IPERC enterprise tiene cientos."
        subtitle="En COMPLY360 el motor IPERC se conecta a tus sedes y puestos: la matriz se genera, se versiona, se firma y se sella criptográficamente. Probarlo gratis 14 días."
      />

      <LegalBasis
        citations={[
          'R.M. 050-2013-TR — Manual IPERC SUNAFIL (Tablas 9, 11 y 12)',
          'Ley 29783 — Ley de Seguridad y Salud en el Trabajo',
          'D.S. 005-2012-TR — Reglamento de la Ley 29783',
        ]}
      />
    </>
  )
}
