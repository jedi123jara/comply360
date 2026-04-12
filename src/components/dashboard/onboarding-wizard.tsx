'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Building2,
  Scale,
  Bell,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Rocket,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SECTORS = [
  { value: 'COMERCIO', label: 'Comercio' },
  { value: 'SERVICIOS', label: 'Servicios' },
  { value: 'MANUFACTURA', label: 'Manufactura' },
  { value: 'CONSTRUCCION', label: 'Construccion' },
  { value: 'MINERIA', label: 'Mineria' },
  { value: 'AGROINDUSTRIA', label: 'Agroindustria' },
  { value: 'PESCA', label: 'Pesca' },
  { value: 'TEXTIL', label: 'Textil y Confecciones' },
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'EDUCACION', label: 'Educacion' },
  { value: 'SALUD', label: 'Salud' },
  { value: 'TRANSPORTE', label: 'Transporte y Logistica' },
  { value: 'HOTELERIA', label: 'Hoteleria y Turismo' },
  { value: 'OTRO', label: 'Otro' },
] as const

const SIZE_RANGES = [
  { value: '1-10', label: '1 a 10 trabajadores', hint: 'Microempresa' },
  { value: '11-50', label: '11 a 50 trabajadores', hint: 'Pequena empresa' },
  { value: '51-100', label: '51 a 100 trabajadores', hint: 'Pequena empresa' },
  { value: '101-200', label: '101 a 200 trabajadores', hint: 'Mediana empresa' },
  { value: '200+', label: 'Mas de 200 trabajadores', hint: 'Gran empresa' },
] as const

