'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Scale,
  Search,
  User,
  FileText,
  Award,
  Shield,
  ChevronRight,
  BookOpen,
  LogOut,
  BarChart3,
  Download,
  QrCode,
  Clock,
  Calendar,
  Briefcase,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  CreditCard,
  Gift,
  Umbrella,
  Info,
  Lock,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────
interface EmpleadoData {
  perfil: {
    nombres: string
    apellidos: string
    dni: string
    cargo: string
    departamento: string
    fechaIngreso: string
    regimen: string
    tipoContrato: string
    estado: string
    remuneracion: number
    asignacionFamiliar: boolean
    tipoAporte: 'AFP' | 'ONP' | null
    afpNombre: string | null
    empresa: string
  }
  documentos: {
    id: string
    nombre: string
    categoria: string
    estado: 'vigente' | 'por_vencer' | 'vencido' | 'pendiente'
    fechaEmision: string
    tieneQR?: boolean
  }[]
  capacitaciones: {
    id: string
    nombre: string
    proveedor: string
    fechaInicio: string
    fechaFin: string
    horas: number
    estado: 'completado' | 'en_progreso' | 'pendiente'
    certificado: boolean
  }[]
  vacaciones?: {
    diasCorresponden: number
    diasGozados: number
    diasPendientes: number
  }
}

