'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronLeft,
  Files,
  Layers,
  PenLine,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { PremiumEmptyState } from '@/components/comply360/premium-empty-state'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/sonner-toaster'
import { ZeroLiabilityModal } from '@/components/legal/zero-liability-modal'

// ═══════════════════════════════════════════════════════════════════════════
// Types (subset de lo que devuelve /api/org-templates)
// ═══════════════════════════════════════════════════════════════════════════

interface TemplateListItem {
  id: string
  title: string
  documentType: string
  documentTypeLabel: string
  contractType: string | null
  placeholders: string[]
  placeholderCount: number
  mappingCount: number
  unmapped: string[]
  usageCount: number
  notes: string | null
  version: number
  validUntil: string | null
  createdAt: string
  updatedAt: string
}

const DOCUMENT_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'CONTRATO_INDEFINIDO', label: 'Contrato indefinido' },
  { value: 'CONTRATO_PLAZO_FIJO', label: 'Contrato a plazo fijo' },
  { value: 'CONTRATO_TIEMPO_PARCIAL', label: 'Contrato a tiempo parcial' },
  { value: 'CONTRATO_MYPE', label: 'Contrato MYPE' },
  { value: 'CONTRATO_LOCACION_SERVICIOS', label: 'Locación de servicios' },
  { value: 'CONVENIO_PRACTICAS', label: 'Convenio de prácticas' },
  { value: 'ADDENDUM_AUMENTO', label: 'Adenda — aumento de sueldo' },
  { value: 'ADDENDUM_CAMBIO_CARGO', label: 'Adenda — cambio de cargo' },
  { value: 'CARTA_PREAVISO_DESPIDO', label: 'Carta de preaviso de despido' },
  { value: 'CARTA_DESPIDO', label: 'Carta de despido' },
  { value: 'CARTA_RENUNCIA', label: 'Carta de renuncia' },
  { value: 'CERTIFICADO_TRABAJO', label: 'Certificado de trabajo' },
  { value: 'CONSTANCIA_HABERES', label: 'Constancia de haberes' },
  { value: 'LIQUIDACION_BENEFICIOS', label: 'Liquidación de beneficios' },
  { value: 'FINIQUITO', label: 'Finiquito' },
  { value: 'MEMORANDUM', label: 'Memorándum' },
  { value: 'AUMENTO_SUELDO', label: 'Aumento de sueldo' },
  { value: 'OTRO', label: 'Otro documento' },
]

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════