const REGIMENES = [
  {
    value: 'GENERAL',
    label: 'Regimen General',
    description: 'D.Leg. 728 — CTS, gratificaciones, vacaciones 30 dias',
    hint: 'La mayoria de empresas',
  },
  {
    value: 'MYPE_MICRO',
    label: 'MYPE Microempresa',
    description: 'Ley 32353 — Sin CTS ni gratificaciones, vacaciones 15 dias',
    hint: 'Hasta 10 trabajadores y ventas < 150 UIT',
  },
  {
    value: 'MYPE_PEQUENA',
    label: 'MYPE Pequena Empresa',
    description: 'Ley 32353 — 50% CTS y gratificaciones, vacaciones 15 dias',
    hint: 'Hasta 100 trabajadores y ventas < 1700 UIT',
  },
  {
    value: 'AGRARIO',
    label: 'Regimen Agrario',
    description: 'Ley 31110 — CTS y gratificacion incluidas en remuneracion diaria',
    hint: 'Empresas del sector agrario',
  },
  {
    value: 'CONSTRUCCION_CIVIL',
    label: 'Construccion Civil',
    description: 'Regimen especial con jornal diario y beneficios diferenciados',
    hint: 'Empresas de construccion',
  },
  {
    value: 'OTRO',
    label: 'Otro regimen',
    description: 'Minero, pesquero, textil exportacion, domestico, CAS, etc.',
    hint: 'Selecciona si tu regimen no esta listado arriba',
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

export function OnboardingWizard() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(0) // 0-3
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [done, setDone] = useState(false)

  // RUC lookup state
  const [rucLookupStatus, setRucLookupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [rucLookupMessage, setRucLookupMessage] = useState('')
  const rucLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLookedUpRuc = useRef('')

  // Debounced SUNAT RUC lookup
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
        // Auto-detect sector from SUNAT's actividad economica
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
        setRucLookupMessage(`${data.razonSocial}${data.estado ? ` — ${data.estado}` : ''}${data.condicion ? ` (${data.condicion})` : ''}`)
      } else {
        setRucLookupStatus('error')
        setRucLookupMessage('RUC no encontrado')
      }
    } catch {
      setRucLookupStatus('error')
      setRucLookupMessage('Error al consultar SUNAT')
    }
  }, [])

  // Watch RUC field and trigger debounced lookup
  useEffect(() => {
    const ruc = form.ruc.trim()

    // Clear timer on every change
    if (rucLookupTimer.current) {
      clearTimeout(rucLookupTimer.current)
      rucLookupTimer.current = null
    }

    // Reset status if RUC is incomplete
    if (ruc.length !== 11) {
      if (rucLookupStatus !== 'idle') {
        setRucLookupStatus('idle')
        setRucLookupMessage('')
      }
      lastLookedUpRuc.current = ''
      return
    }

    // Only lookup if starts with valid prefix (10, 15, 17, 20, 30)
    const prefix = ruc.substring(0, 2)
    if (!['10', '15', '17', '20', '30'].includes(prefix)) {
      setRucLookupStatus('idle')
      setRucLookupMessage('')
      return
    }

    // Skip if already looked up this RUC
    if (lastLookedUpRuc.current === ruc) return

    // Debounce 500ms
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

  // Check onboarding status on mount
  useEffect(() => {
    fetch('/api/onboarding')
      .then(res => res.json())
      .then(d => {
        if (!d.onboardingCompleted) {
          setShow(true)
        }
        // Pre-fill if org data exists
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

  // Auto-suggest regime based on size — fix stale closure by merging in one setForm
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
    // Validate inline against the *current* form state (avoid stale closure issues)
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (step === 0) {
      if (!form.razonSocial.trim()) newErrors.razonSocial = 'Requerido'
      if (!form.ruc.trim()) newErrors.ruc = 'Requerido'
      else if (!/^\d{11}$/.test(form.ruc.trim())) newErrors.ruc = 'Debe tener 11 digitos'
      if (!form.sector) newErrors.sector = 'Requerido'
      if (!form.sizeRange) newErrors.sizeRange = 'Requerido'
    }
    // Debug: ver en consola del navegador si el botón responde y qué falla
    console.log('[COMPLY360] Siguiente → step:', step, '| form:', form, '| errors:', newErrors)
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
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }

      setDone(true)
      setTimeout(() => setShow(false), 2500)
    } catch (err) {
      console.error('Onboarding submit error:', err)
      setErrors({ razonSocial: 'Error al guardar. Intenta de nuevo.' })
      setStep(0)
    } finally {
      setSubmitting(false)
    }
  }

  const STEPS = [
    { title: 'Datos de empresa', icon: Building2 },
    { title: 'Regimen laboral', icon: Scale },
    { title: 'Alertas', icon: Bell },
    { title: 'Confirmacion', icon: CheckCircle },
  ]

  // Success state
  if (done) {
    return (
      <div className="relative bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-8 text-white text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <Rocket className="w-12 h-12 mx-auto mb-3 text-yellow-300" />
        <h3 className="text-xl font-bold mb-1">Tu empresa esta configurada</h3>
        <p className="text-white/80 text-sm">Ya puedes empezar a usar COMPLY360. Bienvenido.</p>
      </div>
    )
  }

  return (
    <div className="relative bg-gradient-to-r from-primary via-primary-light to-primary rounded-2xl p-6 text-white overflow-hidden">
      <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-gold" />
          <div>
            <h3 className="text-lg font-bold">Configura tu empresa</h3>
            <p className="text-sm text-white/70">Completa estos datos para personalizar tu experiencia</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all',
                    i < step ? 'bg-gold text-primary' :
                    i === step ? 'bg-[#141824] text-primary' :
                    'bg-white/20 text-white/50'
                  )}
                >
                  {i < step ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={cn(
                  'text-xs font-medium hidden sm:block',
                  i <= step ? 'text-white' : 'text-white/40'
                )}>
                  {s.title}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 rounded-full',
                    i < step ? 'bg-gold' : 'bg-white/20'
                  )} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 mb-4 min-h-[200px]">
          {/* STEP 0: Company data */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Razon Social *</label>
                <input
                  type="text"
                  id="razon-social"
                  name="razonSocial"
                  value={form.razonSocial}
                  onChange={e => updateField('razonSocial', e.target.value)}
                  placeholder="Ej: Inversiones ABC S.A.C."
                  className={cn(
                    'w-full px-3 py-2.5 rounded-lg bg-white/10 border text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50',
                    errors.razonSocial ? 'border-red-400' : 'border-white/20'
                  )}
                />
                {errors.razonSocial && <p className="text-xs text-red-300 mt-1">{errors.razonSocial}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">RUC *</label>
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
                      'w-full px-3 py-2.5 pr-10 rounded-lg bg-white/10 border text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50',
                      errors.ruc ? 'border-red-400' :
                      rucLookupStatus === 'success' ? 'border-emerald-400' :
                      rucLookupStatus === 'error' ? 'border-red-400' :
                      'border-white/20'
                    )}
                  />
                  {/* RUC lookup status indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {rucLookupStatus === 'loading' && (
                      <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                    )}
                    {rucLookupStatus === 'success' && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                    {rucLookupStatus === 'error' && (
                      <X className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
                {errors.ruc && <p className="text-xs text-red-300 mt-1">{errors.ruc}</p>}
                {rucLookupStatus === 'loading' && (
                  <p className="text-xs text-white/50 mt-1">Consultando SUNAT...</p>
                )}
                {rucLookupStatus === 'success' && (
                  <p className="text-xs text-emerald-300 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Validado con SUNAT: {rucLookupMessage}
                  </p>
                )}
                {rucLookupStatus === 'error' && !errors.ruc && (
                  <p className="text-xs text-red-300 mt-1">{rucLookupMessage || 'RUC no encontrado'}</p>
                )}

                {/* Upload Ficha RUC option */}
                {(rucLookupStatus === 'error' || rucLookupStatus === 'idle') && (
                  <FichaRucUpload onDataExtracted={(data) => {
                    setForm(prev => ({
                      ...prev,
                      razonSocial: data.razonSocial || prev.razonSocial,
                      ruc: data.ruc || prev.ruc,
                      sector: data.sector || prev.sector,
                    }))
                    setErrors(prev => ({ ...prev, razonSocial: undefined, ruc: undefined, sector: undefined }))
                    setRucLookupStatus('success')
                    setRucLookupMessage(data.razonSocial || 'Datos cargados desde Ficha RUC')
                  }} />
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Sector *</label>
                  <select
                    value={form.sector}
                    onChange={e => updateField('sector', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2.5 rounded-lg bg-white/10 border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 [&>option]:text-gray-900',
                      errors.sector ? 'border-red-400' : 'border-white/20'
                    )}
                  >
                    <option value="">Selecciona...</option>
                    {SECTORS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {errors.sector && <p className="text-xs text-red-300 mt-1">{errors.sector}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Tamanio *</label>
                  <select
                    value={form.sizeRange}
                    onChange={e => handleSizeChange(e.target.value)}
                    className={cn(
                      'w-full px-3 py-2.5 rounded-lg bg-white/10 border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 [&>option]:text-gray-900',
                      errors.sizeRange ? 'border-red-400' : 'border-white/20'
                    )}
                  >
                    <option value="">Selecciona...</option>
                    {SIZE_RANGES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {errors.sizeRange && <p className="text-xs text-red-300 mt-1">{errors.sizeRange}</p>}
                </div>
              </div>

            </div>
          )}

          {/* STEP 1: Labor regime */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-white/70 mb-3">
                Selecciona el regimen laboral principal de tu empresa. Esto determina los beneficios y obligaciones.
              </p>
              {form.sizeRange === '1-10' && form.regimenPrincipal !== 'MYPE_MICRO' && (
                <div className="flex items-start gap-2 bg-amber-500/20 rounded-lg p-3 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-200">
                    Con menos de 10 trabajadores, tu empresa podria acogerse al regimen MYPE Microempresa para reducir costos laborales.
                  </p>
                </div>
              )}
              {REGIMENES.map(r => (
                <label
                  key={r.value}
                  className={cn(
                    'flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-all border',
                    form.regimenPrincipal === r.value
                      ? 'bg-gold/20 border-gold/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                >
                  <input
                    type="radio"
                    name="regimen"
                    value={r.value}
                    checked={form.regimenPrincipal === r.value}
                    onChange={e => updateField('regimenPrincipal', e.target.value)}
                    className="mt-1 accent-yellow-400"
                  />
                  <div>
                    <p className="text-sm font-semibold">{r.label}</p>
                    <p className="text-xs text-white/60">{r.description}</p>
                    <p className="text-xs text-gold/80 mt-0.5">{r.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* STEP 2: Alert config */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-white/70 mb-2">
                Configura a donde enviamos las alertas de vencimientos, cambios normativos y obligaciones pendientes.
              </p>
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Email del responsable de RRHH
                </label>
                <input
                  type="email"
                  id="alert-email"
                  name="alertEmail"
                  value={form.alertEmail}
                  onChange={e => updateField('alertEmail', e.target.value)}
                  placeholder="rrhh@tuempresa.com"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
                <p className="text-xs text-white/50 mt-1">
                  Opcional — puedes configurarlo despues en Configuracion.
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 mt-4">
                <h4 className="text-sm font-semibold mb-2">COMPLY360 te alertara sobre:</h4>
                <ul className="space-y-2 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-gold shrink-0" />
                    Deposito de CTS (15 mayo / 15 noviembre)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-gold shrink-0" />
                    Pago de gratificaciones (julio / diciembre)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-gold shrink-0" />
                    Vencimiento de contratos a plazo fijo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-gold shrink-0" />
                    Cambios normativos que afectan a tu empresa
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-gold shrink-0" />
                    Documentos y SCTR por vencer
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-white/70 mb-2">Revisa la informacion antes de continuar:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-0.5">Razon Social</p>
                  <p className="text-sm font-semibold">{form.razonSocial}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-0.5">RUC</p>
                  <p className="text-sm font-semibold">{form.ruc}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-0.5">Sector</p>
                  <p className="text-sm font-semibold">
                    {SECTORS.find(s => s.value === form.sector)?.label || form.sector}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-0.5">Tamanio</p>
                  <p className="text-sm font-semibold">
                    {SIZE_RANGES.find(s => s.value === form.sizeRange)?.label || form.sizeRange}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-0.5">Regimen Laboral</p>
                  <p className="text-sm font-semibold">
                    {REGIMENES.find(r => r.value === form.regimenPrincipal)?.label || form.regimenPrincipal}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/50 mb-0.5">Email de alertas</p>
                  <p className="text-sm font-semibold">{form.alertEmail || 'No configurado'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Banner de errores de validación — visible solo cuando hay errores */}
        {Object.keys(errors).filter(k => errors[k as keyof FormData]).length > 0 && (
          <div className="relative z-10 flex items-start gap-2 bg-red-500/40 border border-red-400 rounded-xl px-4 py-3 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-200 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">Completa todos los campos obligatorios (*)</p>
              <ul className="mt-1 text-xs text-red-200 space-y-0.5 list-disc list-inside">
                {(errors.razonSocial) && <li>Razon Social: {errors.razonSocial}</li>}
                {(errors.ruc) && <li>RUC: {errors.ruc}</li>}
                {(errors.sector) && <li>Sector: {errors.sector}</li>}
                {(errors.sizeRange) && <li>Tamaño: {errors.sizeRange}</li>}
              </ul>
            </div>
          </div>
        )}

        {/* Navigation buttons — relative z-10 para evitar que elementos absolutos los cubran */}
        <div className="relative z-10 flex items-center justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 0}
            className={cn(
              'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              step === 0
                ? 'opacity-0 pointer-events-none'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Atras
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-1 px-5 py-2.5 bg-gold hover:bg-gold-light text-primary rounded-lg text-sm font-bold transition-all shadow-lg cursor-pointer"
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-gold hover:bg-gold-light text-primary rounded-lg text-sm font-bold transition-all shadow-lg disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Comenzar a usar COMPLY360
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Subir Ficha RUC — pega el texto de la ficha para auto-llenar ───────

function FichaRucUpload({ onDataExtracted }: {
  onDataExtracted: (data: { ruc?: string; razonSocial?: string; sector?: string; direccion?: string; representante?: string }) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState('')

  const handleParse = () => {
    if (!text.trim()) return

    const t = text

    // Parse known Ficha RUC fields
    const rucMatch = t.match(/(?:RUC|N[uú]mero de RUC)[:\s]*(\d{11})/i)
    const razonMatch = t.match(/(?:Nombre o Raz[oó]n Social|Raz[oó]n Social)[:\s]*([^\n]+)/i)
    const direccionMatch = t.match(/(?:Domicilio Fiscal|Direcci[oó]n Fiscal)[:\s]*([^\n]+)/i)
    const actividadMatch = t.match(/(?:Actividad[:\s]*Econ[oó]mica|Actividad\(es\) Econ[oó]mica)[:\s]*([^\n]+)/i)
    const representanteMatch = t.match(/(?:Representante Legal|Rep\. Legal)[:\s]*([^\n]+)/i)

    // Auto-detect sector from actividad
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
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-amber-300/80 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1"
      >
        <ArrowRight className={cn('w-3 h-3 transition-transform', expanded && 'rotate-90')} />
        {expanded ? 'Cerrar' : '¿No se valido? Pega tu Ficha RUC aqui'}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-white/40">
            Ve a <b>sunat.gob.pe</b> → Consulta RUC → copia todo el texto de la ficha y pegalo aqui:
          </p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Pega aqui el contenido de la Ficha RUC..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-xs placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
          />
          <button
            type="button"
            onClick={handleParse}
            disabled={!text.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-xs font-semibold text-amber-300 disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Extraer datos
          </button>
        </div>
      )}
    </div>
  )
}