// ─── Datos simulados ─────────────────────────────────────────────────
const SIMULATED_RESPONSE: EmpleadoData = {
  perfil: {
    nombres: 'María Elena',
    apellidos: 'Quispe Huamán',
    dni: '45678912',
    cargo: 'Analista de Operaciones',
    departamento: 'Operaciones',
    fechaIngreso: '2022-03-15',
    regimen: 'Régimen General (D.L. 728)',
    tipoContrato: 'Plazo Indeterminado',
    estado: 'Activo',
    remuneracion: 3800,
    asignacionFamiliar: true,
    tipoAporte: 'AFP',
    afpNombre: 'Prima AFP',
    empresa: 'Corporación Industrial del Sur S.A.C.',
  },
  documentos: [
    { id: '1', nombre: 'Contrato de Trabajo', categoria: 'Contratos', estado: 'vigente', fechaEmision: '2022-03-15' },
    { id: '2', nombre: 'Boleta de Pago - Marzo 2026', categoria: 'Boletas', estado: 'vigente', fechaEmision: '2026-03-31', tieneQR: true },
    { id: '3', nombre: 'Boleta de Pago - Febrero 2026', categoria: 'Boletas', estado: 'vigente', fechaEmision: '2026-02-28', tieneQR: true },
    { id: '4', nombre: 'Constancia de CTS', categoria: 'Beneficios', estado: 'vigente', fechaEmision: '2025-11-15', tieneQR: true },
    { id: '5', nombre: 'Certificado SCTR', categoria: 'Seguros', estado: 'por_vencer', fechaEmision: '2025-06-01', tieneQR: true },
    { id: '6', nombre: 'Reglamento Interno de Trabajo', categoria: 'Normativos', estado: 'vigente', fechaEmision: '2024-01-10' },
    { id: '7', nombre: 'Adenda Salarial', categoria: 'Contratos', estado: 'vigente', fechaEmision: '2024-07-01' },
  ],
  capacitaciones: [
    { id: '1', nombre: 'Seguridad y Salud en el Trabajo', proveedor: 'COMPLY360 Academy', fechaInicio: '2025-09-01', fechaFin: '2025-09-15', horas: 20, estado: 'completado', certificado: true },
    { id: '2', nombre: 'Prevención de Hostigamiento Sexual', proveedor: 'SUNAFIL Virtual', fechaInicio: '2025-11-10', fechaFin: '2025-11-10', horas: 4, estado: 'completado', certificado: true },
    { id: '3', nombre: 'Excel Avanzado para Operaciones', proveedor: 'Capacitación Interna', fechaInicio: '2026-02-01', fechaFin: '2026-02-28', horas: 16, estado: 'completado', certificado: false },
    { id: '4', nombre: 'Gestión de Riesgos Laborales', proveedor: 'COMPLY360 Academy', fechaInicio: '2026-04-10', fechaFin: '2026-04-30', horas: 12, estado: 'en_progreso', certificado: false },
    { id: '5', nombre: 'Ergonomía en el Trabajo', proveedor: 'MINTRA', fechaInicio: '2026-05-15', fechaFin: '2026-05-20', horas: 8, estado: 'pendiente', certificado: false },
  ],
  vacaciones: {
    diasCorresponden: 30,
    diasGozados: 15,
    diasPendientes: 15,
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────
function calcularMesesTrabajados(fechaIngreso: string): number {
  const inicio = new Date(fechaIngreso)
  const hoy = new Date()
  return (hoy.getFullYear() - inicio.getFullYear()) * 12 + (hoy.getMonth() - inicio.getMonth())
}

function calcularBeneficios(perfil: EmpleadoData['perfil'], vacaciones?: EmpleadoData['vacaciones']) {
  const meses = calcularMesesTrabajados(perfil.fechaIngreso)
  const remuneracion = perfil.remuneracion
  const asignacionFamiliar = perfil.asignacionFamiliar ? 113.00 : 0

  // CTS: remuneración computable / 12 por cada mes del semestre vigente
  const mesesSemestre = Math.min(meses % 6 || 6, 6)
  const remuneracionComputable = remuneracion + asignacionFamiliar + (remuneracion / 6)
  const ctsEstimado = (remuneracionComputable / 12) * mesesSemestre

  // Gratificación: remuneración + asignación familiar por meses del semestre / 6
  const mesesGratificacion = Math.min(meses % 6 || 6, 6)
  const gratificacionEstimada = ((remuneracion + asignacionFamiliar) / 6) * mesesGratificacion
  const bonificacionExtraordinaria = gratificacionEstimada * 0.09

  // Determinar próxima gratificación (julio o diciembre)
  const mesActual = new Date().getMonth() + 1 // 1-12
  const proximaGratificacion = mesActual <= 7 ? 'Julio 2026' : 'Diciembre 2026'

  // Vacaciones
  const diasCorresponden = vacaciones?.diasCorresponden ?? 30
  const diasGozados = vacaciones?.diasGozados ?? 0
  const diasPendientes = vacaciones?.diasPendientes ?? Math.round(((meses % 12) / 12) * 30)
  const porcentajeVacaciones = diasCorresponden > 0 ? Math.round((diasGozados / diasCorresponden) * 100) : 0

  // Progress CTS semestre (0-6 meses)
  const porcentajeCTS = Math.round((mesesSemestre / 6) * 100)
  const porcentajeGratificacion = Math.round((mesesGratificacion / 6) * 100)

  // AFP/ONP descuento
  const descuentoAFP = remuneracion * 0.10 // 10% AFP aprox
  const descuentoONP = remuneracion * 0.13 // 13% ONP

  const aniosTrabajados = Math.floor(meses / 12)
  const mesesExcedente = meses % 12

  return {
    ctsEstimado: ctsEstimado.toFixed(2),
    gratificacionEstimada: gratificacionEstimada.toFixed(2),
    bonificacionExtraordinaria: bonificacionExtraordinaria.toFixed(2),
    proximaGratificacion,
    diasCorresponden,
    diasGozados,
    diasPendientes,
    porcentajeVacaciones,
    porcentajeCTS,
    porcentajeGratificacion,
    mesesSemestre,
    aniosTrabajados,
    mesesTrabajados: meses,
    mesesExcedente,
    remuneracionComputable: remuneracionComputable.toFixed(2),
    asignacionFamiliar,
    descuentoAFP: descuentoAFP.toFixed(2),
    descuentoONP: descuentoONP.toFixed(2),
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getInitials(nombres: string, apellidos: string): string {
  const n = nombres.trim().split(' ')[0]?.[0] ?? ''
  const a = apellidos.trim().split(' ')[0]?.[0] ?? ''
  return (n + a).toUpperCase()
}

const estadoDocColor: Record<string, string> = {
  vigente: 'bg-green-100 text-green-800',
  por_vencer: 'bg-amber-100 text-amber-800',
  vencido: 'bg-red-100 text-red-800',
  pendiente: 'bg-white/[0.04] text-gray-300 bg-white/[0.04]',
}

const estadoDocLabel: Record<string, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
  pendiente: 'Pendiente',
}

const estadoCapColor: Record<string, string> = {
  completado: 'bg-green-100 text-green-800',
  en_progreso: 'bg-blue-100 text-blue-800',
  pendiente: 'bg-white/[0.04] text-gray-300 bg-white/[0.04]',
}

const estadoCapLabel: Record<string, string> = {
  completado: 'Completado',
  en_progreso: 'En progreso',
  pendiente: 'Pendiente',
}

// ─── Barra de progreso ───────────────────────────────────────────────
function ProgressBar({ value, color = 'blue' }: { value: number; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    violet: 'bg-violet-500',
    amber: 'bg-amber-500',
  }
  return (
    <div className="w-full h-2 bg-white/[0.04] bg-white/[0.04] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${colors[color] ?? colors.blue}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────
type TabKey = 'resumen' | 'beneficios' | 'documentos' | 'capacitaciones'

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'resumen', label: 'Mi Resumen', emoji: '📊' },
  { key: 'beneficios', label: 'Mis Beneficios', emoji: '💰' },
  { key: 'documentos', label: 'Mis Documentos', emoji: '📄' },
  { key: 'capacitaciones', label: 'Mis Capacitaciones', emoji: '🎓' },
]

// ─── Componente principal ────────────────────────────────────────────
export default function PortalEmpleadoPage() {
  const [dni, setDni] = useState('')
  const [companyCode, setCompanyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<EmpleadoData | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('resumen')

  // RENIEC lookup state
  const [reniecNombre, setReniecNombre] = useState('')
  const [reniecLoading, setReniecLoading] = useState(false)

  // Simulated RENIEC lookup when DNI has 8 digits
  const lookupReniec = useCallback(async (dniValue: string) => {
    if (dniValue.length !== 8) {
      setReniecNombre('')
      return
    }
    setReniecLoading(true)
    try {
      // Simulate RENIEC API delay
      await new Promise((r) => setTimeout(r, 800))
      // In production: call real RENIEC API
      if (dniValue === '00000000') {
        setReniecNombre('')
      } else {
        // Simulated names based on last digit
        const names = [
          'CARLOS ALBERTO MENDOZA RIOS',
          'ROSA ELENA FLORES GARCIA',
          'JUAN PEDRO TORRES SANCHEZ',
          'ANA MARIA QUISPE HUAMAN',
          'LUIS FERNANDO VARGAS DIAZ',
          'MARIA ELENA QUISPE HUAMAN',
          'PEDRO ANTONIO SILVA RUIZ',
          'CARMEN ROSA CASTRO LEON',
          'JOSE MANUEL RAMIREZ VEGA',
          'LUCIA BEATRIZ MORALES PINTO',
        ]
        const idx = Number(dniValue[7]) || 0
        setReniecNombre(names[idx] ?? 'NOMBRE APELLIDO VERIFICADO')
      }
    } catch {
      setReniecNombre('')
    } finally {
      setReniecLoading(false)
    }
  }, [])

  useEffect(() => {
    if (dni.length === 8) {
      lookupReniec(dni)
    } else {
      setReniecNombre('')
    }
  }, [dni, lookupReniec])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!/^\d{8}$/.test(dni)) {
      setError('El DNI debe tener exactamente 8 dígitos.')
      return
    }
    if (!companyCode.trim()) {
      setError('Ingrese el código de empresa.')
      return
    }

    setLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      if (dni === '00000000') {
        setError('No se encontró un empleado con ese DNI en la empresa indicada.')
        setData(null)
      } else {
        setData({ ...SIMULATED_RESPONSE, perfil: { ...SIMULATED_RESPONSE.perfil, dni } })
        setActiveTab('resumen')
      }
    } catch {
      setError('Error al consultar los datos. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    setData(null)
    setDni('')
    setCompanyCode('')
    setError('')
    setReniecNombre('')
    setActiveTab('resumen')
  }

  const beneficios = data ? calcularBeneficios(data.perfil, data.vacaciones) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col">

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Logo COMPLY360 */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-2 shadow-lg shadow-blue-500/25">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-black text-base text-white tracking-tight leading-none">COMPLY</span>
                <span className="font-black text-base text-blue-600 tracking-tight leading-none">360</span>
              </div>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider leading-none">
                Portal del Empleado
              </span>
            </div>
          </div>

          {/* Right side */}
          {data ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <Lock className="w-3 h-3 text-amber-600" />
                <span className="text-xs text-amber-700 font-medium">
                  Tu información es confidencial
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-white/[0.04] hover:text-red-600 transition border border-slate-200 border-white/[0.08]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Acceso seguro</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Contenido principal ──────────────────────────────────── */}
      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 py-8 sm:py-12">

        {!data ? (
          /* ── Pantalla de login ──────────────────────────────────── */
          <div className="w-full max-w-md">

            {/* Hero */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 mb-5 shadow-lg shadow-blue-100">
                <User className="w-10 h-10 text-blue-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Portal del Empleado
              </h1>
              <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
                Consulta tu información laboral, beneficios y documentos de manera segura.
              </p>
            </div>

            {/* Form card */}
            <form
              onSubmit={handleSubmit}
              className="bg-[#141824] bg-[#141824] rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 border-white/[0.08] p-6 sm:p-8 space-y-5"
            >
              {/* DNI field with RENIEC preview */}
              <div>
                <label htmlFor="dni" className="block text-sm font-semibold text-gray-300 mb-1.5">
                  DNI del trabajador
                  <span className="ml-1 font-normal text-gray-400 text-xs">(8 dígitos)</span>
                </label>
                <div className="relative">
                  <input
                    id="dni"
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="Ej: 45678912"
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className={`w-full pl-4 pr-10 py-3 rounded-xl border text-white placeholder-gray-400 bg-[#141824] bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm font-medium ${
                      reniecNombre ? 'border-emerald-400' : 'border-slate-300 border-white/10'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {reniecLoading ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : reniecNombre ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <CreditCard className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                </div>

                {/* RENIEC name preview */}
                {reniecNombre && (
                  <div className="mt-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-700">{reniecNombre}</p>
                      <p className="text-[10px] text-emerald-600/70">Verificado con RENIEC</p>
                    </div>
                  </div>
                )}

                {reniecLoading && dni.length === 8 && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2">
                    <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    <p className="text-xs text-blue-600">Verificando en RENIEC...</p>
                  </div>
                )}
              </div>

              {/* Company code */}
              <div>
                <label htmlFor="companyCode" className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Código de empresa
                </label>
                <div className="relative">
                  <input
                    id="companyCode"
                    type="text"
                    placeholder="Ej: EMP-001"
                    maxLength={20}
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-_]/g, '').slice(0, 20))}
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 border-white/10 bg-[#141824] bg-white/[0.04] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm font-medium"
                  />
                  <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition shadow-lg shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Acceder
                  </>
                )}
              </button>

              {/* Help text */}
              <div className="text-center">
                <p className="text-xs text-gray-400">
                  ¿No tienes tu código de empresa?{' '}
                  <span className="text-blue-600 font-medium">Solicítalo a tu empleador</span>
                </p>
              </div>

              {/* Security notice */}
              <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>Confidencialidad:</strong> Solo consulte sus propios datos. El acceso indebido puede generar responsabilidad legal.
                </p>
              </div>
            </form>

            {/* Footer hint */}
            <p className="text-center mt-6 text-xs text-gray-400">
              Powered by <strong className="text-gray-600">COMPLY 360</strong> · Sistema de Gestión Laboral
            </p>
          </div>

        ) : (
          /* ── Dashboard del empleado ──────────────────────────────── */
          <div className="w-full max-w-4xl">

            {/* Tarjeta de perfil / Header del empleado */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl shadow-xl shadow-blue-500/20 p-6 mb-6 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border-2 border-white/30 shadow-lg">
                  <span className="text-xl font-bold text-white">
                    {getInitials(data.perfil.nombres, data.perfil.apellidos)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-white">
                      {data.perfil.nombres} {data.perfil.apellidos}
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-400/30 text-emerald-100 border border-emerald-300/40">
                      ● {data.perfil.estado}
                    </span>
                  </div>
                  <p className="text-blue-100 text-sm font-medium">
                    {data.perfil.cargo}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-blue-200">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {data.perfil.empresa}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {data.perfil.departamento}
                    </span>
                  </div>
                </div>

                {/* Mobile logout */}
                <button
                  onClick={handleLogout}
                  className="sm:hidden self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 transition"
                >
                  <LogOut className="w-3 h-3" />
                  Salir
                </button>
              </div>
            </div>

            {/* Security reminder banner */}
            <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 font-medium">
                  Tu información es confidencial. Cierra sesión cuando termines.
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 transition shrink-0 border border-amber-200"
              >
                <LogOut className="w-3 h-3" />
                Cerrar sesión
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-[#141824] bg-[#141824] text-gray-600 hover:bg-white/[0.02] border border-slate-200 border-white/[0.08]'
                  }`}
                >
                  <span>{tab.emoji}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="bg-[#141824] bg-[#141824] rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200 border-white/[0.08] overflow-hidden">

              {/* ── MI RESUMEN ────────────────────────────────────── */}
              {activeTab === 'resumen' && beneficios && (
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-white">Mi Resumen</h3>
                  </div>

                  {/* Info cards grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                      <p className="text-xs font-medium text-blue-500 uppercase tracking-wide mb-1">Sueldo bruto</p>
                      <p className="text-lg font-bold text-blue-700">S/ {data.perfil.remuneracion.toLocaleString('es-PE')}</p>
                      <p className="text-[10px] text-blue-500/70 mt-0.5">mensual</p>
                    </div>

                    <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-white/[0.06] border-white/[0.08] rounded-xl p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Contrato</p>
                      <p className="text-sm font-bold text-gray-200 leading-snug">{data.perfil.tipoContrato}</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-4">
                      <p className="text-xs font-medium text-emerald-500 uppercase tracking-wide mb-1">Ingreso</p>
                      <p className="text-sm font-bold text-emerald-700">{formatDate(data.perfil.fechaIngreso)}</p>
                      <p className="text-[10px] text-emerald-500/70 mt-0.5">
                        {beneficios.aniosTrabajados}a {beneficios.mesesExcedente}m de servicio
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4">
                      <p className="text-xs font-medium text-violet-500 uppercase tracking-wide mb-1">Régimen</p>
                      <p className="text-xs font-bold text-violet-700 leading-snug">{data.perfil.regimen}</p>
                    </div>
                  </div>

                  {/* Asignación familiar + AFP/ONP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {/* Asignación familiar */}
                    <div className={`flex items-center gap-3 rounded-xl p-4 border ${
                      data.perfil.asignacionFamiliar
                        ? 'bg-rose-50 border-rose-100'
                        : 'bg-white/[0.02] bg-white/[0.04]/30 border-white/[0.06] border-white/[0.08]'
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        data.perfil.asignacionFamiliar
                          ? 'bg-rose-100'
                          : 'bg-white/[0.04] bg-white/[0.04]'
                      }`}>
                        <Gift className={`w-5 h-5 ${
                          data.perfil.asignacionFamiliar
                            ? 'text-rose-500'
                            : 'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${
                          data.perfil.asignacionFamiliar
                            ? 'text-rose-700'
                            : 'text-gray-500'
                        }`}>
                          Asignación Familiar
                        </p>
                        <p className={`text-xs ${
                          data.perfil.asignacionFamiliar
                            ? 'text-rose-600'
                            : 'text-gray-400'
                        }`}>
                          {data.perfil.asignacionFamiliar ? 'S/ 113.00 / mes · Activa' : 'No aplica'}
                        </p>
                      </div>
                    </div>

                    {/* AFP/ONP */}
                    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-indigo-700">
                          {data.perfil.tipoAporte ?? 'Sistema Pensionario'}
                        </p>
                        <p className="text-xs text-indigo-600">
                          {data.perfil.tipoAporte === 'AFP'
                            ? `${data.perfil.afpNombre ?? 'AFP'} · Aporte ~10%`
                            : data.perfil.tipoAporte === 'ONP'
                            ? 'ONP · Aporte 13%'
                            : 'No registrado'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Próximos eventos */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Próximos eventos
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                          <Umbrella className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-800">Vacaciones pendientes</p>
                          <p className="text-xs text-amber-600">{beneficios.diasPendientes} días disponibles por gozar</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-amber-400" />
                      </div>

                      {data.documentos.filter(d => d.estado === 'por_vencer').map(doc => (
                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-orange-800 truncate">{doc.nombre}</p>
                            <p className="text-xs text-orange-600">Certificado por vencer</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-orange-400 shrink-0" />
                        </div>
                      ))}

                      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <Gift className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-800">Próxima gratificación</p>
                          <p className="text-xs text-blue-600">{beneficios.proximaGratificacion} · Estimado: S/ {beneficios.gratificacionEstimada}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-blue-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MIS BENEFICIOS ───────────────────────────────── */}
              {activeTab === 'beneficios' && beneficios && (
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-white">Mis Beneficios</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-6 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    Estimados basados en remuneración y tiempo de servicio. Los montos finales pueden variar.
                  </p>

                  {/* CTS */}
                  <div className="mb-5 p-5 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">
                          CTS Acumulada — Semestre vigente
                        </p>
                        <p className="text-2xl font-black text-emerald-700">S/ {beneficios.ctsEstimado}</p>
                        <p className="text-xs text-emerald-600/70 mt-0.5">
                          Base: S/ {beneficios.remuneracionComputable} rem. computable · {beneficios.mesesSemestre}/6 meses
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-emerald-600 mb-1.5">
                      <span>Progreso del semestre</span>
                      <span className="font-semibold">{beneficios.porcentajeCTS}%</span>
                    </div>
                    <ProgressBar value={beneficios.porcentajeCTS} color="green" />
                    <p className="text-[10px] text-emerald-500/70 mt-1.5">
                      Se deposita en mayo y noviembre de cada año.
                    </p>
                  </div>

                  {/* Gratificación */}
                  <div className="mb-5 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-0.5">
                          Gratificación — {beneficios.proximaGratificacion}
                        </p>
                        <p className="text-2xl font-black text-blue-700">S/ {beneficios.gratificacionEstimada}</p>
                        <p className="text-xs text-blue-600/70 mt-0.5">
                          + Bonif. Extraordinaria S/ {beneficios.bonificacionExtraordinaria} (9%)
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-blue-600 mb-1.5">
                      <span>Meses acumulados del semestre</span>
                      <span className="font-semibold">{beneficios.mesesSemestre}/6</span>
                    </div>
                    <ProgressBar value={beneficios.porcentajeGratificacion} color="blue" />
                  </div>

                  {/* Vacaciones */}
                  <div className="p-5 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-0.5">
                          Vacaciones
                        </p>
                        <p className="text-2xl font-black text-violet-700">{beneficios.diasPendientes} días</p>
                        <p className="text-xs text-violet-600/70 mt-0.5">pendientes de gozar</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                        <Umbrella className="w-6 h-6 text-violet-600" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[
                        { label: 'Corresponden', value: beneficios.diasCorresponden, color: 'text-violet-700' },
                        { label: 'Gozados', value: beneficios.diasGozados, color: 'text-emerald-600' },
                        { label: 'Pendientes', value: beneficios.diasPendientes, color: 'text-amber-600' },
                      ].map(item => (
                        <div key={item.label} className="text-center bg-white/60 rounded-xl py-2.5">
                          <p className={`text-lg font-black ${item.color}`}>{item.value}</p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">{item.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-violet-600 mb-1.5">
                      <span>Días gozados del periodo</span>
                      <span className="font-semibold">{beneficios.porcentajeVacaciones}%</span>
                    </div>
                    <ProgressBar value={beneficios.porcentajeVacaciones} color="violet" />
                  </div>

                  {/* Resumen de servicio */}
                  <div className="mt-5 bg-white/[0.02] bg-white/[0.04]/40 rounded-xl p-4 border border-white/[0.06] border-white/[0.08]">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Resumen de servicio
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Tiempo de servicio', value: `${beneficios.aniosTrabajados}a ${beneficios.mesesExcedente}m` },
                        { label: 'Remuneración base', value: `S/ ${data.perfil.remuneracion.toLocaleString('es-PE')}` },
                        { label: 'Asig. familiar', value: beneficios.asignacionFamiliar > 0 ? `S/ ${beneficios.asignacionFamiliar.toFixed(2)}` : 'No aplica' },
                        { label: 'Rem. computable', value: `S/ ${beneficios.remuneracionComputable}` },
                      ].map(item => (
                        <div key={item.label}>
                          <p className="text-[10px] font-medium text-gray-400 uppercase mb-0.5">{item.label}</p>
                          <p className="text-sm font-bold text-gray-200">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── MIS DOCUMENTOS ──────────────────────────────── */}
              {activeTab === 'documentos' && (
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-6">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-white">Mis Documentos</h3>
                  </div>

                  {/* Group by category */}
                  {(['Contratos', 'Boletas', 'Beneficios', 'Seguros', 'Normativos'] as const).map((cat) => {
                    const docs = data.documentos.filter(d => d.categoria === cat)
                    if (!docs.length) return null
                    return (
                      <div key={cat} className="mb-6 last:mb-0">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5 ml-1">{cat}</h4>
                        <div className="space-y-2">
                          {docs.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 bg-white/[0.04]/40 hover:bg-slate-100 hover:bg-white/[0.04]/60 transition group border border-transparent hover:border-slate-200"
                            >
                              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{doc.nombre}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Emitido: {formatDate(doc.fechaEmision)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoDocColor[doc.estado]}`}>
                                  {estadoDocLabel[doc.estado]}
                                </span>
                                {doc.tieneQR && (
                                  <button
                                    title="Ver código QR de verificación"
                                    className="w-8 h-8 rounded-lg bg-white/[0.04] bg-white/[0.04] hover:bg-blue-100 flex items-center justify-center transition"
                                  >
                                    <QrCode className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                  </button>
                                )}
                                <button
                                  title="Descargar documento"
                                  className="w-8 h-8 rounded-lg bg-white/[0.04] bg-white/[0.04] hover:bg-blue-100 flex items-center justify-center transition"
                                >
                                  <Download className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── MIS CAPACITACIONES ──────────────────────────── */}
              {activeTab === 'capacitaciones' && (
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-bold text-white">Mis Capacitaciones</h3>
                    </div>
                    {/* Stats badge */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                        {data.capacitaciones.filter(c => c.estado === 'completado').length} completadas
                      </span>
                      <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                        {data.capacitaciones.filter(c => c.certificado).length} certificados
                      </span>
                    </div>
                  </div>

                  {/* Total hours */}
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100 rounded-xl p-4 mb-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xl font-black text-purple-700">
                        {data.capacitaciones.filter(c => c.estado === 'completado').reduce((acc, c) => acc + c.horas, 0)}h
                      </p>
                      <p className="text-xs text-purple-600">horas de capacitación completadas</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {data.capacitaciones.map((cap) => (
                      <div
                        key={cap.id}
                        className="p-4 rounded-xl bg-slate-50 bg-white/[0.04]/40 hover:bg-slate-100 hover:bg-white/[0.04]/60 transition border border-transparent hover:border-slate-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            cap.estado === 'completado'
                              ? 'bg-green-100'
                              : cap.estado === 'en_progreso'
                              ? 'bg-blue-100'
                              : 'bg-white/[0.04] bg-white/[0.04]'
                          }`}>
                            <Award className={`w-5 h-5 ${
                              cap.estado === 'completado'
                                ? 'text-green-600'
                                : cap.estado === 'en_progreso'
                                ? 'text-blue-600'
                                : 'text-gray-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{cap.nombre}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {cap.proveedor} · {cap.horas}h · {formatDate(cap.fechaInicio)}
                              {cap.fechaInicio !== cap.fechaFin && ` — ${formatDate(cap.fechaFin)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {cap.certificado && (
                              <button
                                title="Descargar certificado"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                              >
                                <Award className="w-3 h-3" />
                                Certificado
                                <Download className="w-3 h-3 ml-0.5" />
                              </button>
                            )}
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${estadoCapColor[cap.estado]}`}>
                              {estadoCapLabel[cap.estado]}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom security notice */}
            <div className="mt-5 text-center">
              <p className="text-xs text-gray-400">
                Sesión activa · Powered by{' '}
                <strong className="text-gray-600">COMPLY 360</strong>
                {' '}· Los datos mostrados son confidenciales
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white/70 backdrop-blur-sm py-4 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            <span>Powered by <strong className="text-gray-600">COMPLY 360</strong></span>
          </div>
          <span>&copy; {new Date().getFullYear()} COMPLY360. Todos los derechos reservados.</span>
        </div>
      </footer>
    </div>
  )
}
