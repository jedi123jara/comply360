'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Scale,
  Bell,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Check,
  X,
  ShieldCheck,
  ChevronDown,
  Lightbulb,
  MapIcon,
  CalendarDays,
  Repeat,
  ClipboardCheck,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Term, TermHint } from '@/components/ui/term'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
import { solesCortos } from '@/lib/glossary'
import {
  buildObligationMap,
  etiquetaRango,
  etiquetaRegimen,
  obligacionesPrincipales,
  rangoDeTrabajadores,
  sugerirRegimen,
  type ObligacionMapa,
  type ObligationMap,
  type RegimenOnboarding,
} from '@/lib/onboarding/obligation-map'

/**
 * Asistente de registro de la empresa (4 pasos) + "Tu mapa de obligaciones".
 *
 *  1. Tu empresa: RUC con autocompletado SUNAT, sector y número exacto de
 *     trabajadores en planilla (el rango se deriva y se guarda en `sizeRange`).
 *  2. Régimen laboral: sugerencia explicada (REMYPE, ventas, qué cambia). No se
 *     cambia en silencio: el usuario confirma o elige otro.
 *  3. Alertas: correo del responsable.
 *  4. Confirmación.
 *
 * Al terminar, en vez de un "Todo listo" pasajero, muestra el mapa de
 * obligaciones (src/lib/onboarding/obligation-map.ts): lo principal que le
 * toca cumplir, con su próxima fecha y la multa de referencia.
 *
 * Persistencia vía POST /api/onboarding (incluye `totalWorkersDeclared`).
 */

const SECTORS = [
  { value: 'COMERCIO', label: 'Comercio' },
  { value: 'SERVICIOS', label: 'Servicios' },
  { value: 'MANUFACTURA', label: 'Manufactura' },
  { value: 'CONSTRUCCION', label: 'Construcción' },
  { value: 'MINERIA', label: 'Minería' },
  { value: 'AGROINDUSTRIA', label: 'Agroindustria' },
  { value: 'PESCA', label: 'Pesca' },
  { value: 'TEXTIL', label: 'Textil y confecciones' },
  { value: 'TECNOLOGIA', label: 'Tecnología' },
  { value: 'EDUCACION', label: 'Educación' },
  { value: 'SALUD', label: 'Salud' },
  { value: 'TRANSPORTE', label: 'Transporte y logística' },
  { value: 'HOTELERIA', label: 'Hotelería y turismo' },
  { value: 'OTRO', label: 'Otro' },
] as const

const MYPE = PERU_LABOR.MYPE
const VACACIONES_GENERAL = PERU_LABOR.VACACIONES.DIAS_POR_ANO
const pct = (tasa: number) => `${Math.round(tasa * 10000) / 100} %`
const uitTexto = (n: number) => n.toLocaleString('en-US')

interface RegimenOption {
  value: RegimenOnboarding
  label: string
  /** Id del glosario para el ícono "?" junto al nombre. */
  glosarioId?: string
  description: React.ReactNode
  hint: React.ReactNode
}

const REGIMENES: readonly RegimenOption[] = [
  {
    value: 'GENERAL',
    label: 'Régimen general',
    glosarioId: 'regimen-general',
    description: (
      <>
        <Term id="cts">CTS</Term> completa, dos <Term id="gratificacion">gratificaciones</Term> al año y{' '}
        {VACACIONES_GENERAL} días de vacaciones.
      </>
    ),
    hint: 'D.Leg. 728 · Para la mayoría de empresas',
  },
  {
    value: 'MYPE_MICRO',
    label: 'MYPE · Microempresa',
    glosarioId: 'regimen-mype',
    description: (
      <>
        Sin <Term id="cts">CTS</Term> ni <Term id="gratificacion">gratificaciones</Term>, y {MYPE.MICRO.VACACIONES_DIAS}{' '}
        días de vacaciones.
      </>
    ),
    hint: (
      <>
        Requiere inscripción en el <Term id="remype">REMYPE</Term> · hasta {MYPE.MICRO.TRABAJADORES_MAX} trabajadores y
        ventas de hasta {uitTexto(MYPE.MICRO.VENTAS_MAX_UIT_ANUALES)} UIT al año
      </>
    ),
  },
  {
    value: 'MYPE_PEQUENA',
    label: 'MYPE · Pequeña empresa',
    glosarioId: 'regimen-mype',
    description: (
      <>
        <Term id="cts">CTS</Term> y <Term id="gratificacion">gratificaciones</Term> al{' '}
        {pct(MYPE.PEQUENA.CTS_PORCENTAJE)}, y {MYPE.PEQUENA.VACACIONES_DIAS} días de vacaciones.
      </>
    ),
    hint: (
      <>
        Requiere inscripción en el <Term id="remype">REMYPE</Term> · hasta {MYPE.PEQUENA.TRABAJADORES_MAX} trabajadores
        y ventas de hasta {uitTexto(MYPE.PEQUENA.VENTAS_MAX_UIT_ANUALES)} UIT al año
      </>
    ),
  },
  {
    value: 'AGRARIO',
    label: 'Régimen agrario',
    glosarioId: 'regimen-agrario',
    description: (
      <>
        La <Term id="cts">CTS</Term> y las <Term id="gratificacion">gratificaciones</Term> pueden ir incluidas en la
        remuneración diaria.
      </>
    ),
    hint: 'Ley 31110 · Actividades agrarias, agroexportadoras y agroindustriales',
  },
  {
    value: 'CONSTRUCCION_CIVIL',
    label: 'Construcción civil',
    glosarioId: 'construccion-civil',
    description: 'Jornal diario y beneficios propios, fijados en el convenio del sector.',
    hint: 'Para obreros de obras de construcción',
  },
  {
    value: 'OTRO',
    label: 'Otro régimen',
    description: 'Minero, pesquero, textil de exportación, trabajo del hogar, CAS, entre otros.',
    hint: 'Elígelo si tu régimen no está en la lista',
  },
]

const REGIMEN_LABEL: Record<string, string> = Object.fromEntries(REGIMENES.map((r) => [r.value, r.label]))

