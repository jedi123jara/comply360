'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Briefcase,
  Shield,
  Save,
  Loader2,
  AlertTriangle,
  Check,
  X,
  FileUp,
  Sparkles,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const REGIMENES = [
  { value: 'GENERAL', label: 'General (D.Leg. 728)' },
  { value: 'MYPE_MICRO', label: 'MYPE Microempresa' },
  { value: 'MYPE_PEQUENA', label: 'MYPE Pequena Empresa' },
  { value: 'AGRARIO', label: 'Agrario (Ley 31110)' },
  { value: 'CONSTRUCCION_CIVIL', label: 'Construccion Civil' },
  { value: 'MINERO', label: 'Minero' },
  { value: 'PESQUERO', label: 'Pesquero' },
  { value: 'TEXTIL_EXPORTACION', label: 'Textil Exportacion' },
  { value: 'DOMESTICO', label: 'Domestico' },
  { value: 'CAS', label: 'CAS' },
  { value: 'MODALIDAD_FORMATIVA', label: 'Modalidad Formativa' },
  { value: 'TELETRABAJO', label: 'Teletrabajo' },
]

const TIPOS_CONTRATO = [
  { value: 'INDEFINIDO', label: 'Plazo Indeterminado' },
  { value: 'PLAZO_FIJO', label: 'Plazo Fijo' },
  { value: 'TIEMPO_PARCIAL', label: 'Tiempo Parcial' },
  { value: 'INICIO_ACTIVIDAD', label: 'Inicio de Actividad' },
  { value: 'NECESIDAD_MERCADO', label: 'Necesidad de Mercado' },
  { value: 'RECONVERSION', label: 'Reconversion Empresarial' },
  { value: 'SUPLENCIA', label: 'Suplencia' },
  { value: 'EMERGENCIA', label: 'Emergencia' },
  { value: 'OBRA_DETERMINADA', label: 'Obra Determinada' },
  { value: 'INTERMITENTE', label: 'Intermitente' },
  { value: 'EXPORTACION', label: 'Exportacion No Tradicional' },
]

const AFPS = [
  'Habitat', 'Integra', 'Prima', 'Profuturo',
]

interface FormData {
  // Personal
  dni: string
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate: string
  gender: string
  address: string
  // Laboral
  position: string
  department: string
  regimenLaboral: string
  tipoContrato: string
  fechaIngreso: string
  sueldoBruto: string
  asignacionFamiliar: boolean
  jornadaSemanal: string
  tiempoCompleto: boolean
  // Previsional
  tipoAporte: string
  afpNombre: string
  cuspp: string
  essaludVida: boolean
  sctr: boolean
}

const INITIAL: FormData = {
  dni: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  gender: '',
  address: '',
  position: '',
  department: '',
  regimenLaboral: 'GENERAL',
  tipoContrato: 'INDEFINIDO',
  fechaIngreso: '',
  sueldoBruto: '',
  asignacionFamiliar: false,
  jornadaSemanal: '48',
  tiempoCompleto: true,
  tipoAporte: 'AFP',
  afpNombre: '',
  cuspp: '',
  essaludVida: false,
  sctr: false,
}

type Section = 'personal' | 'laboral' | 'previsional'

