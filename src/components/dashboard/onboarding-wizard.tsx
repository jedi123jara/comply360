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
  Rocket,
  AlertTriangle,
  Check,
  X,
  ShieldCheck,
  ChevronDown,
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

/**
 * OnboardingWizard v3 — "Stripe Onboarding".
 *
 * Fondo blanco, stepper horizontal limpio, cards blancas con sombra suave,
 * verde emerald como acento. Microinteracciones discretas, sin gradientes
 * saturados ni fondos verdes pesados.
 *
 * Mantiene toda la lógica del original:
 *   - Lookup SUNAT automático (debounced 500ms)
 *   - Auto-detección de sector por actividad económica
 *   - Sugerencia de régimen según tamaño de empresa
 *   - Upload manual de Ficha RUC como fallback
 *   - Validación paso a paso
 *   - Persistencia vía /api/onboarding
 */

const SECTORS = [
  { value: 'COMERCIO', label: 'Comercio' },
  { value: 'SERVICIOS', label: 'Servicios' },
  { value: 'MANUFACTURA', label: 'Manufactura' },
  { value: 'CONSTRUCCION', label: 'Construcción' },
  { value: 'MINERIA', label: 'Minería' },
  { value: 'AGROINDUSTRIA', label: 'Agroindustria' },
  { value: 'PESCA', label: 'Pesca' },
  { value: 'TEXTIL', label: 'Textil y Confecciones' },
  { value: 'TECNOLOGIA', label: 'Tecnología' },
  { value: 'EDUCACION', label: 'Educación' },
  { value: 'SALUD', label: 'Salud' },
  { value: 'TRANSPORTE', label: 'Transporte y Logística' },
  { value: 'HOTELERIA', label: 'Hotelería y Turismo' },
  { value: 'OTRO', label: 'Otro' },
] as const

const SIZE_RANGES = [
  { value: '1-10', label: '1 a 10 trabajadores', hint: 'Microempresa' },
  { value: '11-50', label: '11 a 50 trabajadores', hint: 'Pequeña empresa' },
  { value: '51-100', label: '51 a 100 trabajadores', hint: 'Pequeña empresa' },
  { value: '101-200', label: '101 a 200 trabajadores', hint: 'Mediana empresa' },
  { value: '200+', label: 'Más de 200 trabajadores', hint: 'Gran empresa' },
] as const

const REGIMENES = [
  {
    value: 'GENERAL',
    label: 'Régimen General',
    description: 'D.Leg. 728 — CTS, gratificaciones, vacaciones 30 días',
    hint: 'La mayoría de empresas',
  },
  {
    value: 'MYPE_MICRO',
    label: 'MYPE Microempresa',
    description: 'Ley 32353 — Sin CTS ni gratificaciones, vacaciones 15 días',
    hint: 'Hasta 10 trabajadores y ventas < 150 UIT',
  },
  {
    value: 'MYPE_PEQUENA',
    label: 'MYPE Pequeña Empresa',
    description: 'Ley 32353 — 50% CTS y gratificaciones, vacaciones 15 días',
    hint: 'Hasta 100 trabajadores y ventas < 1700 UIT',
  },
  {
    value: 'AGRARIO',
    label: 'Régimen Agrario',
    description: 'Ley 31110 — CTS y gratificación incluidas en remuneración diaria',
    hint: 'Empresas del sector agrario',
  },
  {
    value: 'CONSTRUCCION_CIVIL',
    label: 'Construcción Civil',
    description: 'Régimen especial con jornal diario y beneficios diferenciados',
    hint: 'Empresas de construcción',
  },
  {
    value: 'OTRO',
    label: 'Otro régimen',
    description: 'Minero, pesquero, textil exportación, doméstico, CAS, etc.',
    hint: 'Selecciona si tu régimen no está listado arriba',
  },
] as const

interface FormData {
  razonSocial: string
  ruc: string
  sector: string
  sizeRange: string
  regimenPrincipal: string
  alertEmail: string
}

const INITIAL_FORM: FormData = {
  razonSocial: '',
  ruc: '',
  sector: '',
  sizeRange: '',
  regimenPrincipal: 'GENERAL',
  alertEmail: '',
}

