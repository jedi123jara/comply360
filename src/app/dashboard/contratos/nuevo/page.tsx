'use client'

import { useCallback, useEffect, useMemo, useRef, Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText,
  Users,
  Briefcase,
  Shield,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Download,
  Loader2,
  Save,
  Wand2,
  ScrollText,
  History,
  Eye,
  ShieldCheck,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { CONTRACT_TEMPLATES, type ContractTemplateDefinition, type TemplateField } from '@/lib/legal-engine/contracts/templates'
import { RegimeBadge } from '@/components/contracts/regime-badge'
import { useCloudDraft } from '@/hooks/use-cloud-draft'
import { useCostEmployer } from '@/hooks/use-cost-employer'
import { CostSummaryPill } from '@/components/contracts/cost-summary-pill'
import { WorkerPicker, type WorkerSummary } from '@/components/contracts/worker-picker'
import { useLiveValidation, type ContractQualityResult } from '@/hooks/use-live-validation'
import { LiveValidationPanel } from '@/components/contracts/live-validation-panel'
import { ContractPreview } from '@/components/contracts/contract-preview'
import { PremiumContractPreview } from '@/components/contracts/premium-contract-preview'
import { buildPremiumContractDocument } from '@/lib/contracts/premium-library'
import { AiStep } from './_components/ai-modal'

// ─── Types for AI generated contract (mirror of contract-generator.ts) ──────
interface AIContractClause {
  numero: number
  titulo: string
  contenido: string
  obligatoria: boolean
  baseLegal?: string
}

interface AIGeneratedContract {
  generadoPor: 'ai' | 'simulated'
  modelo: string
  generadoAt: string
  tipoDetectado: string
  tituloContrato: string
  resumen: string
  preambulo?: string
  clausulas: AIContractClause[]
  textoCompleto: string
  htmlCompleto: string
  advertenciasLegales: string[]
  baseLegalPrincipal: string
  anexos?: string[]
}

const TEMPLATE_OPTIONS = [
  {
    id: '__ai_generate__',
    name: 'Generar con IA',
    description: 'Describe lo que necesitas y la IA genera un contrato personalizado',
    icon: Wand2,
    badge: 'Nuevo',
    badgeColor: 'bg-purple-100 text-purple-700',
    available: true,
    isAi: true,
  },
  {
    id: 'laboral-indefinido',
    name: 'Plazo Indeterminado',
    description: 'Contrato laboral estándar sin fecha de vencimiento',
    icon: Users,
    badge: 'Más usado',
    badgeColor: 'bg-amber-100 text-amber-700',
    available: true,
  },
  {
    id: 'laboral-plazo-fijo',
    name: 'Plazo Fijo (Modalidad)',
    description: 'Contrato temporal con causa objetiva obligatoria',
    icon: Briefcase,
    available: true,
  },
  {
    id: 'locacion-servicios',
    name: 'Locación de Servicios',
    description: 'Prestación de servicios independiente (Código Civil)',
    icon: FileText,
    available: true,
  },
  {
    id: 'confidencialidad',
    name: 'Confidencialidad (NDA)',
    description: 'Acuerdo de no divulgación de información',
    icon: Shield,
    available: false,
  },
]

type Step = 'select' | 'form' | 'preview' | 'review' | 'ai-generate'

/** Resumen de una plantilla propia (subset del payload de /api/org-templates) */
interface OrgTemplateSummary {
  id: string
  title: string
  documentType: string
  documentTypeLabel: string
  contractType: string | null
  placeholderCount: number
  mappingCount: number
  usageCount: number
}

/**
 * Shape del borrador local (autosave a localStorage).
 * Todo lo necesario para reconstruir la sesion del usuario sin tocar la BD.
 */
interface ContractWizardDraft {
  step: Step
  selectedTemplateId: string | null
  currentSection: number
  formData: Record<string, string | number | boolean>
  // Modal IA
  aiDescription: string
  aiShownOnce: boolean
  // Empleador (espejos del formData para restaurar inputs controlados)
  empRuc: string
  empRazonSocial: string
  empRepresentante: string
  empDireccion: string
  // Trabajador
  trabDni: string
  trabNombre: string
  // Tipo de contrato
  modalidad: string
  causaObjetiva: string
  fechaInicio: string
  fechaFin: string
  periodoPrueba: string
  // Condiciones
  cargo: string
  jornada: string
  horario: string
  remuneracion: string
  formaPago: string
  beneficios: string
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'hace un momento'
  if (diffMin < 60) return `hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} ${diffH === 1 ? 'hora' : 'horas'}`
  const diffD = Math.floor(diffH / 24)
  return `hace ${diffD} ${diffD === 1 ? 'dia' : 'dias'}`
}

function exportErrorDescription(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'El exportador no devolvió un detalle legible.'
  }
  const data = payload as {
    error?: unknown
    code?: unknown
    details?: { unresolvedPlaceholders?: unknown }
    quality?: ContractQualityResult
  }
  if (data.code === 'DOCUMENT_QUALITY_BLOCKED' && data.quality) {
    return data.quality.blockers[0]?.message
      ?? `El contrato no pasa calidad legal (${data.quality.score}/100).`
  }
  const unresolved = Array.isArray(data.details?.unresolvedPlaceholders)
    ? data.details.unresolvedPlaceholders.filter((item): item is string => typeof item === 'string')
    : []
  if (data.code === 'UNRESOLVED_PLACEHOLDERS' && unresolved.length > 0) {
    return `Completa estos campos antes de exportar: ${unresolved.join(', ')}.`
  }
  return typeof data.error === 'string'
    ? data.error
    : 'El contrato todavía no está listo para exportarse.'
}

function fileNameFromDisposition(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="?([^";]+)"?/i)
  return match?.[1] ?? fallback
}

const QUALITY_LABELS: Record<ContractQualityResult['status'], { label: string; tone: string }> = {
  DRAFT_INCOMPLETE: { label: 'Borrador incompleto', tone: 'border-red-200 bg-red-50 text-red-800' },
  READY_FOR_REVIEW: { label: 'Listo para revisión', tone: 'border-blue-200 bg-blue-50 text-blue-800' },
  LEGAL_REVIEW_REQUIRED: { label: 'Revisión legal requerida', tone: 'border-amber-200 bg-amber-50 text-amber-800' },
  READY_FOR_SIGNATURE: { label: 'Listo para documento oficial', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  BLOCKED: { label: 'Bloqueado', tone: 'border-red-200 bg-red-50 text-red-800' },
}

function PremiumQualityPanel({ quality }: { quality: ContractQualityResult | null }) {
  if (!quality) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-2 text-slate-600">
          <ShieldCheck className="h-4 w-4 mt-0.5" aria-hidden="true" />
          <p className="text-xs">El control premium aparecerá al completar datos esenciales.</p>
        </div>
      </div>
    )
  }

  const cfg = QUALITY_LABELS[quality.status]
  const covered = quality.legalCoverage.filter(item => item.required && item.covered).length
  const required = quality.legalCoverage.filter(item => item.required).length

  return (
    <section className={`rounded-2xl border p-4 ${cfg.tone}`} aria-label="Control premium del contrato">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide">Documento oficial</p>
            <p className="text-sm font-semibold">{cfg.label} · {quality.score}/100</p>
          </div>
        </div>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold">
          {covered}/{required} cláusulas
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/70 p-2">
          <p className="text-[10px] font-semibold uppercase">Blockers</p>
          <p className="text-lg font-bold">{quality.blockers.length}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2">
          <p className="text-[10px] font-semibold uppercase">Anexos</p>
          <p className="text-lg font-bold">{quality.missingAnnexes.length}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2">
          <p className="text-[10px] font-semibold uppercase">Datos</p>
          <p className="text-lg font-bold">{quality.missingInputs.length}</p>
        </div>
      </div>

      {quality.blockers.length > 0 && (
        <div className="mt-3 space-y-2">
          {quality.blockers.slice(0, 3).map((blocker, index) => (
            <div key={`${blocker.code}-${index}`} className="rounded-xl bg-white/80 p-2">
              <p className="text-xs font-semibold">{blocker.title}</p>
              <p className="mt-0.5 text-[11px] opacity-80">{blocker.message}</p>
            </div>
          ))}
        </div>
      )}

      {quality.missingAnnexes.length > 0 && (
        <p className="mt-3 text-[11px] font-medium">
          Anexos pendientes: {quality.missingAnnexes.slice(0, 3).join(', ')}
          {quality.missingAnnexes.length > 3 ? ` +${quality.missingAnnexes.length - 3}` : ''}
        </p>
      )}
    </section>
  )
}

