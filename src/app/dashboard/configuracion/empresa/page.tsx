'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Building2, Save, Loader2, CheckCircle2, AlertCircle, XCircle, Upload, X, Crown, Sparkles, Users, ChevronLeft, User, Phone, Mail, MapPin, FileText, Search, Landmark, ShieldAlert, Briefcase, MapPinned } from 'lucide-react'
import Link from 'next/link'
import { PLANS as PLANS_SOURCE, LAUNCH_DISCOUNT_PERCENT } from '@/lib/constants'

// =============================================
// Types
// =============================================

interface RepresentanteLegal {
  nombre: string
  dni: string
  cargo: string
}

interface ContadorResponsable {
  nombre: string
  cpc: string
  email: string
}

interface CompanyForm {
  ruc: string
  razonSocial: string
  nombreComercial: string
  sector: string
  tamano: string
  regimenLaboral: string
  regimenTributario: string
  alertEmail: string
  telefono: string
  direccionFiscal: string
  departamento: string
  provincia: string
  distrito: string
  representante: RepresentanteLegal
  contador: ContadorResponsable
}

type RucStatus = 'idle' | 'loading' | 'verified' | 'error'

type FeedbackState = {
  type: 'success' | 'error'
  message: string
} | null

interface PlanInfo {
  key: string
  name: string
  price: string
  color: string
  gradient: string
  features: string[]
  workersLimit: string
  usersLimit: string
}

// =============================================
// Constants
// =============================================

const SECTORES = [
  'Servicios Legales',
  'Tecnología',
  'Manufactura',
  'Comercio',
  'Construcción',
  'Minería',
  'Agricultura',
  'Pesca',
  'Transporte',
  'Educación',
  'Salud',
  'Finanzas',
  'Turismo',
  'Agroindustria',
  'Otro',
]

const TAMANOS = [
  { value: '1-10', label: '1–10 trabajadores (Microempresa)' },
  { value: '11-50', label: '11–50 trabajadores (Pequeña empresa)' },
  { value: '51-200', label: '51–200 trabajadores (Mediana empresa)' },
  { value: '200+', label: '200+ trabajadores (Gran empresa)' },
]

const REGIMENES_LABORALES = [
  { value: 'GENERAL', label: 'Régimen General' },
  { value: 'MYPE_MICRO', label: 'MYPE – Microempresa' },
  { value: 'MYPE_PEQUENA', label: 'MYPE – Pequeña Empresa' },
  { value: 'AGRARIO', label: 'Régimen Agrario y Acuícola' },
  { value: 'CONSTRUCCION_CIVIL', label: 'Construcción Civil' },
  { value: 'MINERO', label: 'Régimen Minero' },
  { value: 'EXPORTACION', label: 'Exportación no Tradicional' },
  { value: 'PUBLICO_276', label: 'Sector Público (D.L. 276)' },
  { value: 'CAS', label: 'Régimen CAS (D.L. 1057)' },
]

const REGIMENES_TRIBUTARIOS = [
  { value: 'RER', label: 'RER – Régimen Especial de Renta' },
  { value: 'RMT', label: 'RMT – Régimen MYPE Tributario' },
  { value: 'GENERAL', label: 'Régimen General' },
  { value: 'NRUS', label: 'NRUS – Nuevo Régimen Único Simplificado' },
]

const DEPARTAMENTOS = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca',
  'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín',
  'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios',
  'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna',
  'Tumbes', 'Ucayali',
]

// Single source of truth: PLANS_SOURCE viene de lib/constants.ts
// Aquí solo añadimos los aspectos visuales (color, gradient) que son
// específicos de esta vista. Precios + límites + features vienen del source.
const VISUAL_DECORATION: Record<string, { color: string; gradient: string }> = {
  FREE:    { color: 'text-slate-300', gradient: 'from-gray-500 to-gray-600' },
  STARTER: { color: 'text-emerald-600', gradient: 'from-blue-500 to-blue-600' },
  EMPRESA: { color: 'text-indigo-400', gradient: 'from-indigo-500 to-purple-600' },
  PRO:     { color: 'text-amber-400', gradient: 'from-amber-500 to-orange-600' },
}