const STEPS = [
  { title: 'Datos de empresa', description: 'RUC, razón social y sector', icon: Building2 },
  { title: 'Régimen laboral', description: 'Define beneficios y obligaciones', icon: Scale },
  { title: 'Alertas', description: '¿A dónde enviamos los recordatorios?', icon: Bell },
  { title: 'Confirmación', description: 'Revisa y comienza', icon: ShieldCheck },
] as const

export function OnboardingWizard() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [done, setDone] = useState(false)

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
      const res = await fetch(`/api/integrations/sunat?ruc=${ruc}`)
      const json = await res.json()

      if (!res.ok || json.error) {
        setRucLookupStatus('error')
        setRucLookupMessage(json.error || 'RUC no encontrado')
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
        setRucLookupMessage('RUC no encontrado')
      }
    } catch {
      setRucLookupStatus('error')
      setRucLookupMessage('Error al consultar SUNAT')
    }
  }, [])

  useEffect(() => {
    const ruc = form.ruc.trim()

    if (rucLookupTimer.current) {
      clearTimeout(rucLookupTimer.current)
      rucLookupTimer.current = null
    }

    if (ruc.length !== 11) {
      if (rucLookupStatus !== 'idle') {
        setRucLookupStatus('idle')
        setRucLookupMessage('')
      }
      lastLookedUpRuc.current = ''
      return
    }

    const prefix = ruc.substring(0, 2)
    if (!['10', '15', '17', '20', '30'].includes(prefix)) {
      setRucLookupStatus('idle')
      setRucLookupMessage('')
      return
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
          setForm(prev => ({
            ...prev,
            razonSocial: d.org.razonSocial || d.org.name || '',
            ruc: d.org.ruc || '',
            sector: d.org.sector || '',
            sizeRange: d.org.sizeRange || '',
            regimenPrincipal: d.org.regimenPrincipal || 'GENERAL',
            alertEmail: d.org.alertEmail || '',
          }))
        }
      })
      .catch(() => setShow(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !show) return null

  const updateField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const handleSizeChange = (size: string) => {
    setForm(prev => {
      const next = { ...prev, sizeRange: size }
      if (size === '1-10' && prev.regimenPrincipal === 'GENERAL') {
        next.regimenPrincipal = 'MYPE_MICRO'
      } else if ((size === '11-50' || size === '51-100') && prev.regimenPrincipal === 'MYPE_MICRO') {
        next.regimenPrincipal = 'MYPE_PEQUENA'
      }
      return next
    })
    setErrors(prev => ({ ...prev, sizeRange: undefined }))
  }

  const nextStep = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (step === 0) {
      if (!form.razonSocial.trim()) newErrors.razonSocial = 'Requerido'
      if (!form.ruc.trim()) newErrors.ruc = 'Requerido'
      else if (!/^\d{11}$/.test(form.ruc.trim())) newErrors.ruc = 'Debe tener 11 dígitos'
      if (!form.sector) newErrors.sector = 'Requerido'
      if (!form.sizeRange) newErrors.sizeRange = 'Requerido'
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
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razonSocial: form.razonSocial.trim(),
          ruc: form.ruc.trim(),
          sector: form.sector,
          sizeRange: form.sizeRange,
          regimenPrincipal: form.regimenPrincipal,
          alertEmail: form.alertEmail.trim() || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err.error || 'Error al guardar. Intenta de nuevo.'
        // Si el RUC choca con otra org, mostrar el error en el campo RUC
        if (res.status === 409 && /ruc/i.test(msg)) {
          setErrors({ ruc: msg })
          setStep(0)
        } else {
          setErrors({ razonSocial: msg })
          setStep(0)
        }
        return
      }

      setDone(true)

      // Auto-activar trial PRO 14 días sin tarjeta (best-effort, no bloquea si falla).
      // Si ya usó trial antes (409), seguirá con STARTER — no es crítico.
      fetch('/api/trial/start', { method: 'POST' })
        .then(() => logger.debug('[onboarding] trial PRO auto-activated'))
        .catch(() => logger.debug('[onboarding] trial activation skipped'))

      // Dar tiempo a que el usuario vea el estado "¡listo!" y luego redirigir
      // al dashboard. Evita que se quede con la página en blanco.
      setTimeout(() => {
        setShow(false)
        router.push('/dashboard?welcome=trial')
        router.refresh()
      }, 2000)
    } catch (err) {
      console.error('Onboarding submit error:', err)
      setErrors({ razonSocial: 'Error al guardar. Intenta de nuevo.' })
      setStep(0)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success state (Stripe-style: limpio, verde acento sutil) ─────────
  if (done) {
    return (
      <Card padding="xl" className="max-w-xl mx-auto text-center motion-fade-in-up">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200">
            <Rocket className="h-7 w-7 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)]">
              Todo listo
            </h3>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
              Tu empresa está configurada. Ya puedes empezar a usar COMPLY360.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  // ── Wizard body (Stripe-style: blanco, stepper horizontal, card limpia) ──
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
            Bienvenido a COMPLY360
          </h1>
          <p className="text-sm md:text-base text-[color:var(--text-secondary)] max-w-xl mx-auto">
            Cuéntanos sobre tu empresa para personalizar alertas, calendario
            de obligaciones y el régimen laboral aplicable.
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
              {STEPS[step].title}
            </h2>
            <p className="text-sm text-[color:var(--text-secondary)]">
              {STEPS[step].description}
            </p>
          </div>

          {/* STEP 0 — Company data */}
          {step === 0 && (
            <div className="space-y-5">
              <Field label="Razón social" required error={errors.razonSocial}>
                <input
                  type="text"
                  id="razon-social"
                  name="razonSocial"
                  value={form.razonSocial}
                  onChange={e => updateField('razonSocial', e.target.value)}
                  placeholder="Ej: Inversiones ABC S.A.C."
                  className={cn('w-full text-sm', inputCls(!!errors.razonSocial))}
                />
              </Field>

              <Field
                label="RUC"
                required
                error={errors.ruc}
                hint={
                  rucLookupStatus === 'loading'
                    ? 'Consultando SUNAT…'
                    : rucLookupStatus === 'success'
                      ? `Validado: ${rucLookupMessage}`
                      : rucLookupStatus === 'error'
                        ? rucLookupMessage
                        : 'Te lo buscamos automáticamente en SUNAT'
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
                      setRucLookupMessage(data.razonSocial || 'Datos cargados desde Ficha RUC')
                    }}
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Sector" required error={errors.sector}>
                  <Select
                    value={form.sector}
                    onValueChange={(v) => updateField('sector', v)}
                  >
                    <SelectTrigger error={!!errors.sector}>
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

                <Field label="Tamaño de empresa" required error={errors.sizeRange}>
                  <Select
                    value={form.sizeRange}
                    onValueChange={handleSizeChange}
                  >
                    <SelectTrigger error={!!errors.sizeRange}>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_RANGES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          )}

          {/* STEP 1 — Labor regime */}
          {step === 1 && (
            <div className="space-y-3">
              {form.sizeRange === '1-10' && form.regimenPrincipal !== 'MYPE_MICRO' && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800 leading-relaxed">
                    Con menos de 10 trabajadores, tu empresa podría acogerse al régimen
                    <strong className="font-semibold"> MYPE Microempresa</strong> para reducir costos laborales.
                  </p>
                </div>
              )}
              {REGIMENES.map(r => {
                const selected = form.regimenPrincipal === r.value
                return (
                  <label
                    key={r.value}
                    className={cn(
                      'flex items-start gap-3 rounded-lg p-4 cursor-pointer transition-all border',
                      selected
                        ? 'bg-emerald-50 border-emerald-300 shadow-[0_0_0_4px_rgba(16,185,129,0.08)]'
                        : 'bg-white border-[color:var(--border-default)] hover:border-emerald-200 hover:bg-emerald-50/40'
                    )}
                  >
                    <input
                      type="radio"
                      name="regimen"
                      value={r.value}
                      checked={selected}
                      onChange={e => updateField('regimenPrincipal', e.target.value)}
                      className="mt-1 h-4 w-4 accent-emerald-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm font-semibold', selected ? 'text-emerald-700' : 'text-[color:var(--text-primary)]')}>
                        {r.label}
                      </p>
                      <p className="text-xs text-[color:var(--text-secondary)] mt-0.5 leading-relaxed">
                        {r.description}
                      </p>
                      <p className="text-[11px] text-[color:var(--text-tertiary)] mt-1 font-medium">
                        {r.hint}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {/* STEP 2 — Alert config */}
          {step === 2 && (
            <div className="space-y-5">
              <Field
                label="Email del responsable de RRHH"
                hint="Opcional — puedes configurarlo después en Configuración."
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
                <h4 className="text-sm font-semibold text-[color:var(--text-primary)] mb-3">
                  COMPLY360 te alertará sobre:
                </h4>
                <ul className="space-y-2 text-sm">
                  {[
                    'Depósito de CTS (15 mayo / 15 noviembre)',
                    'Pago de gratificaciones (julio / diciembre)',
                    'Vencimiento de contratos a plazo fijo',
                    'Cambios normativos que afectan a tu empresa',
                    'Documentos y SCTR por vencer',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[color:var(--text-secondary)]">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* STEP 3 — Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--text-secondary)]">
                Revisa la información antes de continuar:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ReviewItem label="Razón Social" value={form.razonSocial} />
                <ReviewItem label="RUC" value={form.ruc} mono />
                <ReviewItem
                  label="Sector"
                  value={SECTORS.find(s => s.value === form.sector)?.label || form.sector}
                />
                <ReviewItem
                  label="Tamaño"
                  value={SIZE_RANGES.find(s => s.value === form.sizeRange)?.label || form.sizeRange}
                />
                <ReviewItem
                  label="Régimen laboral"
                  value={REGIMENES.find(r => r.value === form.regimenPrincipal)?.label || form.regimenPrincipal}
                />
                <ReviewItem
                  label="Email de alertas"
                  value={form.alertEmail || 'No configurado'}
                  muted={!form.alertEmail}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Error banner */}
        {Object.keys(errors).filter(k => errors[k as keyof FormData]).length > 0 && (
          <div className="flex items-start gap-2.5 rounded-lg border border-crimson-200 bg-crimson-50 px-4 py-3 motion-fade-in-up">
            <AlertTriangle className="w-4 h-4 text-crimson-600 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-crimson-700">
                Completa todos los campos obligatorios
              </p>
              <ul className="mt-1 text-xs text-crimson-700/80 space-y-0.5 list-disc list-inside">
                {errors.razonSocial && <li>Razón Social: {errors.razonSocial}</li>}
                {errors.ruc && <li>RUC: {errors.ruc}</li>}
                {errors.sector && <li>Sector: {errors.sector}</li>}
                {errors.sizeRange && <li>Tamaño: {errors.sizeRange}</li>}
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
              icon={!submitting ? <Rocket className="h-4 w-4" /> : undefined}
            >
              {submitting ? 'Guardando…' : 'Comenzar a usar COMPLY360'}
            </Button>
          )}
        </div>
      </div>
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
            <li key={i} className="flex items-center gap-2 flex-1 min-w-0">
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
  required,
  error,
  hint,
  hintTone = 'muted',
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  hintTone?: 'muted' | 'success' | 'error'
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[color:var(--text-primary)] mb-1.5">
        {label}
        {required ? <span className="text-crimson-600 ml-0.5">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-crimson-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
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

/* ── Ficha RUC upload (fallback manual) ────────────────────────────── */

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
        className="text-xs text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] flex items-center gap-1 font-medium"
      >
        <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
        {expanded ? 'Ocultar carga manual' : '¿No se validó? Pega tu Ficha RUC'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-3">
          <p className="text-[11px] text-[color:var(--text-secondary)] leading-relaxed">
            Ve a <a href="https://sunat.gob.pe" target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700 font-medium">sunat.gob.pe</a> → Consulta RUC → copiá todo el texto y pegalo aquí.
          </p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Pega aquí el contenido de la Ficha RUC…"
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