function isQualityReadyForOfficial(quality: ContractQualityResult | null): boolean {
  return !quality || quality.status === 'READY_FOR_SIGNATURE'
}

function NuevoContratoInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('select')
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplateDefinition | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({})
  const [saving, setSaving] = useState(false)
  // orgId para scopear el autosave a localStorage por organizacion
  const [orgId, setOrgId] = useState<string | null>(null)
  // Banner para restaurar borrador local
  const [showRestoreBanner, setShowRestoreBanner] = useState(false)
  // Plantillas propias de la empresa (QW4)
  const [orgTemplates, setOrgTemplates] = useState<OrgTemplateSummary[]>([])
  const [orgTemplatesLoaded, setOrgTemplatesLoaded] = useState(false)
  // Refs para focus management cross-step (a11y)
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const previousStep = useRef<Step>('select')
  // Live region para anuncios de autosave a screen readers
  const [a11yAnnouncement, setA11yAnnouncement] = useState('')

  // ─── AI Generation state ────────────────────────────────────────────────
  const [aiDescription, setAiDescription] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiContract, setAiContract] = useState<AIGeneratedContract | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSavedId, setAiSavedId] = useState<string | null>(null)
  const [aiSaving, setAiSaving] = useState(false)

  // ─── Template contract autosave state ──────────────────────────────────
  const [templateSavedId, setTemplateSavedId] = useState<string | null>(null)
  const [templateAutoSaveStatus, setTemplateAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [downloadingDocx, setDownloadingDocx] = useState(false)

  // Empleador fields
  const [empRuc, setEmpRuc] = useState('')
  const [empRazonSocial, setEmpRazonSocial] = useState('')
  const [empRepresentante, setEmpRepresentante] = useState('')
  const [empDireccion, setEmpDireccion] = useState('')
  const [empRucLoading, setEmpRucLoading] = useState(false)
  const [empRucStatus, setEmpRucStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  // ─── Auto-load org profile on mount ─────────────────────────────────────
  useEffect(() => {
    // Nuevo endpoint con todos los datos de la empresa + OWNER como representante
    fetch('/api/org/profile')
      .then(res => res.json())
      .then(
        (data: {
          org?: {
            id?: string
            ruc: string | null
            razonSocial: string | null
            name: string | null
            sector: string | null
          } | null
          representanteLegal?: string | null
        }) => {
          const o = data.org
          if (!o) return
          if (o.id) setOrgId(o.id)
          if (o.ruc) {
            setEmpRuc(o.ruc)
            setFormData(prev => ({ ...prev, empleador_ruc: o.ruc as string }))
          }
          if (o.razonSocial) {
            setEmpRazonSocial(o.razonSocial)
            setFormData(prev => ({
              ...prev,
              empleador_razon_social: o.razonSocial as string,
            }))
          } else if (o.name) {
            setEmpRazonSocial(o.name)
            setFormData(prev => ({
              ...prev,
              empleador_razon_social: o.name as string,
            }))
          }
          if (data.representanteLegal) {
            setEmpRepresentante(data.representanteLegal)
            setFormData(prev => ({
              ...prev,
              empleador_representante: data.representanteLegal as string,
            }))
          }
        }
      )
      .catch(() => {
        // Fallback al endpoint viejo si falla
        fetch('/api/onboarding/progress')
          .then(res => res.json())
          .then(
            (data: { orgProfile?: { ruc: string | null; razonSocial: string | null } }) => {
              const p = data.orgProfile
              if (!p) return
              if (p.ruc) setEmpRuc(p.ruc)
              if (p.razonSocial) setEmpRazonSocial(p.razonSocial)
            }
          )
          .catch(() => {
            /* silently ignore */
          })
      })
  }, [])

  // Trabajador fields
  const [trabDni, setTrabDni] = useState('')
  const [trabNombre, setTrabNombre] = useState('')
  const [trabDniLoading, setTrabDniLoading] = useState(false)
  const [trabDniStatus, setTrabDniStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  // Worker existente seleccionado del directorio (QW2)
  const [selectedWorker, setSelectedWorker] = useState<WorkerSummary | null>(null)
  // Modo de seleccion: 'picker' = abierto, 'manual' = usuario eligio nuevo trabajador
  const [trabajadorMode, setTrabajadorMode] = useState<'picker' | 'manual'>('picker')

  // Pre-fill from query params (when coming from worker profile)
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      const dni = searchParams.get('dni')
      const name = searchParams.get('workerName')
      const cargo = searchParams.get('cargo')
      const sueldo = searchParams.get('sueldo')
      if (dni) {
        setTrabDni(dni)
        setTrabDniStatus('ok')
        setFormData(prev => ({ ...prev, trabajador_dni: dni }))
      }
      if (name) {
        setTrabNombre(name)
        setFormData(prev => ({ ...prev, trabajador_nombre: name }))
      }
      if (cargo) setFormData(prev => ({ ...prev, trabajador_cargo: cargo }))
      if (sueldo) setFormData(prev => ({ ...prev, remuneracion_mensual: sueldo }))
    })
    return () => {
      cancelled = true
    }
  }, [searchParams])

  // MG4: Save & resume — si la URL trae ?resume=<id>, rehidratar contrato desde BD
  useEffect(() => {
    const resumeId = searchParams.get('resume')
    if (!resumeId) return
    if (templateSavedId === resumeId) return
    fetch(`/api/contracts/${resumeId}`)
      .then(async res => {
        if (!res.ok) {
          toast({
            title: 'No se pudo cargar el borrador',
            description: 'Verifica que aun exista en la lista de contratos.',
            type: 'error',
          })
          return
        }
        const { data } = await res.json() as {
          data: {
            id: string
            templateId: string | null
            type: string
            title: string
            formData: Record<string, string | number | boolean> | null
            status: string
          }
        }
        if (data.templateId) {
          const tmpl = CONTRACT_TEMPLATES.find(t => t.id === data.templateId)
          if (tmpl) setSelectedTemplate(tmpl)
        }
        setFormData((data.formData as Record<string, string | number | boolean>) ?? {})
        setTemplateSavedId(data.id)
        setStep('form')
        toast({
          title: 'Borrador cargado',
          description: `Continua editando "${data.title}"`,
          type: 'success',
        })
        setA11yAnnouncement(`Borrador "${data.title}" cargado.`)
      })
      .catch(() => {
        toast({ title: 'Error de red al cargar el borrador', type: 'error' })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Tipo de contrato
  const [modalidad, setModalidad] = useState('')
  const [causaObjetiva, setCausaObjetiva] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [periodoPrueba, setPeriodoPrueba] = useState('3')
  // Condiciones laborales
  const [cargo, setCargo] = useState('')
  const [jornada, setJornada] = useState('48')
  const [horario, setHorario] = useState('')
  const [remuneracion, setRemuneracion] = useState('')
  const [formaPago, setFormaPago] = useState('MENSUAL')
  const [beneficios, setBeneficios] = useState('')

  // ─── Autosave a localStorage (QW1) ──────────────────────────────────────
  // Borrador en la nube con useCloudDraft
  const draftHook = useCloudDraft<ContractWizardDraft>({
    key: 'contract-draft',
    orgId,
    ttlDays: 7,
    debounceMs: 1500,
  })

  // Mostrar banner de restaurar cuando el draft se restaura del storage
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      if (draftHook.draft && draftHook.restoredAt && step === 'select' && !selectedTemplate) {
        setShowRestoreBanner(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [draftHook.draft, draftHook.restoredAt, selectedTemplate, step])

  // Persistir cambios al draft (debounced por el hook)
  useEffect(() => {
    // No guardar borrador en estados terminales
    if (step === 'review') return
    // No guardar si nada significativo se ha llenado todavia
    const hasMeaningfulData =
      selectedTemplate !== null ||
      Object.keys(formData).length > 0 ||
      trabDni.length > 0 ||
      cargo.length > 0 ||
      remuneracion.length > 0
    if (!hasMeaningfulData) return

    draftHook.save({
      step,
      selectedTemplateId: selectedTemplate?.id ?? null,
      currentSection,
      formData,
      aiDescription,
      aiShownOnce: step === 'ai-generate',
      empRuc,
      empRazonSocial,
      empRepresentante,
      empDireccion,
      trabDni,
      trabNombre,
      modalidad,
      causaObjetiva,
      fechaInicio,
      fechaFin,
      periodoPrueba,
      cargo,
      jornada,
      horario,
      remuneracion,
      formaPago,
      beneficios,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step, selectedTemplate?.id, currentSection, formData,
    aiDescription, step,
    empRuc, empRazonSocial, empRepresentante, empDireccion,
    trabDni, trabNombre,
    modalidad, causaObjetiva, fechaInicio, fechaFin, periodoPrueba,
    cargo, jornada, horario, remuneracion, formaPago, beneficios,
  ])

  /** Aplica el draft restaurado al estado actual del wizard. */
  const restoreDraft = () => {
    const d = draftHook.draft
    if (!d) return
    if (d.selectedTemplateId) {
      const tmpl = CONTRACT_TEMPLATES.find(t => t.id === d.selectedTemplateId)
      if (tmpl) setSelectedTemplate(tmpl)
    }
    setStep(d.step)
    setCurrentSection(d.currentSection || 0)
    setFormData(d.formData || {})
    setAiDescription(d.aiDescription || '')
    setEmpRuc(d.empRuc || '')
    setEmpRazonSocial(d.empRazonSocial || '')
    setEmpRepresentante(d.empRepresentante || '')
    setEmpDireccion(d.empDireccion || '')
    setTrabDni(d.trabDni || '')
    setTrabNombre(d.trabNombre || '')
    setModalidad(d.modalidad || '')
    setCausaObjetiva(d.causaObjetiva || '')
    setFechaInicio(d.fechaInicio || '')
    setFechaFin(d.fechaFin || '')
    setPeriodoPrueba(d.periodoPrueba || '3')
    setCargo(d.cargo || '')
    setJornada(d.jornada || '48')
    setHorario(d.horario || '')
    setRemuneracion(d.remuneracion || '')
    setFormaPago(d.formaPago || 'MENSUAL')
    setBeneficios(d.beneficios || '')
    setShowRestoreBanner(false)
    setA11yAnnouncement('Borrador restaurado.')
    toast({
      title: 'Borrador restaurado',
      description: 'Continua donde lo dejaste.',
      type: 'success',
    })
  }

  /** Descarta el draft restaurado y limpia el storage. */
  const dismissDraft = () => {
    draftHook.clear()
    setShowRestoreBanner(false)
    setA11yAnnouncement('Borrador descartado.')
  }

  // Anuncio de autosave a screen readers (live region)
  useEffect(() => {
    if (draftHook.saving) return
    if (showRestoreBanner) return
    if (!draftHook.draft && Object.keys(formData).length === 0) return
    // Solo anunciar cuando dejo de estar 'saving' y tenemos contenido
    const handle = setTimeout(() => {
      setA11yAnnouncement('Borrador guardado automaticamente.')
    }, 200)
    return () => clearTimeout(handle)
  }, [draftHook.saving, draftHook.draft, formData, showRestoreBanner])

  // Focus management: al cambiar de step, mover foco al h1 del nuevo step (a11y)
  useEffect(() => {
    if (previousStep.current !== step && stepHeadingRef.current) {
      stepHeadingRef.current.focus()
      previousStep.current = step
    }
  }, [step])

  // QW4: Cargar plantillas propias de la empresa para mostrarlas en el grid
  useEffect(() => {
    if (orgTemplatesLoaded) return
    fetch('/api/org-templates')
      .then(async res => {
        if (!res.ok) {
          // 403 = plan no incluye feature, 404 = no existe — silencio en ambos
          setOrgTemplatesLoaded(true)
          return
        }
        const data = await res.json() as { data: OrgTemplateSummary[] }
        setOrgTemplates(data.data || [])
        setOrgTemplatesLoaded(true)
      })
      .catch(() => setOrgTemplatesLoaded(true))
  }, [orgTemplatesLoaded])

  /**
   * QW4: usuario eligio una plantilla propia. Por ahora redirigimos al editor
   * con el contexto del worker seleccionado. En MG2 se construira un step
   * dedicado que reusa el WorkerPicker y los placeholders.
   */
  const handleSelectOrgTemplate = (tmpl: OrgTemplateSummary) => {
    const params = new URLSearchParams()
    if (selectedWorker) params.set('workerId', selectedWorker.id)
    params.set('action', 'generate')
    router.push(
      `/dashboard/configuracion/empresa/plantillas/${tmpl.id}${params.toString() ? `?${params}` : ''}`
    )
  }

  const handleSelectTemplate = (id: string) => {
    if (id === '__ai_generate__') {
      setStep('ai-generate')
      setAiContract(null)
      setAiError(null)
      return
    }
    const template = CONTRACT_TEMPLATES.find(t => t.id === id)
    if (template) {
      setSelectedTemplate(template)
      setStep('form')
      setCurrentSection(0)
      setFormData({})
    }
  }

  // ─── RUC auto-lookup ─────────────────────────────────────────────────────
  const handleRucChange = async (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 11)
    setEmpRuc(clean)
    setEmpRucStatus('idle')
    if (clean.length !== 11) {
      setEmpRazonSocial('')
      setEmpDireccion('')
      return
    }
    setEmpRucLoading(true)
    try {
      const res = await fetch(`/api/integrations/sunat?ruc=${clean}`)
      const data = await res.json()
      if (res.ok && data.data) {
        setEmpRazonSocial(data.data.razonSocial || '')
        setEmpDireccion(data.data.direccion || '')
        setEmpRucStatus('ok')
      } else {
        setEmpRucStatus('error')
      }
    } catch {
      setEmpRucStatus('error')
    } finally {
      setEmpRucLoading(false)
    }
  }

  // ─── DNI auto-lookup ──────────────────────────────────────────────────────
  const handleDniChange = async (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 8)
    setTrabDni(clean)
    setTrabDniStatus('idle')
    if (clean.length !== 8) {
      setTrabNombre('')
      return
    }
    setTrabDniLoading(true)
    try {
      const res = await fetch(`/api/integrations/sunat?dni=${clean}`)
      const data = await res.json()
      if (res.ok && data.data) {
        const d = data.data
        const fullName = `${d.nombres || ''} ${d.apellidos || ''}`.trim()
        setTrabNombre(fullName)
        setTrabDniStatus('ok')
      } else {
        setTrabDniStatus('error')
      }
    } catch {
      setTrabDniStatus('error')
    } finally {
      setTrabDniLoading(false)
    }
  }

  const handleGenerateAi = async () => {
    if (aiDescription.trim().length < 10) {
      setAiError('Escribe al menos 10 caracteres describiendo el contrato')
      return
    }
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai-contracts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: aiDescription,
          empleadorRazonSocial: empRazonSocial || undefined,
          empleadorRuc: empRuc || undefined,
          empleadorRepresentante: empRepresentante || undefined,
          empleadorDireccion: empDireccion || undefined,
          trabajadorNombre: trabNombre || undefined,
          trabajadorDni: trabDni || undefined,
          modalidadContrato: modalidad || undefined,
          causaObjetiva: causaObjetiva || undefined,
          fechaInicio: fechaInicio || undefined,
          fechaFin: fechaFin || undefined,
          periodoPruebaMeses: periodoPrueba ? Number(periodoPrueba) : undefined,
          cargo: cargo || undefined,
          jornadaHoras: jornada ? Number(jornada) : undefined,
          horario: horario || undefined,
          remuneracion: remuneracion ? Number(remuneracion) : undefined,
          formaPago: formaPago || undefined,
          beneficiosAdicionales: beneficios || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      const generated = data.contract as AIGeneratedContract
      setAiContract(generated)
      // Auto-guardar inmediatamente en la base de datos como borrador
      void autoSaveAiContract(generated)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error generando contrato'
      // Mensaje más amigable para errores de red
      setAiError(
        msg === 'Failed to fetch'
          ? 'No se pudo conectar con el servidor. Verifica que el servidor este corriendo.'
          : msg
      )
    } finally {
      setAiLoading(false)
    }
  }

  /** Mapea el tipo detectado por la IA al enum ContractType de Prisma */
  const mapAiTypeToPrisma = (tipo: string): string => {
    const map: Record<string, string> = {
      LABORAL_INDEFINIDO: 'LABORAL_INDEFINIDO',
      LABORAL_PLAZO_FIJO: 'LABORAL_PLAZO_FIJO',
      LABORAL_PARTTIME: 'LABORAL_TIEMPO_PARCIAL',
      LOCACION_SERVICIOS: 'LOCACION_SERVICIOS',
      MYPE: 'LABORAL_INDEFINIDO',
      CONFIDENCIALIDAD: 'CONFIDENCIALIDAD',
      PRACTICAS: 'CONVENIO_PRACTICAS',
      OTRO: 'CUSTOM',
    }
    return map[tipo] || 'CUSTOM'
  }

  /** Sanitiza un objeto eliminando claves con valores undefined (Prisma Json no los acepta) */
  const sanitize = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj))

  /**
   * Guarda automáticamente el contrato generado por IA como borrador
   * en la base de datos. Se ejecuta inmediatamente tras generar el contrato.
   */
  const autoSaveAiContract = async (contract: AIGeneratedContract) => {
    setAiSaving(true)
    try {
      const payload = sanitize({
        type: mapAiTypeToPrisma(contract.tipoDetectado),
        title: contract.tituloContrato || 'Contrato generado por IA',
        contentHtml: contract.htmlCompleto || '',
        contentJson: {
          tipoDetectado: contract.tipoDetectado || 'OTRO',
          preambulo: contract.preambulo || null,
          clausulas: contract.clausulas || [],
          advertenciasLegales: contract.advertenciasLegales || [],
          baseLegalPrincipal: contract.baseLegalPrincipal || null,
          anexos: contract.anexos || [],
          generadoPor: contract.generadoPor || 'ai',
          modelo: contract.modelo || 'unknown',
          generadoAt: contract.generadoAt || new Date().toISOString(),
        },
        formData: {
          empleador_razon_social: empRazonSocial || null,
          empleador_ruc: empRuc || null,
          empleador_representante: empRepresentante || null,
          empleador_direccion: empDireccion || null,
          trabajador_nombre: trabNombre || null,
          trabajador_dni: trabDni || null,
          cargo: cargo || null,
          remuneracion: remuneracion ? Number(remuneracion) : null,
          fecha_inicio: fechaInicio || null,
          fecha_fin: fechaFin || null,
          jornada_horas: jornada ? Number(jornada) : null,
          horario: horario || null,
          modalidad_contrato: modalidad || null,
          causa_objetiva: causaObjetiva || null,
          periodo_prueba_meses: periodoPrueba ? Number(periodoPrueba) : null,
          forma_pago: formaPago || null,
          beneficios_adicionales: beneficios || null,
        },
      })

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('[autoSaveAiContract] error del backend:', res.status, data)
        throw new Error(data.error || `Error ${res.status} al guardar`)
      }
      const { data } = (await res.json()) as { data: { id: string } }
      setAiSavedId(data.id)
      // Borrador ya esta en BD: limpiar localStorage para no mostrar restore banner
      draftHook.clear()
      toast({
        title: 'Contrato guardado ✓',
        description: 'Borrador creado automáticamente. Puedes descargarlo o editarlo cuando quieras.',
        type: 'success',
      })
    } catch (e) {
      console.error('[autoSaveAiContract] fallo completo:', e)
      toast({
        title: 'No se pudo guardar automáticamente',
        description:
          e instanceof Error
            ? e.message
            : 'Puedes descargar el contrato igualmente. Intenta guardarlo manualmente más tarde.',
        type: 'error',
      })
    } finally {
      setAiSaving(false)
    }
  }

  const handleDownloadAiContract = () => {
    if (!aiContract) return
    if (!aiSavedId) {
      toast({
        title: 'Espera a que termine el guardado',
        description: 'El DOCX oficial se descarga desde el contrato guardado.',
        type: 'error',
      })
      return
    }
    window.location.href = `/api/contracts/${aiSavedId}/render-docx`
  }

  /** QW2: usuario eligio un trabajador existente del directorio */
  const handleSelectWorker = (w: WorkerSummary) => {
    setSelectedWorker(w)
    setTrabajadorMode('manual') // ya no mostramos el picker, mostramos los campos pre-rellenados
    setTrabDni(w.dni)
    setTrabDniStatus('ok')
    setTrabNombre(`${w.firstName} ${w.lastName}`.trim())
    if (w.position && !cargo) setCargo(w.position)
    if (w.sueldoBruto && !remuneracion) setRemuneracion(String(w.sueldoBruto))
    setFormData(prev => ({
      ...prev,
      trabajador_dni: w.dni,
      trabajador_nombre: `${w.firstName} ${w.lastName}`.trim(),
      trabajador_cargo: w.position ?? prev.trabajador_cargo,
      trabajador_regimen: w.regimenLaboral,
      remuneracion_mensual: w.sueldoBruto ? String(w.sueldoBruto) : prev.remuneracion_mensual,
      fecha_inicio: w.fechaIngreso?.split('T')[0] ?? prev.fecha_inicio,
    }))
    setA11yAnnouncement(
      `Trabajador ${w.firstName} ${w.lastName} seleccionado. Datos prellenados.`
    )
  }

  /** QW2: limpiar seleccion de worker existente */
  const handleClearWorker = () => {
    setSelectedWorker(null)
    setTrabajadorMode('picker')
    setTrabDni('')
    setTrabNombre('')
    setTrabDniStatus('idle')
  }

  /** Costo empleador en vivo (QW3) — usa los inputs del modal IA */
  const costoEmpleador = useCostEmployer({
    sueldoBruto: remuneracion ? Number(remuneracion) : 0,
    regimenLaboral: selectedWorker?.regimenLaboral ?? 'GENERAL',
    asignacionFamiliar: selectedWorker?.asignacionFamiliar ?? false,
    tipoAporte: 'AFP',
    sctr: false,
    essaludVida: false,
    jornadaSemanal: jornada ? Number(jornada) : 48,
  })

  /** Validacion legal en vivo (QW5). Mapea modalidad UI -> ContractType Prisma. */
  const liveContractType = (() => {
    const map: Record<string, string> = {
      INDEFINIDO: 'LABORAL_INDEFINIDO',
      PLAZO_FIJO: 'LABORAL_PLAZO_FIJO',
      PARTTIME: 'LABORAL_TIEMPO_PARCIAL',
      MYPE: 'LABORAL_INDEFINIDO',
      LOCACION: 'LOCACION_SERVICIOS',
      PRACTICAS: 'CONVENIO_PRACTICAS',
    }
    if (modalidad && map[modalidad]) return map[modalidad]
    if (selectedTemplate?.type) return selectedTemplate.type
    return null
  })()

  const liveFormData = useMemo<Record<string, string | number | boolean>>(() => ({
    ...formData,
    causa_objetiva: causaObjetiva,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    remuneracion: remuneracion ? Number(remuneracion) : '',
    cargo,
    jornada_semanal: jornada ? Number(jornada) : '',
  }), [cargo, causaObjetiva, fechaFin, fechaInicio, formData, jornada, remuneracion])

  const liveValidation = useLiveValidation({
    contractType: liveContractType,
    formData: liveFormData,
    workerIds: selectedWorker ? [selectedWorker.id] : [],
    inlineWorker: !selectedWorker && trabDni && trabDni.length === 8 && trabNombre
      ? {
          dni: trabDni,
          firstName: trabNombre.split(' ')[0] ?? '',
          lastName: trabNombre.split(' ').slice(1).join(' ') || trabNombre,
          regimenLaboral: 'GENERAL',
          fechaIngreso: fechaInicio || new Date().toISOString().split('T')[0],
          sueldoBruto: remuneracion ? Number(remuneracion) : 0,
          nationality: 'peruana',
        }
      : null,
    enabled: step === 'ai-generate' || step === 'form' || step === 'preview',
  })
  const premiumPreviewDocument = liveContractType
    ? buildPremiumContractDocument({
        contractType: liveContractType,
        title: selectedTemplate?.name ?? 'Contrato',
        formData: liveFormData,
      })
    : null

  const handleResetAi = () => {
    setStep('select')
    setAiDescription('')
    setAiContract(null)
    setAiError(null)
    setEmpRuc(''); setEmpRazonSocial(''); setEmpRepresentante(''); setEmpDireccion('')
    setEmpRucStatus('idle')
    setTrabDni(''); setTrabNombre('')
    setTrabDniStatus('idle')
    setModalidad(''); setCausaObjetiva(''); setFechaInicio(''); setFechaFin('')
    setPeriodoPrueba('3')
    setCargo(''); setJornada('48'); setHorario(''); setRemuneracion('')
    setFormaPago('MENSUAL'); setBeneficios('')
  }

  const updateFormField = (fieldId: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
  }

  const totalSections = selectedTemplate?.sections.length ?? 0
  const progress = totalSections > 0 ? ((currentSection + 1) / totalSections) * 100 : 0

  const handleSaveDraft = async () => {
    if (!selectedTemplate) return
    setSaving(true)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          type: selectedTemplate.type,
          title: selectedTemplate.name,
          formData,
        }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json() as { data: { id: string } }
      setTemplateSavedId(data.id)
      draftHook.clear()
      toast({ title: 'Borrador guardado', description: 'Puedes continuar editandolo despues', type: 'success' })
      router.push(`/dashboard/contratos/${data.id}`)
    } catch {
      toast({ title: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Auto-guarda el contrato de plantilla silenciosamente (sin navegar).
   * Se dispara al entrar al step 'preview'. Si ya fue guardado una vez
   * (templateSavedId no nulo) no lo vuelve a crear.
   */
  const autoSaveTemplateContract = useCallback(async () => {
    if (!selectedTemplate || templateSavedId || templateAutoSaveStatus === 'saving') return
    setTemplateAutoSaveStatus('saving')
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          type: selectedTemplate.type,
          title: selectedTemplate.name,
          formData: liveFormData,
          sourceKind: 'template-based',
          provenance: 'MANUAL_TEMPLATE',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al guardar')
      }
      const { data } = (await res.json()) as { data: { id: string } }
      setTemplateSavedId(data.id)
      setTemplateAutoSaveStatus('saved')
      // Borrador en BD: limpiar localStorage para no mostrar restore banner
      draftHook.clear()
      toast({
        title: 'Borrador guardado ✓',
        description: 'Se creó automáticamente. Puedes descargarlo o volver más tarde.',
        type: 'success',
      })
    } catch (e) {
      console.error('Auto-save template contract failed:', e)
      setTemplateAutoSaveStatus('error')
    }
  }, [draftHook, liveFormData, selectedTemplate, templateAutoSaveStatus, templateSavedId, toast])

  // ─── Auto-save template contract when entering preview step ────────────
  useEffect(() => {
    let cancelled = false
    if (step === 'preview' && selectedTemplate && !templateSavedId && templateAutoSaveStatus === 'idle') {
      void Promise.resolve().then(() => {
        if (!cancelled) void autoSaveTemplateContract()
      })
    }
    return () => {
      cancelled = true
    }
  }, [autoSaveTemplateContract, selectedTemplate, step, templateAutoSaveStatus, templateSavedId])

  const handleDownloadDocx = async () => {
    if (!selectedTemplate) return
    if (!isQualityReadyForOfficial(liveValidation.quality)) {
      toast({
        title: 'DOCX oficial bloqueado',
        description: liveValidation.quality?.blockers[0]?.message ?? 'Resuelve el control premium antes de emitir.',
        type: 'error',
      })
      return
    }
    if (!templateSavedId) {
      toast({
        title: 'Primero guarda el borrador',
        description: 'El DOCX oficial se genera desde el contrato persistido.',
        type: 'error',
      })
      return
    }
    setDownloadingDocx(true)
    try {
      const res = await fetch(`/api/contracts/${templateSavedId}/render-docx`)
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        toast({
          title: 'DOCX no disponible',
          description: exportErrorDescription(errBody),
          type: 'error',
        })
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileNameFromDisposition(
        res.headers.get('Content-Disposition'),
        `${selectedTemplate.name}.docx`,
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch {
      toast({
        title: 'No se pudo generar el DOCX',
        description: 'Revisa tu conexión o intenta nuevamente.',
        type: 'error',
      })
    } finally {
      setDownloadingDocx(false)
    }
  }

  // Layout: el step 'form' usa 3-col wide; el resto (select/preview/review) mantiene narrow
  const containerClass = step === 'form' || step === 'preview'
    ? 'max-w-7xl mx-auto space-y-6'
    : 'max-w-4xl mx-auto space-y-6'

  if (draftHook.loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-slate-600">Cargando progreso guardado...</p>
      </div>
    )
  }

  return (
    <div className={containerClass}>
      {/* Live region para anuncios a screen readers (a11y) */}
      <div role="status" aria-live="polite" className="sr-only">
        {a11yAnnouncement}
      </div>

      {/* Header */}
      <nav aria-label="Migas de pan" className="flex items-center gap-4">
        <Link
          href="/dashboard/contratos"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[color:var(--text-secondary)]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Contratos
        </Link>
        <span className="text-[color:var(--text-secondary)]" aria-hidden="true">/</span>
        <span className="text-sm font-medium text-slate-900" aria-current="page">Nuevo Contrato</span>
      </nav>

      {/* Hero header (estilo del mockup) */}
      {(step === 'form' || step === 'preview') && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Nuevo contrato</h1>
            <p className="text-sm text-slate-500 mt-1">
              Crea un contrato en pocos pasos. Tu progreso{' '}
              <span className="text-emerald-700 font-medium">se guarda automáticamente</span>.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/dashboard/contratos?status=DRAFT"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Guardar borrador
            </Link>
          </div>
        </div>
      )}

      {/* Banner de restaurar borrador (QW1) */}
      {showRestoreBanner && draftHook.draft && draftHook.restoredAt && (
        <div
          role="region"
          aria-labelledby="restore-draft-title"
          className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <History className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p id="restore-draft-title" className="text-sm font-semibold text-blue-900">
              Tienes un borrador sin terminar
            </p>
            <p className="text-xs text-blue-800 mt-0.5">
              Guardado {formatRelativeTime(draftHook.restoredAt)}. ¿Quieres continuarlo o empezar uno nuevo?
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={dismissDraft}
              className="px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100 rounded-lg"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={restoreDraft}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              Continuar borrador
            </button>
          </div>
        </div>
      )}

      {/* Step Indicator (rediseñado estilo mockup) */}
      <nav aria-label="Pasos del wizard" className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <ol className="flex items-center justify-between gap-2 m-0 p-0">
          {[
            { key: 'select', label: '1. Plantilla', sub: 'Elegir tipo' },
            { key: 'form', label: '2. Datos', sub: 'Completar información' },
            { key: 'preview', label: '3. Revisión', sub: 'Validaciones y preview' },
            { key: 'review', label: '4. Generar', sub: 'Descargar contrato' },
          ].map((s, i) => {
            const isCurrent = step === s.key
            const isCompleted = ['select', 'form', 'preview', 'review'].indexOf(step) > i
            return (
              <li
                key={s.key}
                className="flex items-center gap-3 flex-1 min-w-0"
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div
                  className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-sm font-bold transition-colors ${
                    isCurrent
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                  aria-hidden="true"
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <div className="hidden sm:block min-w-0">
                  <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-500'}`}>
                    {s.label}
                    {isCurrent && <span className="sr-only"> (paso actual)</span>}
                    {isCompleted && <span className="sr-only"> (completado)</span>}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{s.sub}</p>
                </div>
                {i < 3 && <div className="hidden md:block flex-1 h-px bg-slate-200" aria-hidden="true" />}
              </li>
            )
          })}
        </ol>
      </nav>

      {/* STEP: Select Template */}
      {step === 'select' && (
        <div className="space-y-6">
          <div>
            <h1
              ref={stepHeadingRef}
              tabIndex={-1}
              className="text-2xl font-bold text-slate-900 outline-none"
            >
              Selecciona el tipo de contrato
            </h1>
            <p className="text-gray-500 mt-1">
              Elige una plantilla. Todas están actualizadas con la normativa peruana vigente.
            </p>
          </div>

          {/* Detección automática de régimen — Generador de Contratos / Chunk 2 */}
          <RegimeBadge />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMPLATE_OPTIONS.map(opt => {
              const Icon = opt.icon
              const isAi = 'isAi' in opt && opt.isAi
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => opt.available && handleSelectTemplate(opt.id)}
                  disabled={!opt.available}
                  className={`text-left p-6 rounded-2xl border-2 transition-all ${
                    !opt.available
                      ? 'border-white/[0.06] bg-[color:var(--neutral-50)] opacity-50 cursor-not-allowed'
                      : isAi
                        ? 'border-purple-300 hover:border-purple-500 hover:shadow-xl bg-gradient-to-br from-purple-50 via-white to-indigo-50 cursor-pointer'
                        : 'border-white/[0.08] hover:border-primary hover:shadow-lg bg-white cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isAi ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md' : 'bg-primary/10'
                    }`}>
                      <Icon className={`w-6 h-6 ${isAi ? 'text-white' : 'text-primary'}`} />
                    </div>
                    {opt.badge && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${opt.badgeColor}`}>
                        {opt.badge}
                      </span>
                    )}
                    {!opt.available && (
                      <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Próximamente
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{opt.name}</h3>
                  <p className="text-sm text-slate-600">{opt.description}</p>
                </button>
              )
            })}
          </div>

          {/* QW4: Plantillas propias de la empresa (zero-liability) */}
          {orgTemplates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  Tus plantillas
                </h2>
                <span className="text-[11px] text-slate-500">
                  {orgTemplates.length} disponible{orgTemplates.length === 1 ? '' : 's'}
                </span>
                <Link
                  href="/dashboard/configuracion/empresa/plantillas"
                  className="ml-auto text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Administrar plantillas →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orgTemplates.map(tmpl => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectOrgTemplate(tmpl)}
                    className="text-left p-6 rounded-2xl border-2 border-emerald-200 hover:border-emerald-500 hover:shadow-lg bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md">
                        <ScrollText className="w-6 h-6 text-white" aria-hidden="true" />
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        Tu plantilla
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">{tmpl.title}</h3>
                    <p className="text-sm text-slate-600">{tmpl.documentTypeLabel}</p>
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                      <span>{tmpl.placeholderCount} placeholders</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {tmpl.mappingCount}/{tmpl.placeholderCount} mapeados
                      </span>
                      {tmpl.usageCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{tmpl.usageCount} usos</span>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Generation Step */}
      {step === 'ai-generate' && (
        <AiStep
          showAiModal={true}
          aiContract={aiContract}
          aiLoading={aiLoading}
          aiDescription={aiDescription}
          empRuc={empRuc}
          empRucStatus={empRucStatus}
          empRucLoading={empRucLoading}
          empRazonSocial={empRazonSocial}
          empRepresentante={empRepresentante}
          empDireccion={empDireccion}
          trabajadorMode={trabajadorMode}
          orgId={orgId}
          selectedWorker={selectedWorker}
          trabDni={trabDni}
          trabDniStatus={trabDniStatus}
          trabDniLoading={trabDniLoading}
          trabNombre={trabNombre}
          modalidad={modalidad}
          periodoPrueba={periodoPrueba}
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          causaObjetiva={causaObjetiva}
          cargo={cargo}
          jornada={jornada}
          horario={horario}
          remuneracion={remuneracion}
          formaPago={formaPago}
          beneficios={beneficios}
          costoEmpleador={costoEmpleador}
          liveValidation={liveValidation}
          aiError={aiError}
          aiSaving={aiSaving}
          aiSavedId={aiSavedId}
          handleResetAi={handleResetAi}
          setAiDescription={setAiDescription}
          handleRucChange={handleRucChange}
          setEmpRazonSocial={setEmpRazonSocial}
          setEmpRepresentante={setEmpRepresentante}
          setEmpDireccion={setEmpDireccion}
          setTrabajadorMode={setTrabajadorMode}
          handleSelectWorker={handleSelectWorker}
          handleClearWorker={handleClearWorker}
          handleDniChange={handleDniChange}
          setTrabNombre={setTrabNombre}
          setModalidad={setModalidad}
          setPeriodoPrueba={setPeriodoPrueba}
          setFechaInicio={setFechaInicio}
          setFechaFin={setFechaFin}
          setCausaObjetiva={setCausaObjetiva}
          setCargo={setCargo}
          setJornada={setJornada}
          setHorario={setHorario}
          setRemuneracion={setRemuneracion}
          setFormaPago={setFormaPago}
          setBeneficios={setBeneficios}
          handleGenerateAi={handleGenerateAi}
          setAiContract={setAiContract}
          setAiError={setAiError}
          setAiSavedId={setAiSavedId}
          handleDownloadAiContract={handleDownloadAiContract}
        />
      )}

      {/* STEP: Form */}
      {step === 'form' && selectedTemplate && (
        <div className="space-y-4 pb-24">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1
                ref={stepHeadingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-slate-900 outline-none"
              >
                {selectedTemplate.sections[currentSection]?.title}
              </h1>
              <span className="text-sm text-gray-500">
                Sección {currentSection + 1} de {totalSections}
              </span>
            </div>
            <div className="h-2 bg-[color:var(--neutral-100)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 3-col layout: form | preview | sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUMNA 1: Form */}
            <div className="lg:col-span-5 space-y-4">
              {/* WorkerPicker (siempre arriba para vincular trabajador) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Datos del trabajador</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Busca un trabajador existente o registra uno nuevo
                  </p>
                </div>
                {trabajadorMode === 'picker' && !selectedWorker && (
                  <WorkerPicker
                    orgId={orgId}
                    onSelectExisting={handleSelectWorker}
                    onChooseNew={() => setTrabajadorMode('manual')}
                    selectedWorker={null}
                  />
                )}
                {selectedWorker && (
                  <WorkerPicker
                    orgId={orgId}
                    onSelectExisting={handleSelectWorker}
                    onChooseNew={() => setTrabajadorMode('manual')}
                    selectedWorker={selectedWorker}
                    onClear={handleClearWorker}
                  />
                )}
              </div>

              {/* Fields del template */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <h2 className="text-base font-bold text-slate-900">
                  {selectedTemplate.sections[currentSection]?.title}
                </h2>
                {selectedTemplate.sections[currentSection]?.fields.map(field => {
                  if (field.condition) {
                    const condValue = formData[field.condition.field]
                    if (condValue !== field.condition.value) return null
                  }
                  return (
                    <DynamicField
                      key={field.id}
                      field={field}
                      value={formData[field.id]}
                      onChange={value => updateFormField(field.id, value)}
                    />
                  )
                })}
              </div>

              {/* Base Legal Info */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="text-sm font-semibold text-blue-800">Base Legal: </span>
                  <span className="text-sm text-blue-700">{selectedTemplate.legalBasis}</span>
                </div>
              </div>
            </div>

            {/* COLUMNA 2: Preview premium en vivo (QW6 split view) */}
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Preview oficial premium</h2>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                    Actualizado
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Refleja el render canónico que alimenta PDF/DOCX. El archivo oficial sigue bloqueado hasta pasar calidad legal.
                </p>
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="max-h-[600px] overflow-y-auto p-2 [transform:scale(0.85)] [transform-origin:top_left] [width:117.6%]">
                    {premiumPreviewDocument ? (
                      <PremiumContractPreview
                        document={premiumPreviewDocument}
                        isDraft
                        compact
                        className="!shadow-none"
                      />
                    ) : (
                      <ContractPreview
                        template={selectedTemplate}
                        formData={formData}
                        isDraft
                        className="!shadow-none !p-6"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA 3: Sidebar con cost + validation (Desktop) */}
            <aside className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-4 lg:self-start">
              <CostSummaryPill result={costoEmpleador} />
              <PremiumQualityPanel quality={liveValidation.quality} />
              <LiveValidationPanel
                blockers={liveValidation.blockers}
                warnings={liveValidation.warnings}
                infos={liveValidation.infos}
                passed={liveValidation.passed}
                totalRules={liveValidation.totalRules}
                loading={liveValidation.loading}
                error={liveValidation.error}
              />
            </aside>
          </div>

          {/* MOBILE ACTIONS (Floating Buttons) */}
          {step === 'form' && (
            <div className="fixed right-4 bottom-20 z-40 flex flex-col gap-3 lg:hidden">
              {/* Validation Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg border border-slate-200 text-slate-700 relative">
                    <AlertTriangle className="h-5 w-5" />
                    {liveValidation.blockers.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                        {liveValidation.blockers.length}
                      </span>
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] px-4 overflow-y-auto rounded-t-2xl">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Validación en Vivo</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4 pb-12">
                    <CostSummaryPill result={costoEmpleador} />
                    <PremiumQualityPanel quality={liveValidation.quality} />
                    <LiveValidationPanel
                      blockers={liveValidation.blockers}
                      warnings={liveValidation.warnings}
                      infos={liveValidation.infos}
                      passed={liveValidation.passed}
                      totalRules={liveValidation.totalRules}
                      loading={liveValidation.loading}
                      error={liveValidation.error}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Preview Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <button className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 relative">
                    <Eye className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[90vh] px-4 overflow-y-auto rounded-t-2xl">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Vista Previa</SheetTitle>
                  </SheetHeader>
                  <div className="pb-12">
                    {premiumPreviewDocument ? (
                      <PremiumContractPreview
                        document={premiumPreviewDocument}
                        isDraft
                        compact
                        className="!shadow-none !p-6"
                      />
                    ) : (
                      <ContractPreview
                        template={selectedTemplate!}
                        formData={formData}
                        isDraft
                        className="!shadow-none !p-6"
                      />
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Footer fijo con autosave + nav buttons */}
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-lg">
            <div className={containerClass + ' flex items-center justify-between gap-3 py-3 px-4'}>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                {draftHook.saving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    Guardando borrador…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                    <span>
                      Borrador guardado <span className="text-slate-400">· hace unos segundos</span>
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (currentSection > 0) {
                      setCurrentSection(prev => prev - 1)
                    } else {
                      setStep('select')
                      setSelectedTemplate(null)
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentSection < totalSections - 1) {
                      setCurrentSection(prev => prev + 1)
                    } else {
                      setStep('preview')
                    }
                  }}
                  disabled={liveValidation.blockers.length > 0}
                  aria-disabled={liveValidation.blockers.length > 0}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-lg shadow-primary/20"
                >
                  {currentSection < totalSections - 1 ? 'Continuar' : 'Vista Previa'}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP: Preview */}
      {step === 'preview' && selectedTemplate && (
        <div className="space-y-6">
          <h1
            ref={stepHeadingRef}
            tabIndex={-1}
            className="text-xl font-bold text-slate-900 outline-none"
          >
            Revisión final del borrador
          </h1>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Preview borrador</p>
                  <p className="text-sm text-slate-700">Sirve para revisar redacción y datos. No es documento oficial.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  BORRADOR
                </span>
              </div>
              {premiumPreviewDocument ? (
                <PremiumContractPreview document={premiumPreviewDocument} isDraft />
              ) : (
                <ContractPreview template={selectedTemplate} formData={formData} isDraft />
              )}
            </div>

            <aside className="space-y-4">
              <PremiumQualityPanel quality={liveValidation.quality} />
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Documento oficial</p>
                <p className="mt-1 text-sm text-slate-700">
                  PDF/DOCX oficial se emite desde el contrato guardado y vuelve a ejecutar el gate legal premium en servidor.
                </p>
                {!isQualityReadyForOfficial(liveValidation.quality) && (
                  <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800">
                    El archivo oficial quedará bloqueado hasta resolver los blockers, anexos o datos críticos.
                  </div>
                )}
              </div>
            </aside>
          </div>


          {/* Auto-save status */}
          <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
            templateAutoSaveStatus === 'saved'
              ? 'border-green-200 bg-green-50'
              : templateAutoSaveStatus === 'error'
                ? 'border-amber-200 bg-amber-50'
                : 'border-white/[0.08] bg-[color:var(--neutral-50)]'
          }`}>
            {templateAutoSaveStatus === 'saving' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                <p className="text-xs text-[color:var(--text-secondary)]">Guardando borrador automáticamente...</p>
              </>
            )}
            {templateAutoSaveStatus === 'saved' && (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                <p className="text-xs text-green-800">
                  <b>Contrato guardado como borrador.</b> Puedes descargarlo a DOCX o continuar editándolo más tarde desde la lista de contratos.
                </p>
              </>
            )}
            {templateAutoSaveStatus === 'error' && (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <p className="text-xs text-amber-800 flex-1">No se pudo guardar automáticamente. Puedes descargar el DOCX igualmente o intentar guardar manualmente.</p>
                <button
                  onClick={() => { setTemplateAutoSaveStatus('idle'); void autoSaveTemplateContract() }}
                  className="text-xs font-semibold text-amber-900 underline"
                >
                  Reintentar
                </button>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setStep('form')
                setCurrentSection(totalSections - 1)
              }}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] border border-white/10 rounded-xl hover:bg-[color:var(--neutral-50)]"
            >
              <ArrowLeft className="w-4 h-4" />
              Editar datos
            </button>
            <div className="flex gap-3">
              {templateSavedId ? (
                <button
                  onClick={() => router.push(`/dashboard/contratos/${templateSavedId}`)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-green-700 border border-green-300 bg-green-50 rounded-xl hover:bg-green-100"
                >
                  <FileText className="w-4 h-4" />
                  Ver borrador guardado
                </button>
              ) : (
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] border border-white/10 rounded-xl hover:bg-[color:var(--neutral-50)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar borrador
                </button>
              )}
              <button
                onClick={() => void handleDownloadDocx()}
                disabled={downloadingDocx || !isQualityReadyForOfficial(liveValidation.quality)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] border border-white/10 rounded-xl hover:bg-[color:var(--neutral-50)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingDocx
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Download className="w-4 h-4" />}
                {downloadingDocx
                  ? 'Generando DOCX...'
                  : isQualityReadyForOfficial(liveValidation.quality)
                    ? 'Descargar DOCX oficial'
                    : 'DOCX oficial bloqueado'}
              </button>
              <button
                onClick={() => setStep('review')}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20"
              >
                <Sparkles className="w-4 h-4" />
                Revisar con IA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP: AI Review */}
      {step === 'review' && (
        <div className="space-y-6">
          <h1
            ref={stepHeadingRef}
            tabIndex={-1}
            className="text-xl font-bold text-slate-900 outline-none"
          >
            Revisión con IA
          </h1>

          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center"
            aria-busy="true"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Sparkles className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Analizando tu contrato...
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Nuestra IA está verificando cláusulas, detectando riesgos legales y comparando
              con la normativa vigente. Esto toma unos segundos.
            </p>
            <div className="mt-6 max-w-xs mx-auto">
              <div className="h-2 bg-[color:var(--neutral-100)] rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-[progress_3s_ease-in-out_infinite] w-2/3" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================
// Dynamic Field Component
// =============================================
function DynamicField({
  field,
  value,
  onChange,
}: {
  field: TemplateField
  value: string | number | boolean | undefined
  onChange: (value: string | number | boolean) => void
}) {
  // a11y: ID estable del field para vincular label + helpText
  const inputId = `field-${field.id}`
  const helpId = field.helpText ? `${inputId}-help` : undefined

  switch (field.type) {
    case 'text':
    case 'date':
      return (
        <div>
          <label htmlFor={inputId} className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
            {field.label} {field.required && <span className="text-red-500" aria-label="obligatorio">*</span>}
          </label>
          <input
            id={inputId}
            type={field.type}
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            aria-describedby={helpId}
            aria-required={field.required || undefined}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-slate-900 bg-white placeholder:text-gray-400"
          />
          {field.helpText && (
            <p id={helpId} className="text-xs text-gray-500 mt-1">{field.helpText}</p>
          )}
        </div>
      )

    case 'number':
      return (
        <div>
          <label htmlFor={inputId} className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
            {field.label} {field.required && <span className="text-red-500" aria-label="obligatorio">*</span>}
          </label>
          <input
            id={inputId}
            type="number"
            value={(value as number) ?? ''}
            onChange={e => onChange(Number(e.target.value))}
            min={field.validation?.min}
            max={field.validation?.max}
            required={field.required}
            aria-describedby={helpId}
            aria-required={field.required || undefined}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-slate-900 bg-white"
          />
          {field.helpText && (
            <p id={helpId} className="text-xs text-gray-500 mt-1">{field.helpText}</p>
          )}
        </div>
      )

    case 'currency':
      return (
        <div>
          <label htmlFor={inputId} className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
            {field.label} {field.required && <span className="text-red-500" aria-label="obligatorio">*</span>}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm" aria-hidden="true">S/</span>
            <input
              id={inputId}
              type="number"
              value={(value as number) ?? ''}
              onChange={e => onChange(Number(e.target.value))}
              step="0.01"
              min="0"
              required={field.required}
              placeholder="0.00"
              aria-describedby={helpId}
              aria-required={field.required || undefined}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-slate-900 bg-white"
            />
          </div>
          {field.helpText && (
            <p id={helpId} className="text-xs text-gray-500 mt-1">{field.helpText}</p>
          )}
        </div>
      )

    case 'select':
      return (
        <div>
          <label htmlFor={inputId} className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
            {field.label} {field.required && <span className="text-red-500" aria-label="obligatorio">*</span>}
          </label>
          <select
            id={inputId}
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            required={field.required}
            aria-describedby={helpId}
            aria-required={field.required || undefined}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-slate-900 bg-white"
          >
            <option value="">Selecciona...</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {field.helpText && (
            <p id={helpId} className="text-xs text-gray-500 mt-1">{field.helpText}</p>
          )}
        </div>
      )

    case 'textarea':
      return (
        <div>
          <label htmlFor={inputId} className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5">
            {field.label} {field.required && <span className="text-red-500" aria-label="obligatorio">*</span>}
          </label>
          <textarea
            id={inputId}
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            aria-describedby={helpId}
            aria-required={field.required || undefined}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-slate-900 bg-white placeholder:text-gray-400 resize-y"
          />
          {field.helpText && (
            <p id={helpId} className="text-xs text-gray-500 mt-1">{field.helpText}</p>
          )}
        </div>
      )

    case 'toggle':
      return (
        <label className="flex items-center justify-between p-4 bg-[color:var(--neutral-50)] rounded-xl cursor-pointer group hover:bg-[color:var(--neutral-100)] transition-colors">
          <div>
            <span className="text-sm font-semibold text-[color:var(--text-secondary)] group-hover:text-slate-900">
              {field.label}
            </span>
            {field.helpText && (
              <p className="text-xs text-gray-500 mt-0.5">{field.helpText}</p>
            )}
          </div>
          <div className="relative flex-shrink-0 ml-4">
            <input
              type="checkbox"
              checked={!!value}
              onChange={e => onChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-primary transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
          </div>
        </label>
      )

    default:
      return null
  }
}

export default function NuevoContratoPage() {
  return (
    <Suspense>
      <NuevoContratoInner />
    </Suspense>
  )
}
