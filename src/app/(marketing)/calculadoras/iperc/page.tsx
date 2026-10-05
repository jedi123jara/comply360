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
  type NivelRiesgoIPERC as NivelRiesgo,
} from '@/lib/sst/iperc-matrix'
import {
  CalcBody,
  CalcCard,
  CalcHero,
  LeadCaptureCTA,
  LegalBasis,
  SignupCTA,
} from '@/components/marketing/public-calc-ui'
import { pub } from '@/components/marketing/public-theme'

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
    badge: 'bg-[#F0FDF4] text-[#166534] ring-[#166534]/25',
    card: 'bg-[#166534]',
    icon: ShieldCheck,
    iconColor: 'text-[#BBF7D0]',
    label: 'Trivial',
  },
  TOLERABLE: {
    badge: 'bg-[#EFF4FF] text-[#1D4ED8] ring-[#2563EB]/25',
    card: 'bg-[#1D4ED8]',
    icon: Info,
    iconColor: 'text-[#DBEAFE]',
    label: 'Tolerable',
  },
  MODERADO: {
    badge: 'bg-[#FFFBEB] text-[#92400E] ring-[#B45309]/25',
    card: 'bg-[#92400E]',
    icon: AlertTriangle,
    iconColor: 'text-[#FDE68A]',
    label: 'Moderado',
  },
  IMPORTANTE: {
    badge: 'bg-[#FFF7ED] text-[#9A3412] ring-[#9A3412]/25',
    card: 'bg-[#9A3412]',
    icon: AlertCircle,
    iconColor: 'text-[#FED7AA]',
    label: 'Importante',
  },
  INTOLERABLE: {
    badge: 'bg-[#FEF2F2] text-[#991B1B] ring-[#991B1B]/25',
    card: 'bg-[#991B1B]',
    icon: AlertOctagon,
    iconColor: 'text-[#FECACA]',
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
        <label id={id} className="text-sm font-bold text-[#0B1B36]">
          <span className="mr-2 inline-block h-7 w-7 rounded-md bg-[#0B1B36] text-center text-xs font-bold leading-7 text-[#ffffff]">
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
                  ? 'bg-[#2563EB] text-[#ffffff] ring-[#1D4ED8] shadow-md'
                  : 'bg-[#ffffff] text-[#0B1B36] ring-[#7B8AA0] hover:bg-[#EFF4FF] hover:ring-[#2563EB]'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      <p className="min-h-[2.5em] text-xs text-[#475569]">{selected?.description}</p>
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

      <CalcBody>
        <CalcCard className="mb-6">
          <div className="mb-6">
            <h2 className={`${pub.h3} mb-1 text-lg`}>
              Probabilidad (IP = A + B + C + D)
            </h2>
            <p className={pub.body}>
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

          <div className="my-6 border-t border-[#E5EAF2]" />

          <div className="mb-4">
            <h2 className={`${pub.h3} mb-1 text-lg`}>Severidad (S)</h2>
            <p className={pub.body}>Qué tan grave es la consecuencia si el accidente ocurre.</p>
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
              className={`rounded-2xl ${styles.card} p-6 text-[#ffffff] shadow-[0_20px_50px_rgba(11,27,54,0.2)] sm:p-8`}
            >
              <div className="flex items-start gap-4">
                <Icon className={`w-10 h-10 shrink-0 ${styles.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="mb-1 text-sm font-semibold text-[#ffffff]/90">Nivel de Riesgo</div>
                  <div className="text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl">
                    {styles.label}{' '}
                    <span className="font-mono text-2xl text-[#ffffff]/80 sm:text-3xl">
                      NR = {result.nivelRiesgo}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-[#ffffff]/90">
                    IP = {result.indiceProbabilidad} (A+B+C+D) ×{' '}
                    IS = {result.indiceSeveridad} = NR {result.nivelRiesgo}
                  </div>
                  {result.esSignificativo && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#ffffff]/15 px-3 py-1 text-xs font-semibold text-[#ffffff] ring-1 ring-[#ffffff]/35">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Riesgo significativo — requiere acción documentada (Ley 29783 Art. 21)
                    </div>
                  )}
                </div>
              </div>
            </div>

            <CalcCard className="mt-6">
              <h3 className={`${pub.h3} mb-3`}>
                Acción recomendada (Tabla 11 R.M. 050-2013-TR)
              </h3>
              <p className="text-sm leading-relaxed text-[#475569]">{result.accionRecomendada}</p>
              {result.slaPlanAccionDias !== null && (
                <div className={`${pub.inset} mt-4 px-4 py-3 text-sm text-[#475569]`}>
                  <span className="font-semibold text-[#0B1B36]">Plazo sugerido COMPLY360:</span>{' '}
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
      </CalcBody>
    </>
  )
}