// Tipo genérico para no caer en literal-types de TS (cada plan tiene
// price como literal: 0/199/599/1499/etc).
function formatPrice(p: { price: number; isCustomQuote: boolean }): string {
  if (p.isCustomQuote) return 'Cotizar'
  if (p.price === 0) return 'S/ 0/mes'
  return `S/ ${p.price}/mes`
}

const PLANS: PlanInfo[] = ['FREE', 'STARTER', 'EMPRESA', 'PRO'].map((key) => {
  const p = PLANS_SOURCE[key as keyof typeof PLANS_SOURCE]
  const deco = VISUAL_DECORATION[key]
  return {
    key,
    name: p.name,
    price: formatPrice(p),
    color: deco.color,
    gradient: deco.gradient,
    workersLimit: p.maxWorkers >= 999999 ? 'Ilimitados' : `Hasta ${p.maxWorkers}`,
    usersLimit: p.maxUsers >= 999999 ? 'Ilimitados' : `${p.maxUsers} ${p.maxUsers === 1 ? 'usuario' : 'usuarios'}`,
    features: p.features.slice(0, 6), // primeras 6 features para no saturar el card
  }
})

// =============================================
// Shared styles
// =============================================

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-[color:var(--border-default)] bg-white text-[color:var(--text-primary)] placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors text-sm'
const labelCls = 'block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5'
const cardCls = 'bg-white rounded-2xl border border-gray-200 p-6 shadow-sm'
const sectionTitleCls = 'text-base font-bold text-[color:var(--text-primary)] mb-5 flex items-center gap-2'

// =============================================
// FeedbackBanner
// =============================================

function FeedbackBanner({ feedback, onDismiss }: { feedback: FeedbackState; onDismiss: () => void }) {
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(onDismiss, 5000)
      return () => clearTimeout(timer)
    }
  }, [feedback, onDismiss])

  if (!feedback) return null

  const isSuccess = feedback.type === 'success'

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
        isSuccess
          ? 'bg-green-900/30 text-green-400 border border-green-800'
          : 'bg-red-900/30 text-red-400 border border-red-800'
      }`}
    >
      {isSuccess
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 flex-shrink-0" />
      }
      <span className="flex-1">{feedback.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar mensaje"
        className="opacity-60 hover:opacity-100 transition-opacity rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// =============================================
// RUC Status Badge
// =============================================

function RucBadge({ status, message }: { status: RucStatus; message: string }) {
  if (status === 'idle') return null

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Consultando SUNAT...
      </div>
    )
  }

  if (status === 'verified') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-400 mt-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>✓ RUC Verificado en SUNAT — {message}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5">
      <XCircle className="w-3.5 h-3.5" />
      ⚠️ RUC no verificado — {message}
    </div>
  )
}

// =============================================
// Plan Card
// =============================================

function PlanCard({ plan, currentPlan, workersUsed, workersLimit }: {
  plan: PlanInfo
  currentPlan: string
  workersUsed: number
  workersLimit: number | null
}) {
  const isCurrent = plan.key === currentPlan
  const usagePercent = workersLimit ? Math.min((workersUsed / workersLimit) * 100, 100) : 0

  return (
    <div className={`rounded-2xl border-2 p-5 transition-all ${
      isCurrent
        ? 'border-primary shadow-lg shadow-primary/10 bg-white'
        : 'border-white/[0.08] bg-white opacity-70'
    }`}>
      {isCurrent && (
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            Plan actual
          </span>
          <Crown className="w-4 h-4 text-amber-500" />
        </div>
      )}

      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${plan.gradient} text-white text-sm font-bold mb-3`}>
        {plan.key === 'PRO' && <Sparkles className="w-3.5 h-3.5" />}
        {plan.name}
      </div>

      <p className="text-xl font-bold text-white mb-4">{plan.price}</p>

      <ul className="space-y-1.5 mb-4">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      {/* Usage stats (only show for current plan) */}
      {isCurrent && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-gray-400">
              <Users className="w-3.5 h-3.5" />
              Trabajadores
            </span>
            <span className="font-semibold text-[color:var(--text-secondary)]">
              {workersUsed} / {workersLimit ?? '∞'}
            </span>
          </div>
          {workersLimit && (
            <div className="w-full h-1.5 bg-[color:var(--neutral-100)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          )}
        </div>
      )}

      {isCurrent ? (
        <button
          disabled
          className="mt-4 w-full py-2 rounded-xl bg-[color:var(--neutral-100)] text-slate-500 text-sm font-semibold text-center cursor-default"
        >
          Plan actual
        </button>
      ) : (
        <button className="mt-4 w-full py-2 rounded-xl border border-white/10 border-[color:var(--border-default)] text-slate-300 hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)] text-sm font-semibold transition-colors flex items-center justify-center gap-1">
          Actualizar plan
          <span className="text-[10px] ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200 font-bold">
            Próximamente
          </span>
        </button>
      )}
    </div>
  )
}

