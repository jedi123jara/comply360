'use client'

import { useState, useEffect, use, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  FileText,
  Calendar,
  Calculator,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  AlertTriangle,
  Bell,
  Clock,
  CheckCircle,
  History,
  XCircle,
  Pencil,
  Save,
  X,
  DollarSign,
  Shield,
  Eye,
  ChevronRight,
} from 'lucide-react'
import { cn, displayWorkerName, workerInitials } from '@/lib/utils'
import { DocumentUploader } from '@/components/workers/document-uploader'
import { useToast } from '@/components/ui/toast'
import { calcularCTS } from '@/lib/legal-engine/calculators/cts'
import { calcularGratificacion } from '@/lib/legal-engine/calculators/gratificacion'

interface WorkerDetail {
  id: string
  dni: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  birthDate: string | null
  gender: string | null
  nationality: string | null
  address: string | null
  position: string | null
  department: string | null
  regimenLaboral: string
  tipoContrato: string
  fechaIngreso: string
  fechaCese: string | null
  motivoCese: string | null
  sueldoBruto: number
  asignacionFamiliar: boolean
  jornadaSemanal: number
  tiempoCompleto: boolean
  tipoAporte: string
  afpNombre: string | null
  cuspp: string | null
  essaludVida: boolean
  sctr: boolean
  status: string
  legajoScore: number | null
  documents: { id: string; category: string; documentType: string; title: string; status: string; isRequired: boolean; expiresAt: string | null; fileUrl: string | null; fileSize: number | null; mimeType: string | null; verifiedAt: string | null; createdAt: string }[]
  workerContracts: { contract: { id: string; title: string; type: string; status: string; expiresAt: string | null } }[]
  vacations: { id: string; periodoInicio: string; periodoFin: string; diasCorresponden: number; diasGozados: number; diasPendientes: number; esDoble: boolean }[]
  alerts: { id: string; type: string; severity: string; title: string; description: string | null; dueDate: string | null }[]
}

const REGIMEN_LABELS: Record<string, string> = {
  GENERAL: 'Regimen General',
  MYPE_MICRO: 'MYPE Microempresa',
  MYPE_PEQUENA: 'MYPE Pequena Empresa',
  AGRARIO: 'Agrario',
  CONSTRUCCION_CIVIL: 'Construccion Civil',
  MINERO: 'Minero',
  PESQUERO: 'Pesquero',
  TEXTIL_EXPORTACION: 'Textil Exportacion',
  DOMESTICO: 'Domestico',
  CAS: 'CAS',
  MODALIDAD_FORMATIVA: 'Modalidad Formativa',
  TELETRABAJO: 'Teletrabajo',
}

const CONTRATO_LABELS: Record<string, string> = {
  INDEFINIDO: 'Plazo Indeterminado',
  PLAZO_FIJO: 'Plazo Fijo',
  TIEMPO_PARCIAL: 'Tiempo Parcial',
  INICIO_ACTIVIDAD: 'Inicio de Actividad',
  NECESIDAD_MERCADO: 'Necesidad de Mercado',
  RECONVERSION: 'Reconversion',
  SUPLENCIA: 'Suplencia',
  EMERGENCIA: 'Emergencia',
  OBRA_DETERMINADA: 'Obra Determinada',
  INTERMITENTE: 'Intermitente',
  EXPORTACION: 'Exportacion',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ON_LEAVE: 'bg-blue-100 text-blue-700',
  SUSPENDED: 'bg-amber-100 text-amber-700',
  TERMINATED: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  ON_LEAVE: 'En Licencia',
  SUSPENDED: 'Suspendido',
  TERMINATED: 'Cesado',
}

// 28 obligatory documents for legajo digital
const LEGAJO_DOCS = [
  { category: 'INGRESO', type: 'contrato_trabajo', title: 'Contrato de Trabajo', required: true },
  { category: 'INGRESO', type: 'cv', title: 'Curriculum Vitae', required: true },
  { category: 'INGRESO', type: 'dni_copia', title: 'Copia de DNI', required: true },
  { category: 'INGRESO', type: 'antecedentes_penales', title: 'Antecedentes Penales', required: false },
  { category: 'INGRESO', type: 'antecedentes_policiales', title: 'Antecedentes Policiales', required: false },
  { category: 'INGRESO', type: 'certificados_trabajo', title: 'Certificados de Trabajo Anteriores', required: false },
  { category: 'INGRESO', type: 'declaracion_jurada', title: 'Declaracion Jurada de Domicilio', required: true },
  { category: 'VIGENTE', type: 'boleta_pago', title: 'Ultima Boleta de Pago', required: true },
  { category: 'VIGENTE', type: 't_registro', title: 'Constancia T-REGISTRO', required: true },
  { category: 'VIGENTE', type: 'vacaciones_goce', title: 'Registro de Vacaciones', required: true },
  { category: 'VIGENTE', type: 'capacitacion_registro', title: 'Registro de Capacitaciones', required: true },
  { category: 'VIGENTE', type: 'evaluacion_desempeno', title: 'Evaluacion de Desempeno', required: false },
  { category: 'VIGENTE', type: 'addendum', title: 'Addendum de Contrato', required: false },
  { category: 'SST', type: 'examen_medico_ingreso', title: 'Examen Medico Ocupacional (Ingreso)', required: true },
  { category: 'SST', type: 'examen_medico_periodico', title: 'Examen Medico Periodico', required: true },
  { category: 'SST', type: 'induccion_sst', title: 'Constancia Induccion SST', required: true },
  { category: 'SST', type: 'entrega_epp', title: 'Registro Entrega de EPP', required: true },
  { category: 'SST', type: 'iperc_puesto', title: 'IPERC del Puesto', required: true },
  { category: 'SST', type: 'capacitacion_sst', title: 'Capacitaciones SST (4/año)', required: true },
  { category: 'SST', type: 'reglamento_interno', title: 'Cargo Reglamento Interno (SST)', required: true },
  { category: 'PREVISIONAL', type: 'afp_onp_afiliacion', title: 'Constancia AFP/ONP', required: true },
  { category: 'PREVISIONAL', type: 'sctr_poliza', title: 'Poliza SCTR', required: false },
  { category: 'PREVISIONAL', type: 'essalud_registro', title: 'Registro EsSalud', required: true },
  { category: 'PREVISIONAL', type: 'cts_deposito', title: 'Constancia Deposito CTS', required: true },
  { category: 'CESE', type: 'carta_renuncia', title: 'Carta de Renuncia', required: false },
  { category: 'CESE', type: 'carta_despido', title: 'Carta de Despido', required: false },
  { category: 'CESE', type: 'liquidacion_beneficios', title: 'Liquidacion de Beneficios', required: false },
  { category: 'CESE', type: 'certificado_trabajo', title: 'Certificado de Trabajo', required: false },
]

type Tab = 'info' | 'legajo' | 'contratos' | 'vacaciones' | 'beneficios' | 'alertas' | 'historial' | 'boletas'