export default function NuevoTrabajadorPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(INITIAL)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [section, setSection] = useState<Section>('personal')

  // ─── Contract upload / extract state ──────────────────────────────────────
  const [showExtractModal, setShowExtractModal] = useState(false)
  const [extractFile, setExtractFile] = useState<File | null>(null)
  const [extractLoading, setExtractLoading] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [extractResult, setExtractResult] = useState<{
    confidence: number
    fieldsFound: string[]
    warnings: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // DNI auto-lookup state
  const [dniLookupStatus, setDniLookupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [dniLookupMessage, setDniLookupMessage] = useState('')
  const dniDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lookupDni = useCallback(async (dni: string) => {
    if (!/^\d{8}$/.test(dni)) return

    setDniLookupStatus('loading')
    setDniLookupMessage('')

    try {
      const res = await fetch(`/api/integrations/sunat?dni=${dni}`)
      if (!res.ok) {
        const err = await res.json()
        setDniLookupStatus('error')
        setDniLookupMessage(err.error || 'Error al consultar DNI')
        return
      }
      const { data } = await res.json()
      if (data?.nombres) {
        setDniLookupStatus('success')
        const fullName = data.nombres
        const fullLastName = data.apellidos || `${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim()
        setDniLookupMessage(`Nombre encontrado en RENIEC: ${fullName} ${fullLastName}`)
        // Only auto-fill empty fields
        setForm(prev => ({
          ...prev,
          firstName: prev.firstName.trim() === '' ? fullName : prev.firstName,
          lastName: prev.lastName.trim() === '' ? fullLastName : prev.lastName,
        }))
      } else {
        setDniLookupStatus('error')
        setDniLookupMessage('No se encontraron datos para este DNI')
      }
    } catch {
      setDniLookupStatus('error')
      setDniLookupMessage('Error de conexion al consultar DNI')
    }
  }, [])

  const update = (field: keyof FormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
    setApiError('')

    // Debounced DNI lookup
    if (field === 'dni' && typeof value === 'string') {
      if (dniDebounceRef.current) clearTimeout(dniDebounceRef.current)
      if (/^\d{8}$/.test(value)) {
        dniDebounceRef.current = setTimeout(() => lookupDni(value), 500)
      } else {
        setDniLookupStatus('idle')
        setDniLookupMessage('')
      }
    }
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (dniDebounceRef.current) clearTimeout(dniDebounceRef.current)
    }
  }, [])

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!form.dni.trim()) e.dni = 'Requerido'
    else if (!/^\d{8}$/.test(form.dni.trim())) e.dni = 'DNI debe tener 8 digitos'
    if (!form.firstName.trim()) e.firstName = 'Requerido'
    if (!form.lastName.trim()) e.lastName = 'Requerido'
    if (!form.fechaIngreso) e.fechaIngreso = 'Requerido'
    if (!form.sueldoBruto.trim()) e.sueldoBruto = 'Requerido'
    else if (isNaN(Number(form.sueldoBruto)) || Number(form.sueldoBruto) <= 0) e.sueldoBruto = 'Monto invalido'
    setErrors(e)

    // Navigate to the section with the first error
    if (Object.keys(e).length > 0) {
      const personalFields: (keyof FormData)[] = ['dni', 'firstName', 'lastName']
      const laboralFields: (keyof FormData)[] = ['fechaIngreso', 'sueldoBruto']
      const firstError = Object.keys(e)[0] as keyof FormData
      if (personalFields.includes(firstError)) setSection('personal')
      else if (laboralFields.includes(firstError)) setSection('laboral')
    }

    return Object.keys(e).length === 0
  }

  const handleExtractFromContract = async () => {
    if (!extractFile) return
    setExtractLoading(true)
    setExtractError(null)
    setExtractResult(null)

    try {
      const fd = new FormData()
      fd.append('file', extractFile)

      const res = await fetch('/api/workers/extract-from-contract', {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()

      if (!res.ok) {
        setExtractError(json.error || 'Error al procesar el archivo')
        return
      }

      const d = json.data
      // Pre-fill form with extracted data (only non-empty values)
      setForm(prev => ({
        ...prev,
        ...(d.dni       ? { dni:       d.dni }       : {}),
        ...(d.firstName ? { firstName: d.firstName } : {}),
        ...(d.lastName  ? { lastName:  d.lastName }  : {}),
        ...(d.email     ? { email:     d.email }      : {}),
        ...(d.phone     ? { phone:     d.phone }      : {}),
        ...(d.birthDate ? { birthDate: d.birthDate }  : {}),
        ...(d.gender    ? { gender:    d.gender }     : {}),
        ...(d.address   ? { address:   d.address }    : {}),
        ...(d.position      ? { position:      d.position }                        : {}),
        ...(d.department    ? { department:    d.department }                      : {}),
        ...(d.regimenLaboral ? { regimenLaboral: d.regimenLaboral }               : {}),
        ...(d.tipoContrato  ? { tipoContrato:  d.tipoContrato }                   : {}),
        ...(d.fechaIngreso  ? { fechaIngreso:  d.fechaIngreso }                   : {}),
        ...(d.sueldoBruto   ? { sueldoBruto:   String(d.sueldoBruto) }            : {}),
        ...(d.jornadaSemanal ? { jornadaSemanal: String(d.jornadaSemanal) }        : {}),
        ...(typeof d.asignacionFamiliar === 'boolean' ? { asignacionFamiliar: d.asignacionFamiliar } : {}),
        ...(d.tipoAporte    ? { tipoAporte:    d.tipoAporte }                     : {}),
        ...(d.afpNombre     ? { afpNombre:     d.afpNombre }                      : {}),
      }))

      setExtractResult({
        confidence: d.confidence ?? 0,
        fieldsFound: d.fieldsFound ?? [],
        warnings: d.warnings ?? [],
      })

      // If DNI was extracted, trigger lookup
      if (d.dni && /^\d{8}$/.test(d.dni)) {
        lookupDni(d.dni)
      }

      // Auto-cerrar el modal tras 2.2 segundos y hacer scroll al form
      // (da tiempo a que el usuario vea el banner con la confianza)
      setTimeout(() => {
        setShowExtractModal(false)
        // Smooth scroll al tope del form
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        })
      }, 2200)
    } catch {
      setExtractError('Error de conexión. Verifica que el servidor esté activo.')
    } finally {
      setExtractLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    setApiError('')

    try {
      const res = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          sueldoBruto: Number(form.sueldoBruto),
          jornadaSemanal: Number(form.jornadaSemanal),
          birthDate: form.birthDate || null,
          afpNombre: form.tipoAporte === 'AFP' ? form.afpNombre : null,
          cuspp: form.tipoAporte === 'AFP' ? form.cuspp : null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setApiError(err.error || 'Error al crear trabajador')
        return
      }

      const { data } = await res.json()
      router.push(`/dashboard/trabajadores/${data.id}`)
    } catch {
      setApiError('Error de conexion. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const SECTIONS: { key: Section; label: string; icon: typeof User }[] = [
    { key: 'personal', label: 'Datos Personales', icon: User },
    { key: 'laboral', label: 'Datos Laborales', icon: Briefcase },
    { key: 'previsional', label: 'Datos Previsionales', icon: Shield },
  ]

  const inputClass = (field: keyof FormData) => cn(
    'w-full px-3 py-2.5 border rounded-lg text-sm text-white bg-[#141824] placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary',
    errors[field] ? 'border-red-400' : 'border-white/10'
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/trabajadores" className="p-2 hover:bg-white/[0.04] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Nuevo Trabajador</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Registra los datos del trabajador para gestionar su compliance.</p>
          </div>
        </div>
        {/* Upload contract buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowExtractModal(true); setExtractFile(null); setExtractError(null); setExtractResult(null) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 hover:border-primary transition-all"
          >
            <FileUp className="w-4 h-4" />
            Cargar 1 contrato
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary text-white rounded-full ml-1">IA</span>
          </button>
          <a
            href="/dashboard/trabajadores/importar-pdf"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-amber-500/50 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 hover:border-amber-600 transition-all"
          >
            <FileUp className="w-4 h-4" />
            PDF con varios contratos
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-600 text-white rounded-full ml-1">NUEVO</span>
          </a>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-white/[0.04] p-1 rounded-xl">
        {SECTIONS.map(s => {
          const Icon = s.icon
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                section === s.key
                  ? 'bg-[#141824] text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          )
        })}
      </div>

      {/* API error */}
      {apiError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {apiError}
        </div>
      )}

      {/* Form sections */}
      <div className="bg-[#141824] rounded-2xl border border-white/[0.08] shadow-sm p-6">
        {section === 'personal' && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-white border-b border-white/[0.06] pb-2">Datos Personales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">DNI *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.dni}
                    onChange={e => update('dni', e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="12345678"
                    maxLength={8}
                    className={cn(
                      inputClass('dni'),
                      'pr-9',
                      dniLookupStatus === 'success' && 'border-green-400 focus:border-green-500 focus:ring-green-200',
                      dniLookupStatus === 'error' && 'border-red-400 focus:border-red-500 focus:ring-red-200'
                    )}
                  />
                  {dniLookupStatus === 'loading' && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                  )}
                  {dniLookupStatus === 'success' && (
                    <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                  {dniLookupStatus === 'error' && (
                    <X className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                  )}
                </div>
                {errors.dni && <p className="text-xs text-red-500 mt-1">{errors.dni}</p>}
                {dniLookupMessage && (
                  <p className={cn(
                    'text-xs mt-1',
                    dniLookupStatus === 'success' ? 'text-green-600' : 'text-red-500'
                  )}>
                    {dniLookupMessage}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Genero</label>
                <select value={form.gender} onChange={e => update('gender', e.target.value)} className={inputClass('gender')}>
                  <option value="">Seleccionar</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Nombres *</label>
                <input type="text" value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="Juan Carlos" className={inputClass('firstName')} />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Apellidos *</label>
                <input type="text" value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Perez Garcia" className={inputClass('lastName')} />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Fecha de Nacimiento</label>
                <input type="date" value={form.birthDate} onChange={e => update('birthDate', e.target.value)} className={inputClass('birthDate')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="trabajador@empresa.com" className={inputClass('email')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Telefono</label>
                <input type="text" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="987654321" className={inputClass('phone')} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Direccion</label>
                <input type="text" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Av. Principal 123, Lima" className={inputClass('address')} />
              </div>
            </div>
          </div>
        )}

        {section === 'laboral' && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-white border-b border-white/[0.06] pb-2">Datos Laborales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Cargo</label>
                <input type="text" value={form.position} onChange={e => update('position', e.target.value)} placeholder="Analista de RRHH" className={inputClass('position')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Area / Departamento</label>
                <input type="text" value={form.department} onChange={e => update('department', e.target.value)} placeholder="Recursos Humanos" className={inputClass('department')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Regimen Laboral *</label>
                <select value={form.regimenLaboral} onChange={e => update('regimenLaboral', e.target.value)} className={inputClass('regimenLaboral')}>
                  {REGIMENES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Tipo de Contrato *</label>
                <select value={form.tipoContrato} onChange={e => update('tipoContrato', e.target.value)} className={inputClass('tipoContrato')}>
                  {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Fecha de Ingreso *</label>
                <input type="date" value={form.fechaIngreso} onChange={e => update('fechaIngreso', e.target.value)} className={inputClass('fechaIngreso')} />
                {errors.fechaIngreso && <p className="text-xs text-red-500 mt-1">{errors.fechaIngreso}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Sueldo Bruto (S/) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.sueldoBruto}
                  onChange={e => update('sueldoBruto', e.target.value)}
                  placeholder="1130.00"
                  className={inputClass('sueldoBruto')}
                />
                {errors.sueldoBruto && <p className="text-xs text-red-500 mt-1">{errors.sueldoBruto}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Jornada Semanal (horas)</label>
                <input type="number" value={form.jornadaSemanal} onChange={e => update('jornadaSemanal', e.target.value)} className={inputClass('jornadaSemanal')} />
              </div>
              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.asignacionFamiliar}
                    onChange={e => update('asignacionFamiliar', e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-gray-300">Asignacion Familiar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.tiempoCompleto}
                    onChange={e => update('tiempoCompleto', e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-gray-300">Tiempo Completo</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {section === 'previsional' && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-white border-b border-white/[0.06] pb-2">Datos Previsionales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Sistema de Aporte</label>
                <select value={form.tipoAporte} onChange={e => update('tipoAporte', e.target.value)} className={inputClass('tipoAporte')}>
                  <option value="AFP">AFP</option>
                  <option value="ONP">ONP</option>
                  <option value="SIN_APORTE">Sin Aporte (Formativa)</option>
                </select>
              </div>
              {form.tipoAporte === 'AFP' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">AFP</label>
                    <select value={form.afpNombre} onChange={e => update('afpNombre', e.target.value)} className={inputClass('afpNombre')}>
                      <option value="">Seleccionar</option>
                      {AFPS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">CUSPP</label>
                    <input type="text" value={form.cuspp} onChange={e => update('cuspp', e.target.value)} placeholder="123456ABCDE12" className={inputClass('cuspp')} />
                  </div>
                </>
              )}
              <div className="sm:col-span-2 flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.essaludVida}
                    onChange={e => update('essaludVida', e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-gray-300">EsSalud +Vida</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sctr}
                    onChange={e => update('sctr', e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-gray-300">SCTR</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/trabajadores" className="text-sm text-gray-500 hover:text-gray-300">
          Cancelar
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#1e3a6e] hover:bg-[#162d57] text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-primary/20 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar Trabajador
            </>
          )}
        </button>
      </div>
      {/* ─── Extract from contract modal ─────────────────────────────────── */}
      {showExtractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#141824] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Extraer datos desde contrato</h2>
                  <p className="text-xs text-gray-500">La IA lee el contrato y pre-rellena el formulario</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExtractModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.04] hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Success result */}
              {extractResult ? (
                <div className="space-y-4">
                  {/* Confidence meter */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-emerald-800">Datos extraídos</span>
                      <span className={`text-sm font-bold ${extractResult.confidence >= 70 ? 'text-emerald-700' : extractResult.confidence >= 40 ? 'text-amber-700' : 'text-red-700'}`}>
                        {extractResult.confidence}% confianza
                      </span>
                    </div>
                    <div className="h-2 bg-emerald-100 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all ${extractResult.confidence >= 70 ? 'bg-emerald-500' : extractResult.confidence >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${extractResult.confidence}%` }}
                      />
                    </div>
                    <p className="text-xs text-emerald-700">
                      <strong>Campos encontrados ({extractResult.fieldsFound.length}):</strong>{' '}
                      {extractResult.fieldsFound.join(', ')}
                    </p>
                  </div>

                  {/* Warnings */}
                  {extractResult.warnings.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-semibold text-amber-800">Campos por completar manualmente</span>
                      </div>
                      <ul className="space-y-1">
                        {extractResult.warnings.map((w, i) => (
                          <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                            <span>•</span><span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setExtractResult(null); setExtractFile(null) }}
                      className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/[0.02]"
                    >
                      Subir otro
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExtractModal(false)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90"
                    >
                      <Check className="h-4 w-4" />
                      Revisar formulario
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* File drop zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all ${
                      extractFile
                        ? 'border-primary bg-primary/5'
                        : 'border-white/10 hover:border-primary/50 hover:bg-white/[0.02]'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) { setExtractFile(f); setExtractError(null) }
                      }}
                    />
                    {extractFile ? (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                          <FileText className="h-7 w-7 text-primary" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-white">{extractFile.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{(extractFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setExtractFile(null) }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Cambiar archivo
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
                          <FileUp className="h-7 w-7 text-gray-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-gray-300">Arrastra o haz clic para subir</p>
                          <p className="text-xs text-gray-400 mt-1">PDF o DOCX — máx. 10MB</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* How it works */}
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                    <p className="text-xs font-semibold text-blue-800 mb-1.5">¿Cómo funciona?</p>
                    <ol className="space-y-1">
                      {[
                        'Sube el contrato laboral del trabajador (PDF o DOCX)',
                        'La IA lee el documento y extrae DNI, nombre, cargo, sueldo y más',
                        'Los campos del formulario se pre-rellenan automáticamente',
                        'Revisa, completa lo que falte y guarda',
                      ].map((step, i) => (
                        <li key={i} className="text-xs text-blue-700 flex items-start gap-2">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-200 text-blue-700 text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {extractError && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      {extractError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleExtractFromContract}
                    disabled={!extractFile || extractLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {extractLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analizando contrato con IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Extraer datos con IA
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