export default function PlantillasPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<TemplateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/org-templates', { cache: 'no-store' })
      if (res.status === 403) {
        const body = await res.json().catch(() => ({ code: 'PLAN_UPGRADE_REQUIRED' }))
        setErrorCode(body.code ?? 'PLAN_UPGRADE_REQUIRED')
        setTemplates([])
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as { data: TemplateListItem[] }
      setTemplates(body.data ?? [])
      setErrorCode(null)
    } catch (err) {
      console.error('[plantillas] load', err)
      toast.error('No se pudieron cargar las plantillas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return templates.filter((t) => {
      if (filterType && t.documentType !== filterType) return false
      if (q && !t.title.toLowerCase().includes(q) && !t.documentTypeLabel.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [templates, search, filterType])

  const handleCreated = (id: string) => {
    setCreateModalOpen(false)
    router.push(`/dashboard/configuracion/empresa/plantillas/${id}`)
  }

  // ── Plan gate state ──────────────────────────────────────────────────────
  if (!loading && errorCode === 'PLAN_UPGRADE_REQUIRED') {
    return (
      <div className="space-y-6">
        <BackLink />
        <PremiumEmptyState
          variant="discover"
          icon={Sparkles}
          eyebrow="Función EMPRESA"
          title="Crea tu <em>biblioteca de contratos</em> y envíalos con un click."
          subtitle="Sube tus contratos revisados por tu abogado, define placeholders y el sistema los completa con los datos de cada trabajador — sin IA generando cláusulas."
          hints={[
            { icon: CheckCircle2, text: 'Zero liability: tu contenido, tu firma' },
            { icon: Layers, text: 'Merge determinístico' },
            { icon: PenLine, text: 'PDF listo para firmar' },
          ]}
          cta={{ label: 'Ver planes', href: '/dashboard/planes' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ZeroLiabilityModal />
      <BackLink />

      <PageHeader
        eyebrow="Biblioteca de contratos"
        title="Tus plantillas, <em>listas para completar</em>."
        subtitle="La empresa carga sus propios contratos (aprobados por su abogado) con placeholders como {{NOMBRE}} o {{SUELDO}}. Al generarlo para un trabajador, el sistema los reemplaza automáticamente."
        actions={
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva plantilla
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--text-tertiary)]" />
          <input
            type="search"
            placeholder="Buscar por nombre o tipo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[color:var(--border-default)] bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
        >
          <option value="">Todos los tipos</option>
          {DOCUMENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingGrid />
      ) : templates.length === 0 ? (
        <PremiumEmptyState
          variant="invite"
          icon={FileText}
          eyebrow="Primera plantilla"
          title="Pega tu contrato y <em>marca los campos variables</em>."
          subtitle="Empieza cargando el contrato indefinido que ya usas. Marca los datos del trabajador con {{LLAVES}} y el sistema los completará por ti cada vez que lo generes."
          hints={[
            { icon: Layers, text: 'Detección automática de placeholders' },
            { icon: PenLine, text: 'Editor con vista previa' },
            { icon: Files, text: 'PDF listo para firmar' },
          ]}
          cta={{ label: 'Crear mi primera plantilla', onClick: () => setCreateModalOpen(true) }}
          helpLink={{ label: 'Ver guía de placeholders', href: '/dashboard/ayuda' }}
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border-default)] bg-white py-16 text-center">
          <p className="text-sm text-[color:var(--text-secondary)]">
            Ninguna plantilla coincide con los filtros actuales.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </ul>
      )}

      <CreateTemplateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={handleCreated}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function BackLink() {
  return (
    <Link
      href="/dashboard/configuracion/empresa"
      className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      Información de la empresa
    </Link>
  )
}

function TemplateCard({ template }: { template: TemplateListItem }) {
  const hasUnmapped = template.unmapped.length > 0

  return (
    <li
      className="group relative overflow-hidden rounded-2xl border border-[color:var(--border-default)] bg-white p-5 transition-all hover:border-emerald-300 hover:shadow-[0_6px_24px_rgba(4,120,87,0.08)]"
    >
      <Link
        href={`/dashboard/configuracion/empresa/plantillas/${template.id}`}
        className="absolute inset-0"
        aria-label={`Editar ${template.title}`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
            border: '0.5px solid rgba(16,185,129,0.25)',
          }}
        >
          <FileText className="h-4.5 w-4.5 text-emerald-700" />
        </div>

        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: 'rgba(15,23,42,0.04)',
            color: 'var(--text-secondary)',
          }}
        >
          v{template.version}
        </span>
      </div>

      <div className="relative mt-3 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
          {template.documentTypeLabel}
        </p>
        <h3
          className="text-base font-semibold leading-snug text-[color:var(--text-primary)]"
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
        >
          {template.title}
        </h3>
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Campos" value={template.placeholderCount} />
        <Stat label="Mapeados" value={`${template.mappingCount}/${template.placeholderCount}`} />
        <Stat label="Usos" value={template.usageCount} />
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        {hasUnmapped ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
            <AlertTriangle className="h-3 w-3" />
            {template.unmapped.length} sin mapear
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Lista para usar
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--text-tertiary)]">
          <Clock className="h-3 w-3" />
          {formatRelative(template.updatedAt)}
        </span>
      </div>
    </li>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xl font-semibold text-[color:var(--text-primary)]" style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>
        {value}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--text-tertiary)]">
        {label}
      </p>
    </div>
  )
}

function LoadingGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <li
          key={i}
          className="h-[220px] animate-pulse rounded-2xl border border-[color:var(--border-default)] bg-white"
        />
      ))}
    </ul>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Create modal
// ═══════════════════════════════════════════════════════════════════════════

function CreateTemplateModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState('CONTRATO_INDEFINIDO')
  const [content, setContent] = useState(SAMPLE_TEMPLATE)
  const [submitting, setSubmitting] = useState(false)

  const detectedPlaceholders = useMemo(() => {
    const seen = new Set<string>()
    const re = /\{\{\s*([A-Z_][A-Z0-9_]*)\s*\}\}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) seen.add(m[1])
    return Array.from(seen)
  }, [content])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || title.trim().length < 3) {
      toast.error('El título debe tener al menos 3 caracteres')
      return
    }
    if (content.trim().length < 30) {
      toast.error('El contenido es demasiado corto')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/org-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          documentType,
          content,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const body = (await res.json()) as { data: { id: string } }
      toast.success('Plantilla creada. Ahora mapeá los placeholders.')
      onCreated(body.data.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear plantilla')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)} title="Nueva plantilla" size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contrato indefinido (Régimen General 2026)"
              className="w-full rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
              maxLength={200}
              required
            />
          </Field>
          <Field label="Tipo de documento" required>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
            >
              {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="Contenido del contrato"
          required
          hint={`Escribí placeholders así: {{NOMBRE_COMPLETO}}, {{DNI}}, {{SUELDO}}. Solo MAYÚSCULAS, números y guión bajo.`}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            className="w-full rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-3 font-mono text-[13px] leading-relaxed outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
            required
          />
        </Field>

        {detectedPlaceholders.length > 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
              {detectedPlaceholders.length} placeholder(s) detectados
            </p>
            <div className="flex flex-wrap gap-1.5">
              {detectedPlaceholders.map((p) => (
                <code
                  key={p}
                  className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-900 ring-1 ring-emerald-200"
                >
                  {'{{'}
                  {p}
                  {'}}'}
                </code>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-emerald-700">
              En el siguiente paso mapearás cada uno a un dato de tu trabajador/empresa.
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-3 border-t border-[color:var(--border-default)] pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} loading={submitting}>
            Crear y mapear campos
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1 text-xs font-semibold text-[color:var(--text-primary)]">
        {label}
        {required ? <span className="text-rose-600">*</span> : null}
      </span>
      {children}
      {hint ? <p className="text-[11px] text-[color:var(--text-tertiary)]">{hint}</p> : null}
    </label>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Utils
// ═══════════════════════════════════════════════════════════════════════════

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const SAMPLE_TEMPLATE = `CONTRATO DE TRABAJO A PLAZO INDETERMINADO

Conste por el presente documento el contrato de trabajo que celebran:

De una parte, {{RAZON_SOCIAL}}, con RUC {{RUC}}, con domicilio en {{EMPRESA_DIRECCION}}, debidamente representada por su {{REPRESENTANTE_LEGAL}}, a quien en adelante se le denominará EL EMPLEADOR.

Y de la otra parte, {{NOMBRE_COMPLETO}}, identificado(a) con DNI N° {{DNI}}, con domicilio en {{DIRECCION}}, a quien en adelante se le denominará EL TRABAJADOR.

PRIMERA — OBJETO DEL CONTRATO
EL TRABAJADOR se obliga a prestar sus servicios personales para EL EMPLEADOR desempeñando el cargo de {{CARGO}} en el área de {{AREA}}.

SEGUNDA — REMUNERACIÓN
EL EMPLEADOR abonará a EL TRABAJADOR una remuneración mensual de S/ {{SUELDO}} ({{SUELDO_LETRAS}}).

TERCERA — INICIO DE LABORES
El presente contrato iniciará el {{FECHA_INGRESO}}.

CUARTA — JORNADA
EL TRABAJADOR cumplirá una jornada semanal de {{JORNADA}} horas.

En señal de conformidad, firman las partes en {{CIUDAD}}, a los {{FECHA_HOY_LETRAS}}.`