interface PayslipRecord {
  id: string
  periodo: string
  sueldoBruto: number
  asignacionFamiliar: number | null
  bonificaciones: number | null
  totalIngresos: number
  aporteAfpOnp: number | null
  rentaQuintaCat: number | null
  totalDescuentos: number
  netoPagar: number
  essalud: number | null
  status: string
  detalleJson: Record<string, number | string | null> | null
}

interface HistoryEntry {
  id: string
  action: string
  userId: string | null
  userName: string | null
  metadata: unknown
  createdAt: string
}

function calcAntiguedad(fechaIngreso: string): string {
  const diff = Date.now() - new Date(fechaIngreso).getTime()
  const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
  const months = Math.floor((diff % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000))
  if (years > 0) return `${years} año${years > 1 ? 's' : ''}, ${months} mes${months !== 1 ? 'es' : ''}`
  return `${months} mes${months !== 1 ? 'es' : ''}`
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 bg-orange-900/30 text-orange-400',
  MEDIUM: 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400',
  LOW: 'bg-blue-100 text-blue-700 bg-blue-900/30 text-blue-400',
}

const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: 'Critico',
  HIGH: 'Alto',
  MEDIUM: 'Medio',
  LOW: 'Bajo',
}

export default function WorkerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [worker, setWorker] = useState<WorkerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('info')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [payslips, setPayslips] = useState<PayslipRecord[]>([])
  const [payslipsLoading, setPayslipsLoading] = useState(false)
  const [payslipYear, setPayslipYear] = useState<string>('')
  const [expandedPayslip, setExpandedPayslip] = useState<string | null>(null)
  const [resolvingAlert, setResolvingAlert] = useState<string | null>(null)
  const [pdfViewer, setPdfViewer] = useState<{ url: string; title: string } | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, unknown>>({})
  const { toast } = useToast()

  const loadWorker = useCallback(() => {
    fetch(`/api/workers/${id}`)
      .then(res => res.json())
      .then(d => setWorker(d.data))
      .catch(err => console.error('Worker load error:', err))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadWorker() }, [loadWorker])

  useEffect(() => {
    if (tab !== 'historial') return
    setHistoryLoading(true)
    fetch(`/api/workers/${id}/history?pageSize=30`)
      .then(res => res.json())
      .then(d => setHistory(d.data ?? []))
      .catch(err => console.error('History load error:', err))
      .finally(() => setHistoryLoading(false))
  }, [tab, id])

  useEffect(() => {
    if (tab !== 'boletas') return
    setPayslipsLoading(true)
    const url = payslipYear
      ? `/api/workers/${id}/payslips?year=${payslipYear}&limit=120`
      : `/api/workers/${id}/payslips?limit=120`
    fetch(url)
      .then(res => res.json())
      .then(d => setPayslips(d.payslips ?? []))
      .catch(err => console.error('Payslips load error:', err))
      .finally(() => setPayslipsLoading(false))
  }, [tab, id, payslipYear])

  const resolveAlert = async (alertId: string) => {
    setResolvingAlert(alertId)
    try {
      const res = await fetch('/api/workers/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      })
      if (res.ok) loadWorker() // refresh to remove resolved alert
    } catch (err) {
      console.error('Resolve alert error:', err)
    } finally {
      setResolvingAlert(null)
    }
  }

  function startEdit() {
    if (!worker) return
    setEditForm({
      firstName: worker.firstName,
      lastName: worker.lastName,
      email: worker.email ?? '',
      phone: worker.phone ?? '',
      gender: worker.gender ?? '',
      birthDate: worker.birthDate ? worker.birthDate.split('T')[0] : '',
      nationality: worker.nationality ?? '',
      address: worker.address ?? '',
      position: worker.position ?? '',
      department: worker.department ?? '',
      regimenLaboral: worker.regimenLaboral,
      tipoContrato: worker.tipoContrato,
      sueldoBruto: worker.sueldoBruto,
      asignacionFamiliar: worker.asignacionFamiliar,
      jornadaSemanal: worker.jornadaSemanal,
      tipoAporte: worker.tipoAporte,
      afpNombre: worker.afpNombre ?? '',
      cuspp: worker.cuspp ?? '',
      essaludVida: worker.essaludVida,
      sctr: worker.sctr,
    })
    setEditing(true)
  }

  async function saveWorker() {
    setSaving(true)
    try {
      const res = await fetch(`/api/workers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setWorker(data.data)
      setEditing(false)
      toast({ title: 'Datos actualizados correctamente', type: 'success' })
    } catch {
      toast({ title: 'Error al guardar los datos', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function ef(key: string) { return editForm[key] as string }
  function efb(key: string) { return editForm[key] as boolean }
  function setEf(key: string, value: unknown) { setEditForm(prev => ({ ...prev, [key]: value })) }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!worker) {
    return (
      <div className="text-center py-16">
        <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-white">Trabajador no encontrado</h2>
        <Link href="/dashboard/trabajadores" className="text-sm text-primary hover:underline mt-2 inline-block">
          Volver a la lista
        </Link>
      </div>
    )
  }

  const uploadedDocs = worker.documents.map(d => d.documentType)
  const legajoTotal = LEGAJO_DOCS.filter(d => d.required).length
  const legajoUploaded = LEGAJO_DOCS.filter(d => d.required && uploadedDocs.includes(d.type)).length
  const legajoPercent = legajoTotal > 0 ? Math.round((legajoUploaded / legajoTotal) * 100) : 0

  const criticalCount = worker.alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length

  const TABS: { key: Tab; label: string; icon: typeof User; badge?: number }[] = [
    { key: 'info',      label: 'Informacion',                       icon: User },
    { key: 'legajo',    label: `Legajo (${legajoPercent}%)`,         icon: FileText },
    { key: 'boletas',   label: 'Boletas',                           icon: DollarSign },
    { key: 'contratos', label: 'Contratos',                         icon: Briefcase },
    { key: 'vacaciones',label: 'Vacaciones',                        icon: Calendar },
    { key: 'beneficios',label: 'Beneficios',                        icon: Calculator },
    { key: 'alertas',   label: 'Alertas', badge: worker.alerts.length || undefined, icon: Bell },
    { key: 'historial', label: 'Historial',                         icon: History },
  ]

  void criticalCount // used below in alerts tab

  return (
    <div className="space-y-6">
      {/* ── HEADER CARD ── */}
      <div className="bg-[#141824] rounded-2xl border border-white/[0.08] shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-primary to-blue-700 relative">
          <Link
            href="/dashboard/trabajadores"
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-[#141824]/20 hover:bg-[#141824]/30 rounded-lg transition-colors text-white text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Trabajadores
          </Link>
          <div className="absolute top-4 right-4 flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141824]/20 hover:bg-[#141824]/30 rounded-lg transition-colors text-white text-xs font-medium"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </button>
                <button
                  onClick={saveWorker}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141824] rounded-lg transition-colors text-primary text-xs font-bold shadow-sm hover:bg-[#141824]/90 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Guardar
                </button>
              </>
            ) : (
              <>
                <Link
                  href={`/dashboard/liquidaciones?worker=${worker.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/90 hover:bg-yellow-400 rounded-lg transition-colors text-white text-xs font-bold shadow-sm"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Liquidación
                </Link>
                {worker.status === 'ACTIVE' && (
                  <Link
                    href={`/dashboard/trabajadores/${worker.id}/cese`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors text-white text-xs font-bold shadow-sm"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Proceso Cese
                  </Link>
                )}
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141824]/20 hover:bg-[#141824]/30 rounded-lg transition-colors text-white text-xs font-medium"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content below banner */}
        <div className="px-6 pb-5 -mt-12 relative">
          <div className="flex items-end gap-4 flex-wrap">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-[#141824] bg-white/[0.04] border-4 border-white border-slate-800 shadow-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-primary">
                {workerInitials(worker.firstName, worker.lastName)}
              </span>
            </div>

            {/* Name + status */}
            <div className="flex-1 min-w-0 pt-12 pb-0.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-white">
                  {displayWorkerName(worker.firstName, worker.lastName)}
                </h1>
                <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold', STATUS_COLORS[worker.status])}>
                  {STATUS_LABELS[worker.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500 text-gray-400 mt-0.5">
                {worker.position || 'Sin cargo'}
                {worker.department ? ` · ${worker.department}` : ''}
                <span className="ml-2 font-mono text-xs text-gray-400">{worker.dni}</span>
              </p>
            </div>

            {/* Legajo score circle */}
            <div className="flex flex-col items-center pb-1">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                  <circle
                    cx="18" cy="18" r="14" fill="none"
                    stroke={legajoPercent >= 80 ? '#10b981' : legajoPercent >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3.5"
                    strokeDasharray={`${(legajoPercent / 100) * 87.96} 87.96`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{legajoPercent}%</span>
                </div>
              </div>
              <span className="text-xs text-gray-500 text-gray-400 mt-0.5 font-medium">Legajo</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 bg-white/[0.02] bg-white/[0.04]/60 px-3 py-1.5 rounded-lg">
              <DollarSign className="w-3.5 h-3.5 text-green-500" />
              <span className="font-bold text-white">
                S/ {worker.sueldoBruto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.02] bg-white/[0.04]/60 px-3 py-1.5 rounded-lg">
              <Briefcase className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-gray-300 text-slate-300 text-xs font-medium">
                {REGIMEN_LABELS[worker.regimenLaboral] || worker.regimenLaboral}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.02] bg-white/[0.04]/60 px-3 py-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-gray-300 text-slate-300 text-xs font-medium">
                {calcAntiguedad(worker.fechaIngreso)}
              </span>
            </div>
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold',
              worker.asignacionFamiliar
                ? 'bg-green-50 bg-green-900/30 text-green-700 text-green-400'
                : 'bg-white/[0.02] bg-white/[0.04]/60 text-gray-500 text-gray-400'
            )}>
              <Shield className="w-3.5 h-3.5" />
              Asig. Familiar: {worker.asignacionFamiliar ? 'Sí' : 'No'}
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.02] bg-white/[0.04]/60 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-slate-300 font-medium">{worker.tipoAporte}</span>
            </div>
          </div>

          {/* Alerts inline */}
          {worker.alerts.length > 0 && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 bg-amber-900/20 border border-amber-200 border-amber-700/50 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {worker.alerts.slice(0, 3).map(a => (
                  <span key={a.id} className="text-xs text-amber-700 text-amber-400">
                    <span className={cn(
                      'inline-block w-1.5 h-1.5 rounded-full mr-1',
                      a.severity === 'CRITICAL' ? 'bg-red-500' : a.severity === 'HIGH' ? 'bg-orange-500' : 'bg-amber-400'
                    )} />
                    {a.title}
                  </span>
                ))}
                {worker.alerts.length > 3 && (
                  <button onClick={() => setTab('alertas')} className="text-xs text-amber-600 font-medium hover:underline">
                    +{worker.alerts.length - 3} más
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#141824] rounded-2xl border border-white/[0.08] shadow-sm p-1.5">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
                  tab === t.key
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-500 text-gray-400 hover:text-gray-300 hover:text-slate-200 hover:bg-white/[0.04]'
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {t.badge !== undefined && (
                  <span className={cn(
                    'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold',
                    tab === t.key ? 'bg-[#141824]/30 text-white' : 'bg-red-500 text-white'
                  )}>
                    {t.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="bg-[#141824] rounded-2xl border border-white/[0.08] shadow-sm p-6">
        {/* === INFO TAB === */}
        {tab === 'info' && (
          editing ? (
            /* ── EDIT MODE ── */
            <div className="space-y-4">

              {/* ── DATOS PERSONALES ── */}
              <div className="rounded-2xl overflow-hidden border border-blue-100 border-blue-900/40 shadow-sm">
                <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-50 to-sky-50 from-blue-900/20 to-sky-900/20 border-b border-blue-100 border-blue-900/40">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 bg-blue-900/40 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-blue-900 text-blue-200">Datos Personales</h3>
                    <p className="text-xs text-blue-400 text-blue-500">Información de identificación del trabajador</p>
                  </div>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <EditField label="Nombres" value={ef('firstName')} onChange={v => setEf('firstName', v)} icon={<User className="w-4 h-4" />} />
                  <EditField label="Apellidos" value={ef('lastName')} onChange={v => setEf('lastName', v)} icon={<User className="w-4 h-4" />} />
                  <EditField label="Email" value={ef('email')} onChange={v => setEf('email', v)} type="email" icon={<Mail className="w-4 h-4" />} />
                  <EditField label="Teléfono" value={ef('phone')} onChange={v => setEf('phone', v)} icon={<Phone className="w-4 h-4" />} />
                  <EditField label="Fecha Nacimiento" value={ef('birthDate')} onChange={v => setEf('birthDate', v)} type="date" icon={<Calendar className="w-4 h-4" />} />
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Género</label>
                    <select value={ef('gender')} onChange={e => setEf('gender', e.target.value)} className={INPUT_CLS}>
                      <option value="">—</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>
                  <EditField label="Nacionalidad" value={ef('nationality')} onChange={v => setEf('nationality', v)} icon={<MapPin className="w-4 h-4" />} />
                  <EditField label="Dirección" value={ef('address')} onChange={v => setEf('address', v)} icon={<MapPin className="w-4 h-4" />} />
                </div>
              </div>

              {/* ── DATOS LABORALES ── */}
              <div className="rounded-2xl overflow-hidden border border-emerald-100 border-emerald-900/40 shadow-sm">
                <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-emerald-50 to-green-50 from-emerald-900/20 to-green-900/20 border-b border-emerald-100 border-emerald-900/40">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 bg-emerald-900/40 flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-emerald-600 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900 text-emerald-200">Datos Laborales</h3>
                    <p className="text-xs text-emerald-400 text-emerald-500">Cargo, régimen y condiciones de trabajo</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditField label="Cargo" value={ef('position')} onChange={v => setEf('position', v)} icon={<Briefcase className="w-4 h-4" />} />
                    <EditField label="Área / Departamento" value={ef('department')} onChange={v => setEf('department', v)} icon={<MapPin className="w-4 h-4" />} />
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Régimen Laboral</label>
                      <select value={ef('regimenLaboral')} onChange={e => setEf('regimenLaboral', e.target.value)} className={INPUT_CLS}>
                        {Object.entries(REGIMEN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo Contrato</label>
                      <select value={ef('tipoContrato')} onChange={e => setEf('tipoContrato', e.target.value)} className={INPUT_CLS}>
                        {Object.entries(CONTRATO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <EditField label="Jornada Semanal (horas)" value={String(editForm.jornadaSemanal ?? '')} onChange={v => setEf('jornadaSemanal', Number(v))} type="number" icon={<Clock className="w-4 h-4" />} />
                  </div>

                  {/* Sueldo bruto destacado */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 from-emerald-900/20 to-teal-900/20 border border-emerald-200 border-emerald-800/50 rounded-xl p-4">
                    <label className="block text-xs font-bold text-emerald-700 text-emerald-400 mb-2 uppercase tracking-wider">
                      Sueldo Bruto Mensual
                    </label>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-emerald-500 text-emerald-400">S/</span>
                      <input
                        type="number"
                        value={String(editForm.sueldoBruto ?? '')}
                        onChange={e => setEf('sueldoBruto', Number(e.target.value))}
                        className="flex-1 text-3xl font-bold text-emerald-700 text-emerald-300 bg-transparent border-none outline-none placeholder-emerald-300 focus:ring-0 w-full"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-emerald-400 text-emerald-600 mt-1.5">Remuneración mensual base — excluye asignación familiar</p>
                  </div>

                  {/* Asignación familiar como card clicable */}
                  <button
                    type="button"
                    onClick={() => setEf('asignacionFamiliar', !efb('asignacionFamiliar'))}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left cursor-pointer',
                      efb('asignacionFamiliar')
                        ? 'border-green-400 bg-green-50 bg-green-900/20 border-green-700'
                        : 'border-white/[0.08] border-slate-600 bg-white/[0.02] bg-white/[0.04]/40 hover:border-emerald-200 hover:bg-emerald-50/50'
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors', efb('asignacionFamiliar') ? 'bg-green-100 bg-green-900/40' : 'bg-white/[0.04] bg-slate-600')}>
                      <Shield className={cn('w-5 h-5 transition-colors', efb('asignacionFamiliar') ? 'text-green-600 text-green-400' : 'text-gray-400')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-bold transition-colors', efb('asignacionFamiliar') ? 'text-green-800 text-green-300' : 'text-slate-300')}>
                        Asignación Familiar
                      </p>
                      <p className={cn('text-xs mt-0.5 transition-colors', efb('asignacionFamiliar') ? 'text-green-600 text-green-400' : 'text-gray-400 text-slate-500')}>
                        {efb('asignacionFamiliar') ? '✓ Percibe 10% de la RMV — S/ 113.00 adicionales al mes' : 'No percibe asignación familiar'}
                      </p>
                    </div>
                    <div className={cn('relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0', efb('asignacionFamiliar') ? 'bg-green-500' : 'bg-gray-300 bg-slate-500')}>
                      <span className={cn('inline-block h-5 w-5 transform rounded-full bg-[#141824] transition-transform shadow', efb('asignacionFamiliar') ? 'translate-x-6' : 'translate-x-1')} />
                    </div>
                  </button>
                </div>
              </div>

              {/* ── DATOS PREVISIONALES ── */}
              <div className="rounded-2xl overflow-hidden border border-purple-100 border-purple-900/40 shadow-sm">
                <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-purple-50 to-violet-50 from-purple-900/20 to-violet-900/20 border-b border-purple-100 border-purple-900/40">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 bg-purple-900/40 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-purple-600 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-purple-900 text-purple-200">Datos Previsionales</h3>
                    <p className="text-xs text-purple-400 text-purple-500">Sistema de pensiones y seguros</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Sistema Previsional</label>
                      <select value={ef('tipoAporte')} onChange={e => setEf('tipoAporte', e.target.value)} className={INPUT_CLS}>
                        <option value="AFP">AFP</option>
                        <option value="ONP">ONP</option>
                        <option value="SIN_APORTE">Sin aporte</option>
                      </select>
                    </div>
                    <EditField label="Nombre AFP" value={ef('afpNombre')} onChange={v => setEf('afpNombre', v)} icon={<Shield className="w-4 h-4" />} />
                    <EditField label="CUSPP" value={ef('cuspp')} onChange={v => setEf('cuspp', v)} icon={<FileText className="w-4 h-4" />} />
                  </div>

                  {/* SCTR + EsSalud como cards clicables */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { key: 'sctr', label: 'SCTR', desc: 'Seguro Complementario de Trabajo de Riesgo', color: 'purple' },
                      { key: 'essaludVida', label: 'EsSalud +Vida', desc: 'Seguro de vida EsSalud', color: 'blue' },
                    ] as const).map(({ key, label, desc, color }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEf(key, !efb(key))}
                        className={cn(
                          'flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left cursor-pointer',
                          efb(key)
                            ? color === 'purple'
                              ? 'border-purple-300 bg-purple-50 bg-purple-900/20 border-purple-700'
                              : 'border-blue-300 bg-blue-50 bg-blue-900/20 border-blue-700'
                            : 'border-white/[0.08] border-slate-600 hover:border-white/10'
                        )}
                      >
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                          efb(key)
                            ? color === 'purple' ? 'bg-purple-100 bg-purple-900/40' : 'bg-blue-100 bg-blue-900/40'
                            : 'bg-white/[0.04] bg-slate-600'
                        )}>
                          <Shield className={cn('w-4 h-4 transition-colors',
                            efb(key)
                              ? color === 'purple' ? 'text-purple-600 text-purple-400' : 'text-blue-600 text-blue-400'
                              : 'text-gray-400'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-semibold transition-colors',
                            efb(key)
                              ? color === 'purple' ? 'text-purple-700 text-purple-300' : 'text-blue-700 text-blue-300'
                              : 'text-gray-500 text-gray-400'
                          )}>{label}</p>
                          <p className="text-xs text-gray-400 text-slate-500 truncate">{desc}</p>
                        </div>
                        <div className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
                          efb(key)
                            ? color === 'purple' ? 'bg-purple-500' : 'bg-blue-500'
                            : 'bg-gray-300 bg-slate-500'
                        )}>
                          <span className={cn('inline-block h-4 w-4 transform rounded-full bg-[#141824] transition-transform shadow', efb(key) ? 'translate-x-6' : 'translate-x-1')} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── VIEW MODE ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Datos Personales</h3>
                <dl className="space-y-2.5">
                  <InfoRow label="DNI" value={worker.dni} />
                  <InfoRow label="Fecha Nacimiento" value={worker.birthDate ? new Date(worker.birthDate).toLocaleDateString('es-PE') : '—'} />
                  <InfoRow label="Genero" value={worker.gender === 'M' ? 'Masculino' : worker.gender === 'F' ? 'Femenino' : '—'} />
                  <InfoRow label="Nacionalidad" value={worker.nationality || '—'} />
                  {worker.email && <InfoRow label="Email" value={worker.email} icon={<Mail className="w-3.5 h-3.5" />} />}
                  {worker.phone && <InfoRow label="Telefono" value={worker.phone} icon={<Phone className="w-3.5 h-3.5" />} />}
                  {worker.address && <InfoRow label="Direccion" value={worker.address} icon={<MapPin className="w-3.5 h-3.5" />} />}
                </dl>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Datos Laborales</h3>
                <dl className="space-y-2.5">
                  <InfoRow label="Cargo" value={worker.position || '—'} />
                  <InfoRow label="Area" value={worker.department || '—'} />
                  <InfoRow label="Regimen" value={REGIMEN_LABELS[worker.regimenLaboral] || worker.regimenLaboral} />
                  <InfoRow label="Tipo Contrato" value={CONTRATO_LABELS[worker.tipoContrato] || worker.tipoContrato} />
                  <InfoRow label="Fecha Ingreso" value={new Date(worker.fechaIngreso).toLocaleDateString('es-PE')} />
                  <InfoRow label="Sueldo Bruto" value={`S/ ${worker.sueldoBruto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} />
                  <InfoRow label="Asignacion Familiar" value={worker.asignacionFamiliar ? 'Si' : 'No'} highlight={worker.asignacionFamiliar} />
                  <InfoRow label="Jornada" value={`${worker.jornadaSemanal}h / semana`} />
                </dl>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Datos Previsionales</h3>
                <dl className="space-y-2.5">
                  <InfoRow label="Sistema" value={worker.tipoAporte} />
                  {worker.afpNombre && <InfoRow label="AFP" value={worker.afpNombre} />}
                  {worker.cuspp && <InfoRow label="CUSPP" value={worker.cuspp} />}
                  <InfoRow label="EsSalud +Vida" value={worker.essaludVida ? 'Si' : 'No'} />
                  <InfoRow label="SCTR" value={worker.sctr ? 'Si' : 'No'} />
                </dl>
              </div>
            </div>
          )
        )}

        {/* === LEGAJO TAB === */}
        {tab === 'legajo' && (
          <DocumentUploader
            workerId={worker.id}
            documents={worker.documents}
            onDocumentUploaded={() => {
              fetch(`/api/workers/${id}`)
                .then(res => res.json())
                .then(d => setWorker(d.data))
                .catch(err => console.error('Worker refresh error:', err))
            }}
            onViewDocument={(url, title) => setPdfViewer({ url, title })}
          />
        )}

        {/* === CONTRATOS TAB === */}
        {tab === 'contratos' && (() => {
          const contractDocs = worker.documents.filter(d => d.documentType === 'contrato_trabajo')
          const hasContracts = worker.workerContracts.length > 0 || contractDocs.length > 0

          return (
            <div>
              {!hasContracts ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No hay contratos vinculados</p>
                  <Link
                    href={`/dashboard/contratos/nuevo?workerId=${worker.id}&workerName=${encodeURIComponent(`${worker.firstName} ${worker.lastName}`)}&dni=${worker.dni}&cargo=${encodeURIComponent(worker.position || '')}&sueldo=${Number(worker.sueldoBruto)}&regimen=${worker.regimenLaboral}&tipoContrato=${worker.tipoContrato}`}
                    className="text-sm text-primary hover:underline mt-2 inline-block"
                  >
                    Generar contrato para este trabajador
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Documentos de contrato importados (PDF) */}
                  {contractDocs.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.08] hover:border-primary/30 hover:shadow-sm transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{doc.title}</p>
                        <p className="text-xs text-gray-500">
                          {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB · ` : ''}
                          Subido {new Date(doc.createdAt).toLocaleDateString('es-PE')}
                        </p>
                      </div>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        doc.status === 'VERIFIED' ? 'bg-green-500/10 text-green-400' :
                        doc.status === 'UPLOADED' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-gray-500/10 text-gray-400'
                      )}>
                        {doc.status === 'VERIFIED' ? 'Verificado' : doc.status === 'UPLOADED' ? 'Subido' : doc.status}
                      </span>
                      {doc.fileUrl && (
                        <button
                          onClick={() => setPdfViewer({ url: doc.fileUrl!, title: doc.title })}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver PDF
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Contratos generados en el sistema */}
                  {worker.workerContracts.map(wc => (
                    <Link
                      key={wc.contract.id}
                      href={`/dashboard/contratos`}
                      className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.08] hover:border-primary/30 hover:shadow-sm transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{wc.contract.title}</p>
                        <p className="text-xs text-gray-500">{wc.contract.type.replace(/_/g, ' ')}</p>
                      </div>
                      <span className="text-xs bg-white/[0.04] text-gray-400 px-2 py-0.5 rounded-full">
                        {wc.contract.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* === VACACIONES TAB === */}
        {tab === 'vacaciones' && (
          <div>
            {worker.vacations.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No hay registros de vacaciones</p>
                <p className="text-xs text-gray-400 mt-1">Los periodos vacacionales se registraran automaticamente</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs uppercase text-gray-500">
                    <th className="text-left py-2 font-medium">Periodo</th>
                    <th className="text-left py-2 font-medium">Corresponden</th>
                    <th className="text-left py-2 font-medium">Gozados</th>
                    <th className="text-left py-2 font-medium">Pendientes</th>
                    <th className="text-left py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {worker.vacations.map(v => (
                    <tr key={v.id}>
                      <td className="py-2.5">
                        {new Date(v.periodoInicio).toLocaleDateString('es-PE')} — {new Date(v.periodoFin).toLocaleDateString('es-PE')}
                      </td>
                      <td className="py-2.5">{v.diasCorresponden} dias</td>
                      <td className="py-2.5">{v.diasGozados} dias</td>
                      <td className="py-2.5 font-semibold">{v.diasPendientes} dias</td>
                      <td className="py-2.5">
                        {v.esDoble ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Doble vacacional</span>
                        ) : v.diasPendientes > 0 ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pendiente</span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Gozado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* === BENEFICIOS TAB === */}
        {tab === 'beneficios' && (() => {
          const regimen = worker.regimenLaboral
          const sueldo = worker.sueldoBruto
          const asigFam = worker.asignacionFamiliar
          const ingreso = worker.fechaIngreso
          const now = new Date()

          // Régimen sin CTS/gratificación
          const sinCTS = regimen === 'MYPE_MICRO' || regimen === 'AGRARIO' || regimen === 'CAS' || regimen === 'MODALIDAD_FORMATIVA'
          const sinGrat = regimen === 'MYPE_MICRO' || regimen === 'AGRARIO' || regimen === 'CAS' || regimen === 'MODALIDAD_FORMATIVA'
          const ctsMitad = regimen === 'MYPE_PEQUENA'
          const gratMitad = regimen === 'MYPE_PEQUENA'

          // Próxima fecha CTS (15 mayo o 15 noviembre)
          const mes = now.getMonth() + 1
          const ctsYear = mes <= 5 ? now.getFullYear() : (mes <= 11 ? now.getFullYear() : now.getFullYear() + 1)
          const ctsMes = mes <= 5 ? 5 : (mes <= 11 ? 11 : 5)
          const ctsCorte = `${ctsYear}-${String(ctsMes).padStart(2, '0')}-15`
          const ctsLabel = ctsMes === 5 ? `Mayo ${ctsYear}` : `Noviembre ${ctsYear}`

          // Calcular CTS
          let ctsResult: import('@/lib/legal-engine/types').CTSResult | null = null
          if (!sinCTS && sueldo > 0) {
            try {
              ctsResult = calcularCTS({
                sueldoBruto: sueldo,
                fechaIngreso: ingreso,
                fechaCorte: ctsCorte,
                asignacionFamiliar: asigFam,
                ultimaGratificacion: sueldo,
              })
              if (ctsMitad && ctsResult) {
                ctsResult = { ...ctsResult, ctsTotal: ctsResult.ctsTotal * 0.5 }
              }
            } catch { /* datos insuficientes */ }
          }

          // Próxima gratificación (julio o diciembre)
          const gratPeriodo: 'julio' | 'diciembre' = mes <= 7 ? 'julio' : 'diciembre'
          const gratLabel = gratPeriodo === 'julio' ? `Julio ${now.getFullYear()}` : `Diciembre ${now.getFullYear()}`
          const gratMesesBase = gratPeriodo === 'julio' ? Math.min(mes, 6) : Math.min(mes - 6, 6)
          const ingresoDate = new Date(ingreso)
          const mesesDesdeIngreso = (now.getFullYear() - ingresoDate.getFullYear()) * 12 + (now.getMonth() - ingresoDate.getMonth())
          const gratMeses = Math.min(gratMesesBase, Math.max(0, mesesDesdeIngreso))

          let gratResult: import('@/lib/legal-engine/types').GratificacionResult | null = null
          if (!sinGrat && sueldo > 0 && gratMeses > 0) {
            try {
              gratResult = calcularGratificacion({
                sueldoBruto: sueldo,
                fechaIngreso: ingreso,
                periodo: gratPeriodo,
                mesesTrabajados: gratMeses,
                asignacionFamiliar: asigFam,
              })
              if (gratMitad && gratResult) {
                gratResult = {
                  ...gratResult,
                  gratificacionBruta: gratResult.gratificacionBruta * 0.5,
                  bonificacionExtraordinaria: gratResult.bonificacionExtraordinaria * 0.5,
                  totalNeto: gratResult.totalNeto * 0.5,
                }
              }
            } catch { /* datos insuficientes */ }
          }

          // Vacaciones pendientes
          const totalDiasPendientes = worker.vacations.reduce((sum, v) => sum + v.diasPendientes, 0)
          const valorDiaVacacion = sueldo / 30
          const valorVacPendientes = totalDiasPendientes * valorDiaVacacion

          const fmt = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

          return (
            <div>
              <p className="text-sm text-gray-400 mb-5">
                Cálculos estimados para {worker.firstName} basado en régimen {REGIMEN_LABELS[worker.regimenLaboral]} y sueldo bruto de {fmt(sueldo)}.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CTS */}
                <div className={cn(
                  'rounded-xl border p-5',
                  sinCTS ? 'border-white/[0.06] bg-white/[0.01] opacity-60' : 'border-white/[0.08] bg-[#141824]'
                )}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">CTS</p>
                      <p className="text-xs text-gray-500">Próximo depósito — {ctsLabel}</p>
                    </div>
                  </div>
                  {sinCTS ? (
                    <p className="text-xs text-amber-500">No aplica en {REGIMEN_LABELS[regimen]}</p>
                  ) : ctsResult ? (
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">{fmt(ctsResult.ctsTotal)}</p>
                      <div className="mt-2 space-y-1 text-xs text-gray-500">
                        <p>Rem. computable: {fmt(ctsResult.remuneracionComputable)}</p>
                        <p>Periodo: {ctsResult.mesesComputables}m {ctsResult.diasComputables}d</p>
                        {ctsMitad && <p className="text-amber-500">50% por régimen MYPE Pequeña</p>}
                      </div>
                      <p className="text-[10px] text-gray-600 mt-2">{ctsResult.baseLegal}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Datos insuficientes para calcular</p>
                  )}
                </div>

                {/* Gratificación */}
                <div className={cn(
                  'rounded-xl border p-5',
                  sinGrat ? 'border-white/[0.06] bg-white/[0.01] opacity-60' : 'border-white/[0.08] bg-[#141824]'
                )}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Gratificación</p>
                      <p className="text-xs text-gray-500">Próximo pago — {gratLabel}</p>
                    </div>
                  </div>
                  {sinGrat ? (
                    <p className="text-xs text-amber-500">No aplica en {REGIMEN_LABELS[regimen]}</p>
                  ) : gratResult ? (
                    <div>
                      <p className="text-2xl font-bold text-blue-400">{fmt(gratResult.totalNeto)}</p>
                      <div className="mt-2 space-y-1 text-xs text-gray-500">
                        <p>Gratificación bruta: {fmt(gratResult.gratificacionBruta)}</p>
                        <p>Bonif. extraordinaria (9%): {fmt(gratResult.bonificacionExtraordinaria)}</p>
                        <p>Meses computados: {gratMeses} de 6</p>
                        {gratMitad && <p className="text-amber-500">50% por régimen MYPE Pequeña</p>}
                      </div>
                      <p className="text-[10px] text-gray-600 mt-2">{gratResult.baseLegal}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Datos insuficientes para calcular</p>
                  )}
                </div>

                {/* Vacaciones */}
                <div className="rounded-xl border border-white/[0.08] bg-[#141824] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Vacaciones</p>
                      <p className="text-xs text-gray-500">Días pendientes de goce</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">{totalDiasPendientes} días</p>
                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                    <p>Valor monetario: {fmt(valorVacPendientes)}</p>
                    <p>Periodos registrados: {worker.vacations.length}</p>
                    {totalDiasPendientes > 30 && (
                      <p className="text-red-400 font-medium">Riesgo: acumulación mayor a 1 periodo</p>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2">D.Leg. 713 y D.S. 012-92-TR</p>
                </div>

                {/* Links a calculadoras avanzadas */}
                <div className="rounded-xl border border-white/[0.08] bg-[#141824] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Calculator className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-sm font-semibold text-white">Más cálculos</p>
                  </div>
                  <div className="space-y-2">
                    <Link href="/dashboard/calculadoras/liquidacion" className="flex items-center gap-2 text-sm text-gray-400 hover:text-primary transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" /> Liquidación completa
                    </Link>
                    <Link href="/dashboard/calculadoras/indemnizacion" className="flex items-center gap-2 text-sm text-gray-400 hover:text-primary transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" /> Indemnización por despido
                    </Link>
                    <Link href="/dashboard/calculadoras/horas-extras" className="flex items-center gap-2 text-sm text-gray-400 hover:text-primary transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" /> Horas extras
                    </Link>
                    <Link href="/dashboard/calculadoras/intereses-legales" className="flex items-center gap-2 text-sm text-gray-400 hover:text-primary transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" /> Intereses legales
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* === ALERTAS TAB === */}
        {tab === 'alertas' && (
          <div>
            {worker.alerts.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-300 text-slate-300">Sin alertas pendientes</p>
                <p className="text-xs text-gray-400 text-slate-500 mt-1">
                  Este trabajador no tiene alertas activas. Todo en regla.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 text-gray-400">
                  {worker.alerts.length} alerta{worker.alerts.length > 1 ? 's' : ''} pendiente{worker.alerts.length > 1 ? 's' : ''} — resuelve cada una para actualizar el legajo score.
                </p>
                {worker.alerts.map(a => (
                  <div
                    key={a.id}
                    className="flex items-start gap-4 p-4 rounded-xl border border-white/[0.08] bg-[#141824]/60"
                  >
                    <div className="mt-0.5">
                      <AlertTriangle className={cn('w-5 h-5', {
                        'text-red-500': a.severity === 'CRITICAL',
                        'text-orange-500': a.severity === 'HIGH',
                        'text-amber-500': a.severity === 'MEDIUM',
                        'text-blue-500': a.severity === 'LOW',
                      })} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white text-gray-200">{a.title}</p>
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', SEVERITY_COLORS[a.severity])}>
                          {SEVERITY_LABELS[a.severity]}
                        </span>
                      </div>
                      {a.description && (
                        <p className="text-xs text-gray-500 text-gray-400 mt-0.5">{a.description}</p>
                      )}
                      {a.dueDate && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-400">
                            Vence: {new Date(a.dueDate).toLocaleDateString('es-PE')}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => resolveAlert(a.id)}
                      disabled={resolvingAlert === a.id}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 text-emerald-400 border border-emerald-300 border-emerald-700 rounded-lg hover:bg-emerald-50 hover:bg-emerald-900/30 transition-colors disabled:opacity-50"
                    >
                      {resolvingAlert === a.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      Resolver
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === HISTORIAL TAB === */}
        {tab === 'historial' && (
          <div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-10">
                <History className="w-10 h-10 text-gray-300 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 text-gray-400">No hay historial registrado aun</p>
                <p className="text-xs text-gray-400 text-slate-500 mt-1">
                  Las acciones sobre este trabajador apareceran aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-white/[0.04]" />
                <div className="space-y-4">
                  {history.map((entry, idx) => {
                    const isFirst = idx === 0
                    const actionParts = entry.action.replace(/_/g, ' ').toLowerCase()
                    return (
                      <div key={entry.id} className="relative flex gap-4">
                        {/* Timeline dot */}
                        <div className={cn(
                          'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
                          isFirst
                            ? 'border-primary bg-primary/10'
                            : 'border-white/[0.08] border-slate-600 bg-[#141824]'
                        )}>
                          {isFirst ? (
                            <Clock className="w-4 h-4 text-primary" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400 text-slate-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <p className="text-sm font-medium text-white text-gray-200 capitalize">
                            {actionParts}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {entry.userName && (
                              <span className="text-xs text-gray-500 text-gray-400">
                                por {entry.userName}
                              </span>
                            )}
                            <span className="text-xs text-gray-400 text-slate-500">
                              {new Date(entry.createdAt).toLocaleString('es-PE', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: BOLETAS ── */}
        {tab === 'boletas' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Historial de Boletas de Pago</h3>
                <p className="text-xs text-gray-500 text-gray-400 mt-0.5">
                  {payslips.length} boleta{payslips.length !== 1 ? 's' : ''} registrada{payslips.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Year filter */}
                {payslips.length > 0 && (
                  <select
                    value={payslipYear}
                    onChange={e => setPayslipYear(e.target.value)}
                    className="px-3 py-2 border border-white/[0.08] border-slate-600 bg-white/[0.04] text-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="">Todos los años</option>
                    {[...new Set(payslips.map(p => p.periodo.split('-')[0]))].sort((a, b) => (b ?? '').localeCompare(a ?? '')).map(y => (
                      <option key={y} value={y ?? ''}>{y}</option>
                    ))}
                  </select>
                )}
                <Link
                  href={`/dashboard/trabajadores/${id}/registrar-boleta`}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Registrar boleta
                </Link>
              </div>
            </div>

            {payslipsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              </div>
            ) : payslips.length === 0 ? (
              <div className="text-center py-12 bg-[#141824] rounded-2xl border border-white/[0.08]">
                <DollarSign className="w-10 h-10 text-gray-200 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-300 text-gray-200 mb-1">Sin historial de pagos</p>
                <p className="text-xs text-gray-400 text-slate-500">
                  Importa el historial desde "Importar Historial" en la lista de trabajadores
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Summary row for visible records */}
                {payslips.length > 0 && (() => {
                  const avgNeto = payslips.reduce((s, p) => s + Number(p.netoPagar), 0) / payslips.length
                  const maxNeto = Math.max(...payslips.map(p => Number(p.netoPagar)))
                  return (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-blue-50 bg-blue-900/20 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-blue-700 text-blue-400">
                          S/ {avgNeto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-blue-600 text-blue-400 mt-0.5">Neto promedio</p>
                      </div>
                      <div className="bg-emerald-50 bg-emerald-900/20 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-emerald-700 text-emerald-400">
                          S/ {maxNeto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-emerald-600 text-emerald-400 mt-0.5">Neto máximo</p>
                      </div>
                      <div className="bg-white/[0.02] bg-white/[0.04]/50 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-gray-300 text-gray-200">{payslips.length}</p>
                        <p className="text-xs text-gray-500 text-gray-400 mt-0.5">Meses registrados</p>
                      </div>
                    </div>
                  )
                })()}

                {payslips.map(p => {
                  const [year, monthNum] = p.periodo.split('-')
                  const monthNames = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']
                  const monthName = monthNames[parseInt(monthNum ?? '0')] ?? monthNum
                  const isExpanded = expandedPayslip === p.id
                  const det = p.detalleJson as Record<string, number | string | null> | null
                  const hasGrati = Number(det?.gratificacion ?? 0) > 0
                  const hasBonif = Number(det?.bonificacionExtraord ?? 0) > 0

                  return (
                    <div key={p.id} className="bg-[#141824] rounded-xl border border-white/[0.08] overflow-hidden transition-all">
                      {/* Main row */}
                      <button
                        type="button"
                        onClick={() => setExpandedPayslip(isExpanded ? null : p.id)}
                        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] hover:bg-white/[0.04]/50 transition-colors text-left"
                      >
                        {/* Period badge */}
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{monthName}</span>
                          <span className="text-[11px] text-primary/70">{year}</span>
                        </div>

                        {/* Amounts */}
                        <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-400 text-slate-500">Total Ingresos</p>
                            <p className="font-semibold text-white text-slate-100">
                              S/ {Number(p.totalIngresos).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 text-slate-500">Descuentos</p>
                            <p className="font-semibold text-red-600 text-red-400">
                              - S/ {Number(p.totalDescuentos).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 text-slate-500">Neto a pagar</p>
                            <p className="font-bold text-emerald-700 text-emerald-400">
                              S/ {Number(p.netoPagar).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasGrati && (
                            <span className="text-[10px] px-2 py-0.5 bg-amber-100 bg-amber-900/30 text-amber-700 text-amber-400 rounded-full font-medium">
                              Grati
                            </span>
                          )}
                          {hasBonif && (
                            <span className="text-[10px] px-2 py-0.5 bg-purple-100 bg-purple-900/30 text-purple-700 text-purple-400 rounded-full font-medium">
                              Bonif
                            </span>
                          )}
                          <span className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-medium',
                            p.status === 'ACEPTADA' ? 'bg-green-100 bg-green-900/30 text-green-700 text-green-400' :
                            'bg-white/[0.04] bg-slate-600 text-slate-300'
                          )}>{p.status === 'ACEPTADA' ? 'Aceptada' : 'Emitida'}</span>
                          <span className="text-gray-300 text-slate-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-white/[0.06] border-white/[0.08] px-4 py-3 bg-white/[0.02] bg-white/[0.04]/30">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            {/* INGRESOS */}
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-bold text-gray-500 text-gray-400 uppercase tracking-wider mb-2">Ingresos</p>
                              <div className="flex justify-between">
                                <span className="text-gray-500 text-gray-400">Sueldo básico</span>
                                <span className="font-medium text-gray-200">
                                  S/ {Number(p.sueldoBruto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              {Number(p.asignacionFamiliar) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 text-gray-400">Asig. familiar</span>
                                  <span className="font-medium text-gray-200">
                                    S/ {Number(p.asignacionFamiliar).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              {det?.gratificacion != null && Number(det.gratificacion) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-amber-600 text-amber-400">Gratificación</span>
                                  <span className="font-medium text-amber-700 text-amber-400">
                                    S/ {Number(det.gratificacion).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              {det?.bonificacionExtraord != null && Number(det.bonificacionExtraord) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-purple-600 text-purple-400">Bonif. extraordinaria</span>
                                  <span className="font-medium text-purple-700 text-purple-400">
                                    S/ {Number(det.bonificacionExtraord).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between border-t border-white/[0.08] border-slate-600 pt-1 mt-1">
                                <span className="font-semibold text-gray-300 text-gray-200">Total ingresos</span>
                                <span className="font-bold text-white">
                                  S/ {Number(p.totalIngresos).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                            {/* DESCUENTOS */}
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-bold text-gray-500 text-gray-400 uppercase tracking-wider mb-2">Descuentos</p>
                              {det?.tipoAporte === 'ONP' && det?.descuentoONP != null && Number(det.descuentoONP) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 text-gray-400">ONP 13%</span>
                                  <span className="font-medium text-red-600 text-red-400">
                                    - S/ {Number(det.descuentoONP).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              {det?.tipoAporte === 'AFP' && (
                                <>
                                  {det?.descuentoAFP != null && Number(det.descuentoAFP) > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500 text-gray-400">AFP aporte 10%</span>
                                      <span className="font-medium text-red-600 text-red-400">
                                        - S/ {Number(det.descuentoAFP).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  )}
                                  {det?.comisionAFP != null && Number(det.comisionAFP) > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500 text-gray-400">AFP comisión</span>
                                      <span className="font-medium text-red-600 text-red-400">
                                        - S/ {Number(det.comisionAFP).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  )}
                                  {det?.seguroAFP != null && Number(det.seguroAFP) > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500 text-gray-400">AFP seguro</span>
                                      <span className="font-medium text-red-600 text-red-400">
                                        - S/ {Number(det.seguroAFP).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                              {Number(p.rentaQuintaCat) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 text-gray-400">Renta 5ta cat.</span>
                                  <span className="font-medium text-red-600 text-red-400">
                                    - S/ {Number(p.rentaQuintaCat).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between border-t border-white/[0.08] border-slate-600 pt-1 mt-1">
                                <span className="font-semibold text-gray-300 text-gray-200">Total descuentos</span>
                                <span className="font-bold text-red-700 text-red-400">
                                  - S/ {Number(p.totalDescuentos).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                            {/* NETO (full width) */}
                            <div className="col-span-2 mt-1 flex items-center justify-between px-3 py-2.5 bg-emerald-50 bg-emerald-900/20 rounded-xl border border-emerald-200 border-emerald-800">
                              <div className="flex items-center gap-3">
                                {Number(p.essalud) > 0 && (
                                  <span className="text-xs text-gray-500 text-gray-400">
                                    EsSalud: S/ {Number(p.essalud).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                                {(() => {
                                  const det = p.detalleJson as Record<string, number | string | null> | null
                                  return Number(det?.ctsDeposito ?? 0) > 0 ? (
                                    <span className="text-xs text-indigo-600 text-indigo-400 font-medium">
                                      CTS depósito: S/ {Number(det!.ctsDeposito).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : null
                                })()}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-emerald-600 text-emerald-400 font-medium">Neto a pagar</p>
                                <p className="text-xl font-bold text-emerald-700 text-emerald-300">
                                  S/ {Number(p.netoPagar).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {pdfViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#141824] rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-white/[0.12]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-semibold text-white truncate">{pdfViewer.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={pdfViewer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white border border-white/[0.08] rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  Abrir en nueva pestaña
                </a>
                <button
                  onClick={() => setPdfViewer(null)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-900">
              <iframe
                src={pdfViewer.url}
                className="w-full h-full border-0"
                title={pdfViewer.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const INPUT_CLS = 'w-full px-3 py-2.5 text-sm border border-white/[0.08] border-slate-600 bg-white/[0.04]/60 text-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-[#141824] placeholder-gray-300'
const INPUT_ICON_CLS = 'w-full pl-9 pr-3 py-2.5 text-sm border border-white/[0.08] border-slate-600 bg-white/[0.04]/60 text-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-[#141824] placeholder-gray-300'

function EditField({ label, value, onChange, type = 'text', icon }: { label: string; value: string; onChange: (v: string) => void; type?: string; icon?: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 text-gray-400 mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-slate-500 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={icon ? INPUT_ICON_CLS : INPUT_CLS}
        />
      </div>
    </div>
  )
}

function InfoRow({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-gray-400 mt-0.5">{icon}</span>}
      <dt className="text-xs text-gray-500 w-32 shrink-0">{label}</dt>
      <dd className={cn('text-sm', highlight ? 'text-green-600 font-semibold' : 'text-white')}>{value}</dd>
    </div>
  )
}

function BenefitCard({ title, description, href, regimen }: { title: string; description: string; href: string; regimen: string }) {
  const noApplies = (regimen === 'MYPE_MICRO' && (title.includes('CTS') || title.includes('Gratificacion')))
  return (
    <Link
      href={href}
      className={cn(
        'block p-4 rounded-xl border transition-all',
        noApplies
          ? 'border-white/[0.08] bg-white/[0.02] opacity-60'
          : 'border-white/[0.08] hover:border-primary/30 hover:shadow-sm'
      )}
    >
      <Calculator className="w-5 h-5 text-emerald-500 mb-2" />
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-gray-500">{description}</p>
      {noApplies && <p className="text-xs text-amber-600 mt-1">No aplica en MYPE Micro</p>}
    </Link>
  )
}
