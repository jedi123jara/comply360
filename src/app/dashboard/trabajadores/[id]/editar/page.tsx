'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  afpComisionTipo: string
  cuspp: string
  essaludVida: boolean
  sctr: boolean
  sctrRiesgoNivel: string
  // Condiciones especiales (peruanas)
  discapacidad: boolean
  discapacidadTipo: string
  tipoJornada: string
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
  afpComisionTipo: 'MIXTA',
  cuspp: '',
  essaludVida: false,
  sctr: false,
  sctrRiesgoNivel: '',
  discapacidad: false,
  discapacidadTipo: '',
  tipoJornada: 'DIURNO',
}

type Section = 'personal' | 'laboral' | 'previsional'

export default function EditarTrabajadorPage() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''

  const [form, setForm] = useState<FormData>(INITIAL)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [section, setSection] = useState<Section>('personal')
  const [loadingData, setLoadingData] = useState(true)

  // Fetch initial data
  useEffect(() => {
    if (!id) return
    let mounted = true
    fetch(`/api/workers/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar trabajador')
        return res.json()
      })
      .then(json => {
        if (!mounted) return
        const d = json.data
        if (d) {
          setForm(prev => ({
            ...prev,
            dni: d.dni || '',
            firstName: d.firstName || '',
            lastName: d.lastName || '',
            email: d.email || '',
            phone: d.phone || '',
            birthDate: d.birthDate ? d.birthDate.split('T')[0] : '',
            gender: d.gender || '',
            address: d.address || '',
            position: d.position || '',
            department: d.department || '',
            regimenLaboral: d.regimenLaboral || 'GENERAL',
            tipoContrato: d.tipoContrato || 'INDEFINIDO',
            fechaIngreso: d.fechaIngreso ? d.fechaIngreso.split('T')[0] : '',
            sueldoBruto: d.sueldoBruto ? String(d.sueldoBruto) : '',
            asignacionFamiliar: d.asignacionFamiliar || false,
            jornadaSemanal: d.jornadaSemanal ? String(d.jornadaSemanal) : '48',
            tiempoCompleto: d.tiempoCompleto ?? true,
            tipoAporte: d.tipoAporte || 'AFP',
            afpNombre: d.afpNombre || '',
            afpComisionTipo: d.afpComisionTipo || 'MIXTA',
            cuspp: d.cuspp || '',
            essaludVida: d.essaludVida || false,
            sctr: d.sctr || false,
            sctrRiesgoNivel: d.sctrRiesgoNivel || '',
            discapacidad: d.discapacidad || false,
            discapacidadTipo: d.discapacidadTipo || '',
            tipoJornada: d.tipoJornada || 'DIURNO',
          }))
        }
        setLoadingData(false)
      })
      .catch(err => {
        if (!mounted) return
        setApiError(err.message)
        setLoadingData(false)
      })
    return () => { mounted = false }
  }, [id])

  // DNI auto-lookup state
  const [dniLookupStatus, setDniLookupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [dniLookupMessage, setDniLookupMessage] = useState('')
  const dniDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lookupDni = useCallback(async (dni: string) => {
    if (!/^\d{8}$/.test(dni)) return

    setDniLookupStatus('loading')
    setDniLookupMessage('')

    try {
      // Endpoint RENIEC dedicado: cache 30 días + fallback A→B (apis.net.pe → apiperu.dev).
      const res = await fetch(`/api/integrations/reniec/consulta-dni?dni=${dni}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        // Si NO_TOKEN (provider sin configurar), avisar suave en lugar de silenciar.
        // Antes silenciábamos 100% lo que parecía un bug ("escribo DNI y no pasa nada").
        // Ahora indicamos claramente que el auto-fill no está activo, sin asustar.
        if (err.code === 'NO_TOKEN') {
          setDniLookupStatus('idle')
          setDniLookupMessage('Auto-completado de DNI no activado — escribe los datos a mano')
          return
        }
        setDniLookupStatus('error')
        // Mensajes amigables — nunca exponer "apiperu.dev HTTP 401" o similar
        // al usuario final (eso son detalles internos del provider).
        const FRIENDLY_ERRORS: Record<string, string> = {
          NOT_FOUND: 'DNI no encontrado en RENIEC',
          INVALID_DNI: 'DNI inválido (debe ser 8 dígitos)',
          RATE_LIMIT: 'Demasiadas consultas. Espera un momento.',
          NETWORK: 'No se pudo consultar RENIEC ahora. Llena los datos manualmente.',
          UNKNOWN: 'No se pudo consultar RENIEC. Llena los datos manualmente.',
        }
        setDniLookupMessage(FRIENDLY_ERRORS[err.code] ?? FRIENDLY_ERRORS.UNKNOWN)
        return
      }
      const { data, source } = (await res.json()) as {
        data?: {
          nombres: string
          apellidoPaterno: string
          apellidoMaterno: string
          fechaNacimiento?: string | null
          sexo?: 'M' | 'F' | null
        }
        source?: string
      }
      if (data?.nombres) {
        setDniLookupStatus('success')
        const apellidos = `${data.apellidoPaterno} ${data.apellidoMaterno}`.trim()
        const sourceLabel = source === 'cache' ? ' (cache)' : ''
        setDniLookupMessage(`✓ ${data.nombres} ${apellidos}${sourceLabel}`)
        // Only auto-fill empty fields (no sobreescribir si admin escribió manual)
        setForm(prev => ({
          ...prev,
          firstName: prev.firstName.trim() === '' ? data.nombres : prev.firstName,
          lastName: prev.lastName.trim() === '' ? apellidos : prev.lastName,
          birthDate:
            prev.birthDate.trim() === '' && data.fechaNacimiento
              ? data.fechaNacimiento
              : prev.birthDate,
          gender:
            prev.gender.trim() === '' && data.sexo
              ? data.sexo === 'M'
                ? 'MASCULINO'
                : 'FEMENINO'
              : prev.gender,
        }))
      } else {
        setDniLookupStatus('error')
        setDniLookupMessage('DNI no encontrado en RENIEC')
      }
    } catch {
      setDniLookupStatus('error')
      setDniLookupMessage('Error de conexión al consultar DNI')
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

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    setApiError('')

    try {
      const res = await fetch(`/api/workers/${id}`, {
        method: 'PUT',
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
        setApiError(err.error || 'Error al actualizar trabajador')
        return
      }

      router.push(`/dashboard/trabajadores/${id}`)
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
    'w-full px-3 py-2.5 border rounded-lg text-sm text-white bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary',
    errors[field] ? 'border-red-400' : 'border-white/10'
  )

  if (loadingData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/trabajadores/${id}`} className="p-2 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Editar Trabajador</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Cargando datos...</p>
          </div>
        </div>
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/trabajadores/${id}`} className="p-2 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Editar Trabajador</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Actualiza los datos del trabajador.</p>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-[color:var(--neutral-100)] p-1 rounded-xl">
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
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-[color:var(--text-secondary)]'
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
      <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm p-6">
        {section === 'personal' && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-white border-b border-white/[0.06] pb-2">Datos Personales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">DNI *</label>
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
                    dniLookupStatus === 'success' && 'text-green-600',
                    dniLookupStatus === 'error' && 'text-red-500',
                    dniLookupStatus === 'idle' && 'text-slate-500',
                  )}>
                    {dniLookupMessage}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Genero</label>
                <select value={form.gender} onChange={e => update('gender', e.target.value)} className={inputClass('gender')}>
                  <option value="">Seleccionar</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Nombres *</label>
                <input type="text" value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="Juan Carlos" className={inputClass('firstName')} />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Apellidos *</label>
                <input type="text" value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Perez Garcia" className={inputClass('lastName')} />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Fecha de Nacimiento</label>
                <input type="date" value={form.birthDate} onChange={e => update('birthDate', e.target.value)} className={inputClass('birthDate')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="trabajador@empresa.com" className={inputClass('email')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Telefono</label>
                <input type="text" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="987654321" className={inputClass('phone')} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Direccion</label>
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
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Cargo</label>
                <input type="text" value={form.position} onChange={e => update('position', e.target.value)} placeholder="Analista de RRHH" className={inputClass('position')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Area / Departamento</label>
                <input type="text" value={form.department} onChange={e => update('department', e.target.value)} placeholder="Recursos Humanos" className={inputClass('department')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Regimen Laboral *</label>
                <select value={form.regimenLaboral} onChange={e => update('regimenLaboral', e.target.value)} className={inputClass('regimenLaboral')}>
                  {REGIMENES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Tipo de Contrato *</label>
                <select value={form.tipoContrato} onChange={e => update('tipoContrato', e.target.value)} className={inputClass('tipoContrato')}>
                  {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Fecha de Ingreso *</label>
                <input type="date" value={form.fechaIngreso} onChange={e => update('fechaIngreso', e.target.value)} className={inputClass('fechaIngreso')} />
                {errors.fechaIngreso && <p className="text-xs text-red-500 mt-1">{errors.fechaIngreso}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Sueldo Bruto (S/) *</label>
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
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Jornada Semanal (horas)</label>
                <input type="number" value={form.jornadaSemanal} onChange={e => update('jornadaSemanal', e.target.value)} className={inputClass('jornadaSemanal')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">
                  Tipo de Jornada
                  <span className="ml-1 text-[10px] text-[color:var(--text-tertiary)]">(afecta cálculo horas extras)</span>
                </label>
                <select
                  value={form.tipoJornada}
                  onChange={e => update('tipoJornada', e.target.value)}
                  className={inputClass('tipoJornada')}
                >
                  <option value="DIURNO">Diurno (25% sobretasa horas extras)</option>
                  <option value="NOCTURNO">Nocturno 22:00-06:00 (35% sobretasa)</option>
                  <option value="MIXTO">Mixto (35% sobretasa parcial)</option>
                </select>
              </div>
              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.asignacionFamiliar}
                    onChange={e => update('asignacionFamiliar', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-[color:var(--text-secondary)]">Asignación Familiar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.tiempoCompleto}
                    onChange={e => update('tiempoCompleto', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-[color:var(--text-secondary)]">Tiempo Completo</span>
                </label>
              </div>
              {/* Discapacidad — Ley 29973, cuota 3% reportable a SUNAFIL */}
              <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-[color:var(--neutral-50)] p-4">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.discapacidad}
                    onChange={e => update('discapacidad', e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                  />
                  <span>
                    <span className="block text-sm font-medium text-[color:var(--text-primary)]">
                      Persona con discapacidad
                    </span>
                    <span className="block text-xs text-[color:var(--text-tertiary)] mt-0.5">
                      Ley 29973 — declarable en planilla. Empresas 50+ trabajadores cumplen cuota mínima 3%.
                    </span>
                  </span>
                </label>
                {form.discapacidad && (
                  <div className="mt-3 ml-6">
                    <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Tipo de discapacidad</label>
                    <select
                      value={form.discapacidadTipo}
                      onChange={e => update('discapacidadTipo', e.target.value)}
                      className={inputClass('discapacidadTipo')}
                    >
                      <option value="">Seleccionar</option>
                      <option value="FISICA">Física</option>
                      <option value="SENSORIAL">Sensorial (visual / auditiva)</option>
                      <option value="INTELECTUAL">Intelectual</option>
                      <option value="PSICOSOCIAL">Psicosocial</option>
                      <option value="MULTIPLE">Múltiple</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {section === 'previsional' && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-white border-b border-white/[0.06] pb-2">Datos Previsionales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Sistema de Aporte</label>
                <select value={form.tipoAporte} onChange={e => update('tipoAporte', e.target.value)} className={inputClass('tipoAporte')}>
                  <option value="AFP">AFP</option>
                  <option value="ONP">ONP</option>
                  <option value="SIN_APORTE">Sin Aporte (Formativa)</option>
                </select>
              </div>
              {form.tipoAporte === 'AFP' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">AFP</label>
                    <select value={form.afpNombre} onChange={e => update('afpNombre', e.target.value)} className={inputClass('afpNombre')}>
                      <option value="">Seleccionar</option>
                      {AFPS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">CUSPP</label>
                    <input type="text" value={form.cuspp} onChange={e => update('cuspp', e.target.value)} placeholder="123456ABCDE12" className={inputClass('cuspp')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">
                      Tipo de Comisión AFP
                    </label>
                    <select
                      value={form.afpComisionTipo}
                      onChange={e => update('afpComisionTipo', e.target.value)}
                      className={inputClass('afpComisionTipo')}
                    >
                      <option value="MIXTA">Mixta (sobre flujo + saldo)</option>
                      <option value="FLUJO">Por flujo (solo sobre remuneración)</option>
                    </select>
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
                  <span className="text-sm text-[color:var(--text-secondary)]">EsSalud +Vida</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sctr}
                    onChange={e => update('sctr', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-[color:var(--text-secondary)]">SCTR (riesgo)</span>
                </label>
              </div>
              {form.sctr && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">
                    Nivel de riesgo SCTR
                    <span className="ml-1 text-[10px] text-[color:var(--text-tertiary)]">(según tabla DS 003-98-SA)</span>
                  </label>
                  <select
                    value={form.sctrRiesgoNivel}
                    onChange={e => update('sctrRiesgoNivel', e.target.value)}
                    className={inputClass('sctrRiesgoNivel')}
                  >
                    <option value="">Seleccionar</option>
                    <option value="BAJO">Bajo (administrativo, oficinas)</option>
                    <option value="MEDIO">Medio (servicios, comercio)</option>
                    <option value="ALTO">Alto (construcción, minería, manufactura)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/trabajadores/${id}`} className="text-sm text-gray-500 hover:text-[color:var(--text-secondary)]">
          Cancelar
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-primary/20 disabled:opacity-60"
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
    </div>
  )
}