// =============================================
// Main Component
// =============================================

export default function EmpresaPage() {
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  // RUC lookup
  const [rucStatus, setRucStatus] = useState<RucStatus>('idle')
  const [rucMessage, setRucMessage] = useState('')
  const rucTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLookedUpRuc = useRef('')

  // Logo
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [form, setForm] = useState<CompanyForm>({
    ruc: '',
    razonSocial: '',
    nombreComercial: '',
    sector: '',
    tamano: '',
    regimenLaboral: 'GENERAL',
    regimenTributario: 'RMT',
    alertEmail: '',
    telefono: '',
    direccionFiscal: '',
    departamento: 'Lima',
    provincia: '',
    distrito: '',
    representante: {
      nombre: '',
      dni: '',
      cargo: '',
    },
    contador: {
      nombre: '',
      cpc: '',
      email: '',
    },
  })

  // SUNAT advanced data
  const [sunatLoading, setSunatLoading] = useState(false)
  const [sunatData, setSunatData] = useState<{
    deuda: { items: { monto: string; periodo: string; fechaCobranza: string; entidad: string }[]; totalItems: number } | null
    representantes: { representantes: { tipoDocumento: string; numDocumento: string; nombre: string; cargo: string; fechaDesde: string }[]; totalRepresentantes: number } | null
    trabajadores: { periodos: { periodo: string; totalTrabajadores: number; pensionistas: number; prestadoresServicios: number }[] } | null
    establecimientos: { establecimientos: { codigo: string; descripcionTipo: string; direccion: string; actividadEconomica: string }[]; totalEstablecimientos: number } | null
  } | null>(null)
  const [sunatError, setSunatError] = useState<string | null>(null)

  const fetchSunatAdvanced = useCallback(async () => {
    if (!form.ruc || form.ruc.length !== 11) return
    setSunatLoading(true)
    setSunatError(null)
    try {
      const res = await fetch(`/api/integrations/sunat/consulta-ruc?ruc=${form.ruc}&tipo=all`)
      const json = await res.json()
      if (!res.ok) {
        setSunatError(json.error || 'Error al consultar SUNAT')
        return
      }
      setSunatData(json.data)
    } catch {
      setSunatError('Error de conexión al consultar SUNAT')
    } finally {
      setSunatLoading(false)
    }
  }, [form.ruc])

  // Plan data — fetched from real API
  const PLAN_WORKER_LIMITS: Record<string, number | null> = {
    FREE: 5,
    STARTER: 25,
    EMPRESA: 100,
    PRO: null,
  }
  const [currentPlan, setCurrentPlan] = useState<string>('FREE')
  const [workersUsed, setWorkersUsed] = useState<number>(0)
  const workersLimit: number | null = PLAN_WORKER_LIMITS[currentPlan] ?? null

  useEffect(() => {
    // Fetch org profile + plan + worker count
    Promise.all([
      fetch('/api/onboarding').then(r => r.json()),
      fetch('/api/dashboard').then(r => r.json()),
    ]).then(([onbData, dashData]) => {
      // Plan info
      if (onbData?.org?.plan) setCurrentPlan(onbData.org.plan)
      if (typeof dashData?.stats?.totalWorkers === 'number') {
        setWorkersUsed(dashData.stats.totalWorkers)
      }

      // Hydrate form with saved org data
      const org = onbData?.org
      if (org) {
        setForm(prev => ({
          ...prev,
          ruc:             org.ruc            ?? '',
          razonSocial:     org.razonSocial    ?? org.name ?? '',
          nombreComercial: org.nombreComercial ?? '',
          sector:          org.sector         ?? '',
          tamano:          org.sizeRange      ?? '',
          regimenLaboral:  org.regimenPrincipal ?? 'GENERAL',
          regimenTributario: org.regimenTributario ?? 'RMT',
          alertEmail:      org.alertEmail     ?? '',
          telefono:        org.phone          ?? '',
          direccionFiscal: org.address        ?? '',
          departamento:    org.city           ?? 'Lima',
          provincia:       org.province       ?? '',
          distrito:        org.district       ?? '',
          representante: {
            nombre: org.repNombre ?? '',
            dni:    org.repDni    ?? '',
            cargo:  org.repCargo  ?? '',
          },
          contador: {
            nombre: org.contNombre ?? '',
            cpc:    org.contCpc    ?? '',
            email:  org.contEmail  ?? '',
          },
        }))
        if (org.logoUrl) setLogoPreview(org.logoUrl)
        // If RUC was already saved, mark as verified
        if (org.ruc?.length === 11) {
          setRucStatus('verified')
          setRucMessage(org.razonSocial ?? org.name ?? '')
        }
      }
    }).catch(() => {
      // keep defaults on error
    })
  }, [])

  // =============================================
  // RUC auto-lookup (debounced, same as onboarding)
  // =============================================

  const lookupRuc = useCallback(async (ruc: string) => {
    if (lastLookedUpRuc.current === ruc) return
    lastLookedUpRuc.current = ruc

    setRucStatus('loading')
    setRucMessage('')

    try {
      const res = await fetch(`/api/integrations/sunat?ruc=${ruc}`)
      const json = await res.json()

      if (!res.ok || json.error) {
        setRucStatus('error')
        setRucMessage(json.error || 'RUC no encontrado en SUNAT')
        return
      }

      const data = json.data
      if (data?.razonSocial) {
        setForm(prev => ({
          ...prev,
          razonSocial: data.razonSocial,
          direccionFiscal: data.direccionFiscal || prev.direccionFiscal,
          departamento: data.departamento || prev.departamento,
        }))
        setRucStatus('verified')
        setRucMessage(data.razonSocial)
      } else {
        setRucStatus('error')
        setRucMessage('RUC no encontrado en SUNAT')
      }
    } catch {
      setRucStatus('error')
      setRucMessage('Error al consultar SUNAT')
    }
  }, [])

  const handleRucChange = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 11)
    setForm(prev => ({ ...prev, ruc: clean }))

    // Clear debounce timer
    if (rucTimerRef.current) clearTimeout(rucTimerRef.current)

    // Reset if incomplete
    if (clean.length !== 11) {
      if (rucStatus !== 'idle') {
        setRucStatus('idle')
        setRucMessage('')
      }
      lastLookedUpRuc.current = ''
      return
    }

    // Validate prefix
    const prefix = clean.substring(0, 2)
    if (!['10', '15', '17', '20', '30'].includes(prefix)) {
      setRucStatus('error')
      setRucMessage('Prefijo de RUC no válido')
      return
    }

    // Debounce the lookup
    rucTimerRef.current = setTimeout(() => lookupRuc(clean), 600)
  }

  // =============================================
  // Logo upload
  // =============================================

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'El logo no puede superar 2 MB.' })
      return
    }
    const reader = new FileReader()
    reader.onload = ev => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // =============================================
  // Save
  // =============================================

  const handleSave = async () => {
    if (!form.razonSocial.trim()) {
      setFeedback({ type: 'error', message: 'La razón social es obligatoria.' })
      return
    }
    if (form.ruc && !/^\d{11}$/.test(form.ruc)) {
      setFeedback({ type: 'error', message: 'El RUC debe tener exactamente 11 dígitos.' })
      return
    }

    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razonSocial:       form.razonSocial.trim(),
          ruc:               form.ruc.trim() || null,
          nombreComercial:   form.nombreComercial.trim() || null,
          sector:            form.sector || null,
          sizeRange:         form.tamano || null,
          regimenPrincipal:  form.regimenLaboral || 'GENERAL',
          regimenTributario: form.regimenTributario || null,
          alertEmail:        form.alertEmail.trim() || null,
          phone:             form.telefono.trim() || null,
          address:           form.direccionFiscal.trim() || null,
          city:              form.departamento.trim() || null,
          province:          form.provincia.trim() || null,
          district:          form.distrito.trim() || null,
          repNombre:         form.representante.nombre.trim() || null,
          repDni:            form.representante.dni.trim() || null,
          repCargo:          form.representante.cargo.trim() || null,
          contNombre:        form.contador.nombre.trim() || null,
          contCpc:           form.contador.cpc.trim() || null,
          contEmail:         form.contador.email.trim() || null,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al guardar')
      }

      setFeedback({ type: 'success', message: '¡Datos de la empresa guardados correctamente!' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setFeedback({ type: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  const updateField = <K extends keyof CompanyForm>(field: K, value: CompanyForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // =============================================
  // Render
  // =============================================

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Back + Header */}
      <div>
        <Link
          href="/dashboard/configuracion"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Configuración
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <Building2 className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Datos de Empresa</h1>
              <p className="text-sm text-[color:var(--text-secondary)]">
                Información fiscal, tributaria y comercial de tu organización
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-primary/20"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Feedback */}
      <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      {/* ============================== */}
      {/* Card 1: Información General    */}
      {/* ============================== */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>
          <Building2 className="h-5 w-5 text-slate-500" />
          Información General
        </h2>

        {/* Logo Upload */}
        <div className="flex items-start gap-5 mb-6 pb-6 border-b border-white/[0.06] border-white/[0.08]">
          <div className="flex-shrink-0">
            {logoPreview ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/[0.08] border-[color:var(--border-default)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview} alt="Logo empresa" className="w-full h-full object-contain bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]" />
                <button
                  onClick={() => { setLogoPreview(null); if (logoInputRef.current) logoInputRef.current.value = '' }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl bg-[color:var(--neutral-100)] border border-white/[0.08] border-[color:var(--border-default)] flex items-center justify-center">
                <Building2 className="w-8 h-8 text-slate-500" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-secondary)] mb-1">Logo de la empresa</p>
            <p className="text-xs text-gray-400 mb-3">
              PNG, JPG o SVG. Máximo 2 MB. Recomendado: 200×200px.
            </p>
            <button
              onClick={() => logoInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 border border-white/10 border-[color:var(--border-default)] rounded-xl text-xs font-medium text-slate-300 hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)] transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Subir logo
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* RUC with auto-lookup */}
          <div>
            <label className={labelCls}>RUC *</label>
            <input
              type="text"
              value={form.ruc}
              onChange={e => handleRucChange(e.target.value)}
              placeholder="20XXXXXXXXX"
              maxLength={11}
              className={`${inputCls} font-mono`}
            />
            <RucBadge status={rucStatus} message={rucMessage} />
            <p className="text-xs text-slate-500 mt-1">
              Al ingresar 11 dígitos se consulta SUNAT automáticamente
            </p>
          </div>

          {/* Razón Social (auto-filled) */}
          <div>
            <label className={labelCls}>
              Razón Social *
              {rucStatus === 'verified' && (
                <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 bg-green-900/30 text-green-400">
                  Auto-completado
                </span>
              )}
            </label>
            <input
              type="text"
              value={form.razonSocial}
              onChange={e => updateField('razonSocial', e.target.value)}
              placeholder="MI EMPRESA S.A.C."
              className={inputCls}
            />
          </div>

          {/* Nombre Comercial */}
          <div>
            <label className={labelCls}>Nombre Comercial</label>
            <input
              type="text"
              value={form.nombreComercial}
              onChange={e => updateField('nombreComercial', e.target.value)}
              placeholder="Nombre de marca o comercial"
              className={inputCls}
            />
          </div>

          {/* Sector */}
          <div>
            <label className={labelCls}>Sector</label>
            <select
              value={form.sector}
              onChange={e => updateField('sector', e.target.value)}
              className={inputCls}
            >
              <option value="">Seleccionar sector...</option>
              {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Tamaño */}
          <div>
            <label className={labelCls}>Tamaño de Empresa</label>
            <select
              value={form.tamano}
              onChange={e => updateField('tamano', e.target.value)}
              className={inputCls}
            >
              <option value="">Seleccionar tamaño...</option>
              {TAMANOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Régimen Laboral */}
          <div>
            <label className={labelCls}>Régimen Laboral Principal</label>
            <select
              value={form.regimenLaboral}
              onChange={e => updateField('regimenLaboral', e.target.value)}
              className={inputCls}
            >
              {REGIMENES_LABORALES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Email de alertas */}
          <div>
            <label className={labelCls}>
              <Mail className="inline w-3.5 h-3.5 mr-1" />
              Email de Alertas
            </label>
            <input
              type="email"
              value={form.alertEmail}
              onChange={e => updateField('alertEmail', e.target.value)}
              placeholder="alertas@miempresa.pe"
              className={inputCls}
            />
            <p className="text-xs text-slate-500 mt-1">
              Recibirás alertas normativas y vencimientos aquí.
            </p>
          </div>

          {/* Teléfono */}
          <div>
            <label className={labelCls}>
              <Phone className="inline w-3.5 h-3.5 mr-1" />
              Teléfono
            </label>
            <input
              type="tel"
              value={form.telefono}
              onChange={e => updateField('telefono', e.target.value)}
              placeholder="+51 1 234 5678"
              className={inputCls}
            />
          </div>

          {/* Dirección Fiscal */}
          <div className="md:col-span-2">
            <label className={labelCls}>
              <MapPin className="inline w-3.5 h-3.5 mr-1" />
              Dirección Fiscal
            </label>
            <input
              type="text"
              value={form.direccionFiscal}
              onChange={e => updateField('direccionFiscal', e.target.value)}
              placeholder="Av. Javier Prado Este 4600, Santiago de Surco"
              className={inputCls}
            />
          </div>

          {/* Departamento */}
          <div>
            <label className={labelCls}>Departamento</label>
            <select
              value={form.departamento}
              onChange={e => updateField('departamento', e.target.value)}
              className={inputCls}
            >
              <option value="">Seleccionar...</option>
              {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Provincia + Distrito */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Provincia</label>
              <input
                type="text"
                value={form.provincia}
                onChange={e => updateField('provincia', e.target.value)}
                placeholder="Provincia"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Distrito</label>
              <input
                type="text"
                value={form.distrito}
                onChange={e => updateField('distrito', e.target.value)}
                placeholder="Distrito"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================== */}
      {/* Card 2: Datos Tributarios      */}
      {/* ============================== */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>
          <FileText className="h-5 w-5 text-slate-500" />
          Datos Tributarios
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Régimen Tributario */}
          <div className="md:col-span-2">
            <label className={labelCls}>Régimen Tributario</label>
            <select
              value={form.regimenTributario}
              onChange={e => updateField('regimenTributario', e.target.value)}
              className={inputCls}
            >
              {REGIMENES_TRIBUTARIOS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Representante Legal */}
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-400" />
              Representante Legal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Nombre Completo</label>
                <input
                  type="text"
                  value={form.representante.nombre}
                  onChange={e => setForm(prev => ({ ...prev, representante: { ...prev.representante, nombre: e.target.value } }))}
                  placeholder="Nombre y apellidos del representante legal"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>DNI</label>
                <input
                  type="text"
                  value={form.representante.dni}
                  onChange={e => setForm(prev => ({ ...prev, representante: { ...prev.representante, dni: e.target.value.replace(/\D/g, '').slice(0, 8) } }))}
                  placeholder="8 dígitos"
                  maxLength={8}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className={labelCls}>Cargo</label>
                <input
                  type="text"
                  value={form.representante.cargo}
                  onChange={e => setForm(prev => ({ ...prev, representante: { ...prev.representante, cargo: e.target.value } }))}
                  placeholder="Ej. Gerente General, Apoderado"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Contador Responsable */}
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-400" />
              Contador Responsable
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Nombre Completo</label>
                <input
                  type="text"
                  value={form.contador.nombre}
                  onChange={e => setForm(prev => ({ ...prev, contador: { ...prev.contador, nombre: e.target.value } }))}
                  placeholder="Nombre del contador (opcional)"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>N° CPC</label>
                <input
                  type="text"
                  value={form.contador.cpc}
                  onChange={e => setForm(prev => ({ ...prev, contador: { ...prev.contador, cpc: e.target.value } }))}
                  placeholder="N° de matrícula CPC"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={form.contador.email}
                  onChange={e => setForm(prev => ({ ...prev, contador: { ...prev.contador, email: e.target.value } }))}
                  placeholder="contador@estudio.pe"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================== */}
      {/* Card 3: Datos Avanzados SUNAT  */}
      {/* ============================== */}
      {rucStatus === 'verified' && (
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={sectionTitleCls}>
              <Landmark className="h-5 w-5 text-slate-500" />
              Datos Avanzados SUNAT
            </h2>
            <button
              onClick={fetchSunatAdvanced}
              disabled={sunatLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              {sunatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              {sunatLoading ? 'Consultando...' : sunatData ? 'Actualizar' : 'Consultar SUNAT'}
            </button>
          </div>

          {sunatError && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-xl text-xs text-red-400 mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {sunatError}
            </div>
          )}

          {!sunatData && !sunatLoading && !sunatError && (
            <p className="text-sm text-gray-500 text-center py-6">
              Haz clic en &quot;Consultar SUNAT&quot; para obtener deuda coactiva, representantes legales, trabajadores y establecimientos.
            </p>
          )}

          {sunatData && (
            <div className="space-y-5">

              {/* Deuda Coactiva */}
              <div className="p-4 bg-[color:var(--neutral-50)] rounded-xl border border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  Deuda Coactiva
                  {sunatData.deuda && sunatData.deuda.totalItems > 0 && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full">
                      {sunatData.deuda.totalItems} deuda(s)
                    </span>
                  )}
                </h3>
                {sunatData.deuda && sunatData.deuda.totalItems > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-white/[0.06]">
                          <th className="pb-2 pr-4">Monto</th>
                          <th className="pb-2 pr-4">Periodo</th>
                          <th className="pb-2 pr-4">Fecha Cobranza</th>
                          <th className="pb-2">Entidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sunatData.deuda.items.map((d, i) => (
                          <tr key={i} className="border-b border-white/[0.04]">
                            <td className="py-2 pr-4 text-red-400 font-mono">S/ {d.monto}</td>
                            <td className="py-2 pr-4 text-[color:var(--text-secondary)]">{d.periodo}</td>
                            <td className="py-2 pr-4 text-[color:var(--text-secondary)]">{d.fechaCobranza}</td>
                            <td className="py-2 text-[color:var(--text-secondary)]">{d.entidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Sin deudas coactivas registradas
                  </div>
                )}
              </div>

              {/* Representantes Legales */}
              <div className="p-4 bg-[color:var(--neutral-50)] rounded-xl border border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  Representantes Legales
                  {sunatData.representantes && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-emerald-600 text-[10px] font-bold rounded-full">
                      {sunatData.representantes.totalRepresentantes}
                    </span>
                  )}
                </h3>
                {sunatData.representantes && sunatData.representantes.representantes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-white/[0.06]">
                          <th className="pb-2 pr-4">Documento</th>
                          <th className="pb-2 pr-4">Nombre</th>
                          <th className="pb-2 pr-4">Cargo</th>
                          <th className="pb-2">Desde</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sunatData.representantes.representantes.map((r, i) => (
                          <tr key={i} className="border-b border-white/[0.04]">
                            <td className="py-2 pr-4 text-[color:var(--text-secondary)] font-mono">{r.tipoDocumento} {r.numDocumento}</td>
                            <td className="py-2 pr-4 text-white font-medium">{r.nombre}</td>
                            <td className="py-2 pr-4 text-[color:var(--text-secondary)]">{r.cargo}</td>
                            <td className="py-2 text-[color:var(--text-secondary)]">{r.fechaDesde}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Sin representantes legales registrados</p>
                )}
              </div>

              {/* Cantidad de Trabajadores */}
              <div className="p-4 bg-[color:var(--neutral-50)] rounded-xl border border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  Trabajadores Registrados en SUNAT
                </h3>
                {sunatData.trabajadores && sunatData.trabajadores.periodos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-white/[0.06]">
                          <th className="pb-2 pr-4">Periodo</th>
                          <th className="pb-2 pr-4">Trabajadores</th>
                          <th className="pb-2 pr-4">Pensionistas</th>
                          <th className="pb-2">Prestadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sunatData.trabajadores.periodos.map((t, i) => (
                          <tr key={i} className="border-b border-white/[0.04]">
                            <td className="py-2 pr-4 text-[color:var(--text-secondary)]">{t.periodo}</td>
                            <td className="py-2 pr-4 text-white font-semibold">{t.totalTrabajadores.toLocaleString()}</td>
                            <td className="py-2 pr-4 text-[color:var(--text-secondary)]">{t.pensionistas.toLocaleString()}</td>
                            <td className="py-2 text-[color:var(--text-secondary)]">{t.prestadoresServicios.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Sin datos de trabajadores disponibles</p>
                )}
              </div>

              {/* Establecimientos */}
              <div className="p-4 bg-[color:var(--neutral-50)] rounded-xl border border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <MapPinned className="w-4 h-4 text-green-400" />
                  Establecimientos / Sucursales
                  {sunatData.establecimientos && (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full">
                      {sunatData.establecimientos.totalEstablecimientos}
                    </span>
                  )}
                </h3>
                {sunatData.establecimientos && sunatData.establecimientos.establecimientos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-white/[0.06]">
                          <th className="pb-2 pr-4">Codigo</th>
                          <th className="pb-2 pr-4">Tipo</th>
                          <th className="pb-2 pr-4">Direccion</th>
                          <th className="pb-2">Actividad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sunatData.establecimientos.establecimientos.map((e, i) => (
                          <tr key={i} className="border-b border-white/[0.04]">
                            <td className="py-2 pr-4 text-[color:var(--text-secondary)] font-mono">{e.codigo}</td>
                            <td className="py-2 pr-4 text-[color:var(--text-secondary)]">{e.descripcionTipo}</td>
                            <td className="py-2 pr-4 text-white">{e.direccion}</td>
                            <td className="py-2 text-[color:var(--text-secondary)] max-w-[200px] truncate">{e.actividadEconomica}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Sin establecimientos adicionales registrados</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================== */}
      {/* Card 4: Plan e Información     */}
      {/* ============================== */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>
          <Crown className="h-5 w-5 text-amber-500" />
          Información del Plan
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => (
            <PlanCard
              key={plan.key}
              plan={plan}
              currentPlan={currentPlan}
              workersUsed={workersUsed}
              workersLimit={plan.key === currentPlan ? workersLimit : null}
            />
          ))}
        </div>

        <div className="mt-5 flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <AlertCircle className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900">
            La gestión de pagos y cambios de plan se hace desde la sección{' '}
            <strong>Planes</strong> en el menú lateral. Para upgrades urgentes
            contacta a soporte por WhatsApp.
          </p>
        </div>
      </div>

      {/* Save Button (bottom) */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-primary/20"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  )
}