interface FormData {
  razonSocial: string
  ruc: string
  sector: string
  /** Número exacto de trabajadores en planilla (texto del input). */
  trabajadores: string
  regimenPrincipal: string
  alertEmail: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

const INITIAL_FORM: FormData = {
  razonSocial: '',
  ruc: '',
  sector: '',
  trabajadores: '',
  regimenPrincipal: 'GENERAL',
  alertEmail: '',
}

const STEPS = [
  {
    title: 'Tu empresa',
    description: 'RUC, sector y trabajadores',
    why: 'tu sector y tu número de trabajadores definen qué obligaciones te tocan. Por ejemplo, el tamaño decide si necesitas un supervisor o un comité de seguridad.',
    icon: Building2,
  },
  {
    title: 'Régimen laboral',
    description: 'Define tus beneficios y tus obligaciones',
    why: 'el régimen define qué beneficios pagas (CTS, gratificaciones, vacaciones) y el tamaño de las multas.',
    icon: Scale,
  },
  {
    title: 'Alertas',
    description: '¿A dónde enviamos los recordatorios?',
    why: 'para avisarte antes de cada vencimiento y que nada te tome por sorpresa.',
    icon: Bell,
  },
  {
    title: 'Confirmación',
    description: 'Revisa y arma tu mapa',
    why: 'con estos datos armamos tu mapa de obligaciones.',
    icon: ShieldCheck,
  },
] as const

const MAX_TRABAJADORES = 100_000

/** Número entero ≥ 1, o null si el texto no lo es. */
function parseTrabajadores(value: string): number | null {
  const v = value.trim()
  if (!/^\d{1,6}$/.test(v)) return null
  const n = Number(v)
  return n >= 1 && n <= MAX_TRABAJADORES ? n : null
}

function isValidRuc(ruc: string) {
  if (!/^\d{11}$/.test(ruc)) return false
  if (!['10', '15', '17', '20', '30'].includes(ruc.slice(0, 2))) return false

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((acc, weight, index) => acc + Number(ruc[index]) * weight, 0)
  const remainder = sum % 11
  const checkDigit = remainder < 2 ? remainder : 11 - remainder
  return checkDigit === Number(ruc[10])
}

/** Ruta interna de `?next=` (solo rutas propias, nunca otro dominio). */
function safeNextPath(): string | null {
  if (typeof window === 'undefined') return null
  const next = new URLSearchParams(window.location.search).get('next')
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null
  return next
}

export function OnboardingWizard() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [obligationMap, setObligationMap] = useState<ObligationMap | null>(null)
  const [navigating, setNavigating] = useState(false)

  const [rucLookupStatus, setRucLookupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [rucLookupMessage, setRucLookupMessage] = useState('')
  const rucLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLookedUpRuc = useRef('')

  const lookupRuc = useCallback(async (ruc: string) => {
    if (lastLookedUpRuc.current === ruc) return
    lastLookedUpRuc.current = ruc

    setRucLookupStatus('loading')
    setRucLookupMessage('')

    try {
      const res = await fetch(`/api/integrations/sunat?ruc=${encodeURIComponent(ruc)}`)
      const json = await res.json()

      if (!res.ok || json.error) {
        setRucLookupStatus('error')
        setRucLookupMessage(json.error || 'No encontramos ese RUC en SUNAT.')
        return
      }

      const data = json.data
      if (data?.razonSocial) {
        const actEcon = (data.actividadEconomica || '').toLowerCase()
        let detectedSector = ''
        if (actEcon.includes('comerci')) detectedSector = 'COMERCIO'
        else if (actEcon.includes('servici') || actEcon.includes('consult') || actEcon.includes('asesori')) detectedSector = 'SERVICIOS'
        else if (actEcon.includes('manufactur') || actEcon.includes('fabric')) detectedSector = 'MANUFACTURA'
        else if (actEcon.includes('construc')) detectedSector = 'CONSTRUCCION'
        else if (actEcon.includes('miner')) detectedSector = 'MINERIA'
        else if (actEcon.includes('agro') || actEcon.includes('agric')) detectedSector = 'AGROINDUSTRIA'
        else if (actEcon.includes('pesc')) detectedSector = 'PESCA'
        else if (actEcon.includes('textil') || actEcon.includes('confeccion')) detectedSector = 'TEXTIL'
        else if (actEcon.includes('tecnolog') || actEcon.includes('software') || actEcon.includes('inform')) detectedSector = 'TECNOLOGIA'
        else if (actEcon.includes('educa') || actEcon.includes('ensen')) detectedSector = 'EDUCACION'
        else if (actEcon.includes('salud') || actEcon.includes('medic') || actEcon.includes('clinic')) detectedSector = 'SALUD'
        else if (actEcon.includes('transport') || actEcon.includes('logist')) detectedSector = 'TRANSPORTE'
        else if (actEcon.includes('hotel') || actEcon.includes('turis') || actEcon.includes('restaur')) detectedSector = 'HOTELERIA'

        setForm(prev => ({
          ...prev,
          razonSocial: data.razonSocial,
          ...(detectedSector ? { sector: detectedSector } : {}),
        }))
        setErrors(prev => ({ ...prev, razonSocial: undefined, sector: undefined }))
        setRucLookupStatus('success')
        setRucLookupMessage(`${data.razonSocial}${data.estado ? ` · ${data.estado}` : ''}${data.condicion ? ` (${data.condicion})` : ''}`)
      } else {
        setRucLookupStatus('error')
        setRucLookupMessage('No encontramos ese RUC en SUNAT.')
      }
    } catch {
      setRucLookupStatus('error')
      setRucLookupMessage('No pudimos consultar SUNAT. Revisa el número o pega tu Ficha RUC.')
    }
  }, [])

  useEffect(() => {
    const ruc = form.ruc.trim()

    if (rucLookupTimer.current) {
      clearTimeout(rucLookupTimer.current)
      rucLookupTimer.current = null
    }

    if (ruc.length !== 11) {
      const reset = window.setTimeout(() => {
        if (rucLookupStatus !== 'idle') {
          setRucLookupStatus('idle')
          setRucLookupMessage('')
        }
        lastLookedUpRuc.current = ''
      }, 0)
      return () => window.clearTimeout(reset)
    }

    if (!isValidRuc(ruc)) {
      const reset = window.setTimeout(() => {
        setRucLookupStatus('idle')
        setRucLookupMessage('')
      }, 0)
      return () => window.clearTimeout(reset)
    }

    if (lastLookedUpRuc.current === ruc) return

    rucLookupTimer.current = setTimeout(() => {
      lookupRuc(ruc)
    }, 500)

    return () => {
      if (rucLookupTimer.current) {
        clearTimeout(rucLookupTimer.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ruc, lookupRuc])

  useEffect(() => {
    fetch('/api/onboarding')
      .then(res => res.json())
      .then(d => {
        if (!d.onboardingCompleted) {
          setShow(true)
        }
        if (d.org) {
          const storedRuc = d.org.ruc || ''
          if (storedRuc) {
            lastLookedUpRuc.current = storedRuc
          }
          setForm(prev => ({
            ...prev,
            razonSocial: d.org.razonSocial || d.org.name || '',
            ruc: storedRuc,
            sector: d.org.sector || '',
            trabajadores:
              typeof d.org.totalWorkersDeclared === 'number' && d.org.totalWorkersDeclared > 0
                ? String(d.org.totalWorkersDeclared)
                : '',
            regimenPrincipal: d.org.regimenPrincipal || 'GENERAL',
            alertEmail: d.org.alertEmail || '',
          }))
        }
      })
      .catch(() => setShow(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !show) return null

  const trabajadoresNum = parseTrabajadores(form.trabajadores)

  const updateField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const nextStep = () => {
    const newErrors: FormErrors = {}
    if (step === 0) {
      if (!form.razonSocial.trim()) newErrors.razonSocial = 'Escribe la razón social de tu empresa.'
      if (!form.ruc.trim()) newErrors.ruc = 'Escribe el RUC de tu empresa.'
      else if (!/^\d{11}$/.test(form.ruc.trim())) newErrors.ruc = 'El RUC debe tener 11 dígitos.'
      if (!form.sector) newErrors.sector = 'Elige el sector de tu empresa.'
      if (!form.trabajadores.trim()) newErrors.trabajadores = 'Indica cuántos trabajadores tienes en planilla.'
      else if (trabajadoresNum === null) newErrors.trabajadores = 'Escribe un número entero mayor que cero.'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    setStep(s => Math.min(s + 1, 3))
  }

  const prevStep = () => setStep(s => Math.max(s - 1, 0))

  const handleSubmit = async () => {
    if (trabajadoresNum === null) {
      setErrors({ trabajadores: 'Indica cuántos trabajadores tienes en planilla.' })
      setStep(0)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razonSocial: form.razonSocial.trim(),
          ruc: form.ruc.trim(),
          sector: form.sector,
          sizeRange: rangoDeTrabajadores(trabajadoresNum),
          totalWorkersDeclared: trabajadoresNum,
          regimenPrincipal: form.regimenPrincipal,
          alertEmail: form.alertEmail.trim() || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err.error || 'No pudimos guardar tus datos. Inténtalo de nuevo.'
        // Si el RUC choca con otra org, mostrar el error en el campo RUC
        if (res.status === 409 && /ruc/i.test(msg)) {
          setErrors({ ruc: msg })
        } else {
          setErrors({ razonSocial: msg })
        }
        setStep(0)
        return
      }

      setObligationMap(
        buildObligationMap({
          trabajadores: trabajadoresNum,
          regimen: form.regimenPrincipal,
          sector: form.sector,
          hoy: new Date(),
        }),
      )

      // Auto-activar trial PRO 14 días sin tarjeta (best-effort, no bloquea si falla).
      // Si ya usó trial antes (409), seguirá con STARTER: no es crítico.
      fetch('/api/trial/start', { method: 'POST' })
        .then(() => logger.debug('[onboarding] trial PRO auto-activated'))
        .catch(() => logger.debug('[onboarding] trial activation skipped'))
    } catch (err) {
      console.error('Onboarding submit error:', err)
      setErrors({ razonSocial: 'No pudimos guardar tus datos. Inténtalo de nuevo.' })
      setStep(0)
    } finally {
      setSubmitting(false)
    }
  }

  const goToPanel = () => {
    setNavigating(true)
    router.push(safeNextPath() ?? '/dashboard?welcome=trial')
    router.refresh()
  }

  const goToDiagnostic = () => {
    setNavigating(true)
    router.push('/dashboard/diagnostico?modo=express')
  }

  // ── Pantalla final: el mapa de obligaciones ───────────────────────────
  if (obligationMap) {
    return (
      <ObligationMapReveal
        map={obligationMap}
        razonSocial={form.razonSocial.trim()}
        navigating={navigating}
        onGoToPanel={goToPanel}
        onGoToDiagnostic={goToDiagnostic}
      />
    )
  }

  const errorLabels: Array<[keyof FormData, string]> = [
    ['razonSocial', 'Razón social'],
    ['ruc', 'RUC'],
    ['sector', 'Sector'],
    ['trabajadores', 'Trabajadores en planilla'],
  ]
  const visibleErrors = errorLabels.filter(([k]) => errors[k])
  const currentStep = STEPS[step]

  return (
    <div className="min-h-[calc(100vh-var(--topbar-height))] flex items-start justify-center py-6">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <header className="text-center space-y-2 motion-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">
              Configuración inicial
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[color:var(--text-primary)]">
            Te damos la bienvenida a COMPLY360
          </h1>
          <p className="text-sm md:text-base text-[color:var(--text-secondary)] max-w-xl mx-auto">
            En 4 pasos armamos tu mapa de obligaciones: qué te toca cumplir, cuándo
            y cuánto podría costarte no hacerlo.
          </p>
        </header>

        {/* Stepper */}
        <Stepper step={step} />

        {/* Content card */}
        <Card
          padding="xl"
          variant="elevated"
          accentBar="emerald"
          className="motion-fade-in-up overflow-hidden"
        >
          <div className="space-y-1 mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--text-tertiary)]">
              Paso {step + 1} de {STEPS.length}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-[color:var(--text-primary)]">
              {currentStep.title}
            </h2>
            <p className="text-sm text-[color:var(--text-secondary)]">
              {currentStep.description}
            </p>
            <p className="mt-2 flex items-start gap-2 rounded-lg bg-[color:var(--neutral-50)] border border-[color:var(--border-subtle)] px-3 py-2 text-xs leading-relaxed text-[color:var(--text-secondary)]">
              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
              <span>
                <strong className="font-semibold text-[color:var(--text-primary)]">Por qué te lo pedimos:</strong>{' '}
                {currentStep.why}
              </span>
            </p>
          </div>

          {/* PASO 1 — Datos de la empresa */}
          {step === 0 && (
            <div className="space-y-5">
              <Field
                label="Razón social"
                htmlFor="razon-social"
                required
                error={errors.razonSocial}
                hint="Así aparecerá tu empresa en tus reportes y documentos."
              >
                <input
                  type="text"
                  id="razon-social"
                  name="razonSocial"
                  value={form.razonSocial}
                  onChange={e => updateField('razonSocial', e.target.value)}
                  placeholder="Ej.: Inversiones ABC S.A.C."
                  className={cn('w-full text-sm', inputCls(!!errors.razonSocial))}
                />
              </Field>

              <Field
                label="RUC"
                htmlFor="ruc"
                required
                error={errors.ruc}
                hint={
                  rucLookupStatus === 'loading'
                    ? 'Consultando SUNAT…'
                    : rucLookupStatus === 'success'
                      ? `Validado: ${rucLookupMessage}`
                      : rucLookupStatus === 'error'
                        ? rucLookupMessage
                        : 'Con tu RUC traemos tus datos de SUNAT automáticamente.'
                }
                hintTone={
                  rucLookupStatus === 'success' ? 'success' : rucLookupStatus === 'error' ? 'error' : 'muted'
                }
              >
                <div className="relative">
                  <input
                    type="text"
                    id="ruc"
                    name="ruc"
                    inputMode="numeric"
                    value={form.ruc}
                    onChange={e => updateField('ruc', e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="20XXXXXXXXX"
                    maxLength={11}
                    className={cn(
                      'w-full pr-10 text-sm font-mono',
                      inputCls(!!errors.ruc, rucLookupStatus === 'success' ? 'success' : rucLookupStatus === 'error' ? 'error' : null)
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {rucLookupStatus === 'loading' && (
                      <Loader2 className="w-4 h-4 text-[color:var(--text-tertiary)] animate-spin" />
                    )}
                    {rucLookupStatus === 'success' && (
                      <Check className="w-4 h-4 text-emerald-600" />
                    )}
                    {rucLookupStatus === 'error' && (
                      <X className="w-4 h-4 text-crimson-600" />
                    )}
                  </div>
                </div>

                {(rucLookupStatus === 'error' || rucLookupStatus === 'idle') && (
                  <FichaRucUpload
                    onDataExtracted={(data) => {
                      setForm(prev => ({
                        ...prev,
                        razonSocial: data.razonSocial || prev.razonSocial,
                        ruc: data.ruc || prev.ruc,
                        sector: data.sector || prev.sector,
                      }))
                      setErrors(prev => ({ ...prev, razonSocial: undefined, ruc: undefined, sector: undefined }))
                      setRucLookupStatus('success')
                      setRucLookupMessage(data.razonSocial || 'Datos cargados desde tu Ficha RUC')
                    }}
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field
                  label="Sector"
                  htmlFor="sector"
                  required
                  error={errors.sector}
                  hint={
                    <>
                      Algunas actividades tienen reglas propias, como el <Term id="sctr">SCTR</Term> en construcción o
                      minería.
                    </>
                  }
                >
                  <Select
                    value={form.sector}
                    onValueChange={(v) => updateField('sector', v)}
                  >
                    <SelectTrigger id="sector" error={!!errors.sector}>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label="Trabajadores en planilla"
                  htmlFor="trabajadores"
                  required
                  error={errors.trabajadores}
                  hint={
                    trabajadoresNum !== null
                      ? `Rango: ${etiquetaRango(rangoDeTrabajadores(trabajadoresNum)).toLowerCase()}. Cuenta a todos, aunque aún no los registres aquí.`
                      : 'Cuenta a todos los que están en planilla, aunque aún no los registres aquí.'
                  }
                >
                  <input
                    type="number"
                    id="trabajadores"
                    name="trabajadores"
                    inputMode="numeric"
                    min={1}
                    max={MAX_TRABAJADORES}
                    step={1}
                    value={form.trabajadores}
                    onChange={e => updateField('trabajadores', e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                    placeholder="Ej.: 12"
                    className={cn('w-full text-sm font-mono', inputCls(!!errors.trabajadores))}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* PASO 2 — Régimen laboral */}
          {step === 1 && (
            <RegimenStep
              trabajadores={trabajadoresNum ?? 1}
              sector={form.sector}
              value={form.regimenPrincipal}
              onChange={(v) => updateField('regimenPrincipal', v)}
            />
          )}

          {/* PASO 3 — Alertas */}
          {step === 2 && (
            <div className="space-y-5">
              <Field
                label="Correo del responsable de RR. HH."
                htmlFor="alert-email"
                hint="Opcional. Puedes cambiarlo después en Configuración."
              >
                <input
                  type="email"
                  id="alert-email"
                  name="alertEmail"
                  value={form.alertEmail}
                  onChange={e => updateField('alertEmail', e.target.value)}
                  placeholder="rrhh@tuempresa.com"
                  className={cn('w-full text-sm', inputCls(false))}
                />
              </Field>

              <div className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4">
                <h3 className="text-sm font-semibold text-[color:var(--text-primary)] mb-3">
                  COMPLY360 te avisará antes de:
                </h3>
                <ul className="space-y-2 text-sm">
                  {alertItems(form.regimenPrincipal).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[color:var(--text-secondary)]">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* PASO 4 — Confirmación */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--text-secondary)]">
                Revisa tus datos antes de continuar:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ReviewItem label="Razón social" value={form.razonSocial} />
                <ReviewItem label="RUC" value={form.ruc} mono />
                <ReviewItem
                  label="Sector"
                  value={SECTORS.find(s => s.value === form.sector)?.label || form.sector}
                />
                <ReviewItem
                  label="Trabajadores en planilla"
                  value={
                    trabajadoresNum !== null
                      ? `${trabajadoresNum} (${etiquetaRango(rangoDeTrabajadores(trabajadoresNum)).toLowerCase()})`
                      : '—'
                  }
                />
                <ReviewItem
                  label="Régimen laboral"
                  value={REGIMEN_LABEL[form.regimenPrincipal] || form.regimenPrincipal}
                />
                <ReviewItem
                  label="Correo de alertas"
                  value={form.alertEmail || 'Sin configurar'}
                  muted={!form.alertEmail}
                />
              </div>
              <p className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                <MapIcon className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
                <span>
                  Al confirmar, te mostramos tu mapa de obligaciones: lo que te toca cumplir, cuándo vence y qué
                  está en juego.
                </span>
              </p>
            </div>
          )}
        </Card>

        {/* Error banner */}
        {visibleErrors.length > 0 && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-crimson-200 bg-crimson-50 px-4 py-3 motion-fade-in-up">
            <AlertTriangle className="w-4 h-4 text-crimson-600 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-crimson-700">
                Revisa estos datos
              </p>
              <ul className="mt-1 text-xs text-crimson-700/80 space-y-0.5 list-disc list-inside">
                {visibleErrors.map(([k, label]) => (
                  <li key={k}>{label}: {errors[k]}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="md"
            onClick={prevStep}
            disabled={step === 0}
            icon={<ArrowLeft className="h-4 w-4" />}
            className={cn(step === 0 && 'opacity-0 pointer-events-none')}
          >
            Atrás
          </Button>

          {step < 3 ? (
            <Button onClick={nextStep} iconRight={<ArrowRight className="h-4 w-4" />}>
              Continuar
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              loading={submitting}
              icon={!submitting ? <MapIcon className="h-4 w-4" /> : undefined}
            >
              {submitting ? 'Armando tu mapa…' : 'Ver mi mapa de obligaciones'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Paso 2: régimen con sugerencia explicada ───────────────────────── */

export function RegimenStep({
  trabajadores,
  sector,
  value,
  onChange,
}: {
  trabajadores: number
  sector: string
  value: string
  onChange: (value: RegimenOnboarding) => void
}) {
  const sug = sugerirRegimen({ trabajadores, sector })
  const lv = sug.limitesVentas
  const trabajadoresTexto = trabajadores === 1 ? '1 trabajador' : `${trabajadores} trabajadores`

  // Aviso si el régimen elegido no calza con el tope de trabajadores de PERU_LABOR.
  const topeElegido =
    value === 'MYPE_MICRO'
      ? { tope: MYPE.MICRO.TRABAJADORES_MAX, nombre: 'microempresa' }
      : value === 'MYPE_PEQUENA'
        ? { tope: MYPE.PEQUENA.TRABAJADORES_MAX, nombre: 'pequeña empresa' }
        : null
  const excedeTope = topeElegido !== null && trabajadores > topeElegido.tope

  return (
    <div className="space-y-5">
      {/* Sugerencia */}
      <section
        aria-labelledby="sugerencia-regimen"
        className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5"
      >
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden />
          Nuestra sugerencia
        </p>
        <h3 id="sugerencia-regimen" className="mt-1.5 text-base font-semibold text-[color:var(--text-primary)]">
          {sug.titulo}
        </h3>

        <div className="mt-2 space-y-2 text-sm leading-relaxed text-[color:var(--text-secondary)]">
          {sug.requiereRemype ? (
            <>
              <p>
                Para ser MYPE necesitas estar inscrito en el <Term id="remype">REMYPE</Term> y cumplir los límites de
                ventas; si no lo estás, te corresponde el <Term id="regimen-general">régimen general</Term>.
              </p>
              <p className="text-xs">
                Límites de ventas al año: microempresa hasta {uitTexto(lv.microUit)} UIT ({solesCortos(lv.microSoles)});
                pequeña empresa hasta {uitTexto(lv.pequenaUit)} UIT ({solesCortos(lv.pequenaSoles)}).
              </p>
              <p>
                <strong className="font-semibold text-[color:var(--text-primary)]">Qué cambia:</strong> en la
                microempresa no se pagan <Term id="cts">CTS</Term> ni <Term id="gratificacion">gratificaciones</Term>; en
                la pequeña empresa se pagan al {pct(MYPE.PEQUENA.CTS_PORCENTAJE)}. En ambas, las vacaciones son de{' '}
                {MYPE.MICRO.VACACIONES_DIAS} días en vez de {VACACIONES_GENERAL}.
              </p>
            </>
          ) : (
            <p>
              El <Term id="regimen-mype">régimen MYPE</Term> es para empresas más pequeñas inscritas en el{' '}
              <Term id="remype">REMYPE</Term>. En el <Term id="regimen-general">régimen general</Term> pagas{' '}
              <Term id="cts">CTS</Term> y <Term id="gratificacion">gratificaciones</Term> completas. Si tu empresa
              tiene un régimen especial, elígelo abajo.
            </p>
          )}
          {sug.avisoSector && (
            <p className="flex items-start gap-1.5 text-amber-800">
              <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
              <span>{sug.avisoSector}</span>
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {sug.requiereRemype ? (
            <>
              <SuggestionButton
                selected={value === sug.regimen}
                onClick={() => onChange(sug.regimen)}
                label={
                  sug.regimen === 'MYPE_MICRO'
                    ? 'Estoy en el REMYPE como microempresa'
                    : 'Estoy en el REMYPE como pequeña empresa'
                }
              />
              <SuggestionButton
                selected={value === 'GENERAL'}
                onClick={() => onChange('GENERAL')}
                label="No estoy inscrito: usar régimen general"
              />
            </>
          ) : (
            <SuggestionButton
              selected={value === 'GENERAL'}
              onClick={() => onChange('GENERAL')}
              label="Usar régimen general"
            />
          )}
        </div>
      </section>

      {/* Lista completa para confirmar o elegir otro */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-medium text-[color:var(--text-primary)]">
          Confirma tu régimen o elige otro
        </legend>
        {REGIMENES.map(r => {
          const selected = value === r.value
          const inputId = `regimen-${r.value}`
          return (
            <label
              key={r.value}
              htmlFor={inputId}
              className={cn(
                'flex items-start gap-3 rounded-lg p-4 cursor-pointer transition-all border',
                selected
                  ? 'bg-emerald-50 border-emerald-300 shadow-[0_0_0_4px_rgba(16,185,129,0.08)]'
                  : 'bg-white border-[color:var(--border-default)] hover:border-emerald-200 hover:bg-emerald-50/40'
              )}
            >
              <input
                type="radio"
                id={inputId}
                name="regimen"
                value={r.value}
                checked={selected}
                onChange={() => onChange(r.value)}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
              <div className="min-w-0 flex-1">
                <p className={cn('flex items-center gap-1.5 text-sm font-semibold', selected ? 'text-emerald-700' : 'text-[color:var(--text-primary)]')}>
                  {r.label}
                  {r.glosarioId ? <TermHint id={r.glosarioId} /> : null}
                </p>
                <p className="text-xs text-[color:var(--text-secondary)] mt-0.5 leading-relaxed">
                  {r.description}
                </p>
                <p className="text-[11px] text-[color:var(--text-tertiary)] mt-1 font-medium leading-relaxed">
                  {r.hint}
                </p>
              </div>
            </label>
          )
        })}
      </fieldset>

      {excedeTope && topeElegido && (
        <p role="status" className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" aria-hidden />
          <span>
            Ojo: la {topeElegido.nombre} admite hasta {topeElegido.tope} trabajadores y tú indicaste{' '}
            {trabajadoresTexto}. Revisa tu inscripción en el <Term id="remype">REMYPE</Term> antes de usar este
            régimen.
          </span>
        </p>
      )}
    </div>
  )
}

function SuggestionButton({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={selected ? 'primary' : 'secondary'}
      onClick={onClick}
      aria-pressed={selected}
      icon={selected ? <Check className="h-3.5 w-3.5" /> : undefined}
      className="h-auto min-h-8 whitespace-normal py-1.5 text-left"
    >
      {label}
    </Button>
  )
}

/** Lo que el sistema recordará, según el régimen (sin CTS ni gratificación en la microempresa). */
function alertItems(regimen: string): React.ReactNode[] {
  const cts = PERU_LABOR.CTS
  const grati = PERU_LABOR.GRATIFICACION.PERIODOS
  const items: React.ReactNode[] = []
  if (regimen !== 'MYPE_MICRO') {
    items.push(
      <>
        El depósito de la <Term id="cts">CTS</Term> ({cts.DEPOSITO_MAYO.dia} de mayo y {cts.DEPOSITO_NOVIEMBRE.dia} de
        noviembre)
      </>,
      <>
        El pago de las <Term id="gratificacion">gratificaciones</Term> ({grati.JULIO.pago_dia} de julio y{' '}
        {grati.DICIEMBRE.pago_dia} de diciembre)
      </>,
    )
  }
  items.push(
    <>
      La declaración mensual de la <Term id="plame">PLAME</Term>
    </>,
    'El vencimiento de contratos a plazo fijo',
    'Documentos, exámenes médicos y seguros por vencer',
    'Cambios en las normas que afectan a tu empresa',
  )
  return items
}

/* ── Pantalla final: "Tu mapa de obligaciones" ──────────────────────── */

const MES_CORTO = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const

const FRECUENCIA_TEXTO: Record<ObligacionMapa['frecuencia'], string> = {
  permanente: 'Desde ya, todo el año',
  mensual: 'Cada mes',
  anual: 'Cada año',
  semestral: 'Dos veces al año',
}

const PRIORIDAD_CHIP: Record<ObligacionMapa['prioridad'], { label: string; cls: string }> = {
  alta: { label: 'Prioridad alta', cls: 'bg-crimson-50 text-crimson-700 border-crimson-200' },
  media: { label: 'Prioridad media', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  baja: { label: 'Prioridad baja', cls: 'bg-[color:var(--neutral-50)] text-[color:var(--text-secondary)] border-[color:var(--border-default)]' },
}

function cuandoTexto(o: ObligacionMapa): string {
  const f = o.proximaFecha
  if (f?.exacta) {
    const rel = f.diasFaltan === 0 ? 'hoy' : f.diasFaltan === 1 ? 'mañana' : `en ${f.diasFaltan} días`
    return `${f.etiqueta} · ${rel}`
  }
  if (f) return f.nota ? `${f.etiqueta} · ${f.nota}` : f.etiqueta
  if (o.exigencia === 'segun-tu-caso') return 'Revisa si te aplica'
  return FRECUENCIA_TEXTO[o.frecuencia]
}

export function ObligationMapReveal({
  map,
  razonSocial,
  navigating,
  onGoToPanel,
  onGoToDiagnostic,
}: {
  map: ObligationMap
  razonSocial: string
  navigating: boolean
  onGoToPanel: () => void
  onGoToDiagnostic: () => void
}) {
  const principales = obligacionesPrincipales(map, 6)
  const resto = map.obligaciones.slice(principales.length)
  const [verResto, setVerResto] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Al aparecer, el foco pasa al título para que los lectores de pantalla lo anuncien.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const regimenGlosario =
    map.regimen === 'GENERAL'
      ? 'regimen-general'
      : map.regimen === 'MYPE_MICRO' || map.regimen === 'MYPE_PEQUENA'
        ? 'regimen-mype'
        : map.regimen === 'AGRARIO'
          ? 'regimen-agrario'
          : map.regimen === 'CONSTRUCCION_CIVIL'
            ? 'construccion-civil'
            : null
  const regimenTexto = etiquetaRegimen(map.regimen)
  const trabajadoresTexto = map.trabajadores === 1 ? '1 trabajador' : `${map.trabajadores} trabajadores`

  return (
    <div className="min-h-[calc(100vh-var(--topbar-height))] flex items-start justify-center py-6">
      <div className="w-full max-w-3xl space-y-6">
        {/* Encabezado de recompensa */}
        <header className="text-center space-y-3 motion-fade-in-up">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 motion-scale-in">
            <MapIcon className="h-7 w-7 text-emerald-600" aria-hidden />
          </div>
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Registro completo
            </p>
          </div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-3xl md:text-4xl font-bold tracking-tight text-[color:var(--text-primary)] focus:outline-none"
          >
            Tu mapa de obligaciones
          </h1>
          <p className="text-sm md:text-base text-[color:var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
            Esto es lo que te toca cumplir{razonSocial ? <> como <strong className="font-semibold text-[color:var(--text-primary)]">{razonSocial}</strong></> : null},
            con {trabajadoresTexto} en el{' '}
            {regimenGlosario ? <Term id={regimenGlosario}>{regimenTexto}</Term> : regimenTexto}.
          </p>
        </header>

        {/* Lo principal */}
        <Card padding="lg" variant="elevated" accentBar="emerald" className="motion-fade-in-up">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-[color:var(--text-primary)]">
              Empieza por estas {principales.length}
            </h2>
            <p className="text-xs text-[color:var(--text-tertiary)]">
              Encontramos {map.obligaciones.length} obligaciones · ordenadas por prioridad y fecha
            </p>
          </div>

          <ol className="motion-stagger mt-4 space-y-3">
            {principales.map((o) => (
              <ObligationItem key={o.id} o={o} />
            ))}
          </ol>

          {resto.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setVerResto(v => !v)}
                aria-expanded={verResto}
                aria-controls="obligaciones-resto"
                className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-emerald-700 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform', verResto && 'rotate-180')} aria-hidden />
                {verResto ? 'Ocultar las demás' : `Ver las otras ${resto.length}`}
              </button>
              {verResto && (
                <ul id="obligaciones-resto" className="mt-3 divide-y divide-[color:var(--border-subtle)] rounded-lg border border-[color:var(--border-subtle)]">
                  {resto.map((o) => (
                    <li key={o.id} className="flex flex-col gap-0.5 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[color:var(--text-primary)]">
                          {o.glosarioId ? <Term id={o.glosarioId}>{o.titulo}</Term> : o.titulo}
                        </p>
                        <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">{o.comoTeAplica}</p>
                      </div>
                      <p className="shrink-0 text-xs text-[color:var(--text-tertiary)] sm:text-right">{cuandoTexto(o)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {map.noAplican.length > 0 && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)] px-3 py-2.5 text-sm text-[color:var(--text-secondary)]">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-[color:var(--text-tertiary)]" aria-hidden />
              <span>
                Por tu régimen no te tocan:{' '}
                {map.noAplican.map((n, i) => (
                  <span key={n.id}>
                    {i > 0 ? (i === map.noAplican.length - 1 ? ' ni ' : ', ') : null}
                    {n.glosarioId ? <Term id={n.glosarioId}>{n.titulo}</Term> : n.titulo}
                  </span>
                ))}
                . {map.noAplican[0].motivo.includes('REMYPE') ? 'Esto vale mientras tu inscripción en el REMYPE esté vigente.' : null}
              </span>
            </p>
          )}
        </Card>

        {/* Lo que está en juego */}
        <Card padding="lg" variant="amber" className="motion-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-600">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                Lo que está en juego
              </p>
              <p className="text-lg font-bold leading-snug text-[color:var(--text-primary)]">
                {map.multaMaxima.texto}
              </p>
              <p className="text-sm leading-relaxed text-[color:var(--text-secondary)]">
                {map.multaMaxima.nota}{' '}
                <Term id="multa-sunafil">¿Cómo se calcula una multa?</Term>
              </p>
            </div>
          </div>
        </Card>

        {/* Acciones */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            size="lg"
            onClick={onGoToDiagnostic}
            disabled={navigating}
            icon={<ClipboardCheck className="h-4 w-4" />}
          >
            Hacer el diagnóstico express
          </Button>
          <Button
            size="lg"
            onClick={onGoToPanel}
            loading={navigating}
            iconRight={!navigating ? <ArrowRight className="h-4 w-4" /> : undefined}
          >
            Ir a mi panel
          </Button>
        </div>
        <p className="text-center text-xs leading-relaxed text-[color:var(--text-tertiary)]">
          Es una guía general armada con los datos que nos diste. No reemplaza la asesoría de un abogado.
        </p>
      </div>
    </div>
  )
}

function ObligationItem({ o }: { o: ObligacionMapa }) {
  const chip = PRIORIDAD_CHIP[o.prioridad]
  return (
    <li className="flex gap-3 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] p-3.5">
      <DateBadge o={o} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
            {o.glosarioId ? <Term id={o.glosarioId}>{o.titulo}</Term> : o.titulo}
          </h3>
          <span className={cn('rounded-full border px-2 py-0.5 text-[10.5px] font-semibold', chip.cls)}>
            {chip.label}
          </span>
          {o.exigencia === 'segun-tu-caso' && (
            <span className="rounded-full border border-[color:var(--border-default)] px-2 py-0.5 text-[10.5px] font-medium text-[color:var(--text-secondary)]">
              Según tu caso
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-[color:var(--text-secondary)]">{o.queEs}</p>
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-tertiary)]">{o.comoTeAplica}</p>
        <p className="mt-1.5 text-xs font-medium text-emerald-700">{cuandoTexto(o)}</p>
      </div>
    </li>
  )
}

function DateBadge({ o }: { o: ObligacionMapa }) {
  const f = o.proximaFecha
  const base = 'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border'
  if (f) {
    const [, m, d] = f.fecha.split('-').map(Number)
    return (
      <div className={cn(base, 'border-emerald-200 bg-emerald-50 text-emerald-700')} aria-hidden>
        <span className="text-[10px] font-semibold tracking-wider">{MES_CORTO[m - 1]}</span>
        {f.exacta ? (
          <span className="text-lg font-bold leading-none">{d}</span>
        ) : (
          <Repeat className="mt-0.5 h-4 w-4" />
        )}
      </div>
    )
  }
  const Icon = o.frecuencia === 'mensual' ? Repeat : o.frecuencia === 'anual' ? CalendarDays : ShieldCheck
  return (
    <div className={cn(base, 'border-[color:var(--border-default)] bg-[color:var(--neutral-50)] text-[color:var(--text-secondary)]')} aria-hidden>
      <Icon className="h-5 w-5" />
    </div>
  )
}

/* ── Stepper ───────────────────────────────────────────────────────── */

function Stepper({ step }: { step: number }) {
  return (
    <nav aria-label="Progreso" className="motion-fade-in-up">
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isDone = i < step
          const isActive = i === step
          return (
            <li key={i} className="flex items-center gap-2 flex-1 min-w-0" aria-current={isActive ? 'step' : undefined}>
              <div
                className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold transition-all shrink-0 border',
                  isDone
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : isActive
                      ? 'bg-white border-emerald-500 text-emerald-700 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
                      : 'bg-white border-[color:var(--border-default)] text-[color:var(--text-tertiary)]'
                )}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:inline truncate',
                  isActive
                    ? 'text-[color:var(--text-primary)]'
                    : isDone
                      ? 'text-emerald-700'
                      : 'text-[color:var(--text-tertiary)]'
                )}
              >
                {s.title}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 rounded-full transition-colors',
                    isDone ? 'bg-emerald-600' : 'bg-[color:var(--neutral-200)]'
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/* ── Field + input utilities ───────────────────────────────────────── */

function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  hintTone = 'muted',
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: React.ReactNode
  hintTone?: 'muted' | 'success' | 'error'
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[color:var(--text-primary)] mb-1.5">
        {label}
        {required ? <span className="text-crimson-600 ml-0.5" aria-hidden>*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-crimson-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p
          className={cn(
            'mt-1 text-xs leading-relaxed',
            hintTone === 'success'
              ? 'text-emerald-700'
              : hintTone === 'error'
                ? 'text-crimson-700'
                : 'text-[color:var(--text-tertiary)]'
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function inputCls(hasError: boolean, state: 'success' | 'error' | null = null): string {
  return cn(
    'rounded-lg px-3 py-2.5 bg-white border text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)]',
    'transition-all focus:outline-none',
    hasError || state === 'error'
      ? 'border-crimson-300 focus:border-crimson-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.12)]'
      : state === 'success'
        ? 'border-emerald-300 focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
        : 'border-[color:var(--border-default)] focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.10)]'
  )
}

function ReviewItem({ label, value, mono, muted }: { label: string; value: React.ReactNode; mono?: boolean; muted?: boolean }) {
  return (
    <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)] px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--text-tertiary)]">
        {label}
      </p>
      <p
        className={cn(
          'text-sm mt-0.5 truncate',
          muted ? 'text-[color:var(--text-tertiary)] italic' : 'text-[color:var(--text-primary)] font-medium',
          mono && 'font-mono'
        )}
      >
        {value}
      </p>
    </div>
  )
}

/* ── Ficha RUC (carga manual de respaldo) ──────────────────────────── */

function FichaRucUpload({ onDataExtracted }: {
  onDataExtracted: (data: { ruc?: string; razonSocial?: string; sector?: string; direccion?: string; representante?: string }) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState('')

  const handleParse = () => {
    if (!text.trim()) return
    const t = text
    const rucMatch = t.match(/(?:RUC|N[uú]mero de RUC)[:\s]*(\d{11})/i)
    const razonMatch = t.match(/(?:Nombre o Raz[oó]n Social|Raz[oó]n Social)[:\s]*([^\n]+)/i)
    const direccionMatch = t.match(/(?:Domicilio Fiscal|Direcci[oó]n Fiscal)[:\s]*([^\n]+)/i)
    const actividadMatch = t.match(/(?:Actividad[:\s]*Econ[oó]mica|Actividad\(es\) Econ[oó]mica)[:\s]*([^\n]+)/i)
    const representanteMatch = t.match(/(?:Representante Legal|Rep\. Legal)[:\s]*([^\n]+)/i)
    let sector = ''
    const act = (actividadMatch?.[1] || '').toLowerCase()
    if (act.includes('comerci')) sector = 'COMERCIO'
    else if (act.includes('servici') || act.includes('consult')) sector = 'SERVICIOS'
    else if (act.includes('manufactur') || act.includes('fabric')) sector = 'MANUFACTURA'
    else if (act.includes('construc')) sector = 'CONSTRUCCION'
    else if (act.includes('miner')) sector = 'MINERIA'
    else if (act.includes('transport')) sector = 'TRANSPORTE'
    else if (act.includes('textil')) sector = 'TEXTIL'
    else if (act.includes('educa')) sector = 'EDUCACION'
    else if (act.includes('salud')) sector = 'SALUD'
    else if (act.includes('hotel') || act.includes('turis')) sector = 'HOTELERIA'
    else if (act.includes('tecnolog') || act.includes('software')) sector = 'TECNOLOGIA'

    onDataExtracted({
      ruc: rucMatch?.[1],
      razonSocial: razonMatch?.[1]?.trim(),
      sector,
      direccion: direccionMatch?.[1]?.trim(),
      representante: representanteMatch?.[1]?.trim(),
    })
    setExpanded(false)
    setText('')
  }

  return (
    <div className="mt-2.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="text-xs text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] flex items-center gap-1 font-medium"
      >
        <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} aria-hidden />
        {expanded ? 'Ocultar la carga manual' : '¿No se validó? Pega tu Ficha RUC'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-3">
          <p className="text-[11px] text-[color:var(--text-secondary)] leading-relaxed">
            Ve a <a href="https://sunat.gob.pe" target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700 font-medium">sunat.gob.pe</a> → Consulta RUC → copia todo el texto y pégalo aquí.
          </p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Pega aquí el contenido de tu Ficha RUC…"
            aria-label="Contenido de la Ficha RUC"
            rows={4}
            className="w-full rounded-lg bg-white border border-[color:var(--border-default)] px-3 py-2 text-xs text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.10)] resize-none"
          />
          <Button size="sm" onClick={handleParse} disabled={!text.trim()}>
            Extraer datos
          </Button>
        </div>
      )}
    </div>
  )
}
