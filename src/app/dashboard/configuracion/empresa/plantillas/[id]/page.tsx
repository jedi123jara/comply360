'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Save,
  Trash2,
  Play,
  Eye,
  FileText,
  Layers,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/sonner-toaster'
import {
  PLACEHOLDER_CATALOG,
  type PlaceholderField,
} from '@/lib/templates/org-template-engine'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface TemplateDetail {
  id: string
  title: string
  documentType: string
  documentTypeLabel: string
  contractType: string | null
  content: string
  placeholders: string[]
  mappings: Record<string, string>
  notes: string | null
  usageCount: number
  version: number
  validUntil: string | null
  createdAt: string
  updatedAt: string
}

interface WorkerOption {
  id: string
  firstName: string
  lastName: string
  dni: string
  position: string | null
}

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════

export default function PlantillaEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [template, setTemplate] = useState<TemplateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/org-templates/${id}`, { cache: 'no-store' })
      if (res.status === 404) {
        router.push('/dashboard/configuracion/empresa/plantillas')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as { data: TemplateDetail }
      setTemplate(body.data)
      setTitle(body.data.title)
      setContent(body.data.content)
      setMappings(body.data.mappings ?? {})
      setNotes(body.data.notes ?? '')
    } catch (err) {
      console.error('[plantilla] load', err)
      toast.error('No se pudo cargar la plantilla')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    void load()
  }, [load])

  const detectedPlaceholders = useMemo(() => {
    const seen = new Set<string>()
    const re = /\{\{\s*([A-Z_][A-Z0-9_]*)\s*\}\}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) seen.add(m[1])
    return Array.from(seen)
  }, [content])

  const unmapped = useMemo(
    () => detectedPlaceholders.filter((p) => !mappings[p]),
    [detectedPlaceholders, mappings],
  )

  const dirty = useMemo(() => {
    if (!template) return false
    if (title !== template.title) return true
    if (content !== template.content) return true
    if (notes !== (template.notes ?? '')) return true
    const origKeys = Object.keys(template.mappings ?? {}).sort()
    const curKeys = Object.keys(mappings).sort()
    if (origKeys.length !== curKeys.length) return true
    if (origKeys.some((k, i) => k !== curKeys[i])) return true
    if (origKeys.some((k) => template.mappings[k] !== mappings[k])) return true
    return false
  }, [template, title, content, notes, mappings])

  const handleSave = async () => {
    if (!template) return
    if (!title.trim() || title.trim().length < 3) {
      toast.error('El título debe tener al menos 3 caracteres')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/org-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content, mappings, notes }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success('Plantilla guardada')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!template) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/org-templates/${template.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success('Plantilla eliminada')
      router.push('/dashboard/configuracion/empresa/plantillas')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
      setDeleting(false)
    }
  }

  const insertPlaceholder = (key: string) => {
    setContent((prev) => `${prev}${prev.endsWith(' ') || prev.endsWith('\n') || prev === '' ? '' : ' '}{{${key}}}`)
  }

  const autoMap = () => {
    const next = { ...mappings }
    let added = 0
    for (const placeholder of detectedPlaceholders) {
      if (next[placeholder]) continue
      const catalogEntry = PLACEHOLDER_CATALOG.find((c) => c.key === placeholder)
      if (catalogEntry) {
        next[placeholder] = catalogEntry.path
        added++
      }
    }
    if (added > 0) {
      setMappings(next)
      toast.success(`Mapeados ${added} placeholder(s) automáticamente`)
    } else {
      toast.info('No hay placeholders nuevos del catálogo para mapear')
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!template) return null

  return (
    <div className="space-y-6">
      <BackLink />

      <PageHeader
        eyebrow={template.documentTypeLabel}
        title={template.title}
        subtitle={`Versión ${template.version} · ${template.usageCount} uso(s) · Actualizada ${formatRelative(template.updatedAt)}`}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setGenerateModalOpen(true)}
              disabled={unmapped.length > 0 && detectedPlaceholders.length > 0}
              title={unmapped.length > 0 ? 'Mapeá todos los placeholders primero' : undefined}
            >
              <Play className="h-4 w-4" /> Generar
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!dirty || saving}>
              <Save className="h-4 w-4" /> Guardar
            </Button>
          </>
        }
      />

      {/* Warning de unmapped */}
      {unmapped.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {unmapped.length} placeholder(s) sin mapear
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Al generar el documento, estos campos quedarán como “____________”.
                Mapéalos en el panel derecho o usa “Auto-mapear” para asignarlos desde el catálogo.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {unmapped.map((p) => (
                  <code
                    key={p}
                    className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-300"
                  >
                    {'{{'}
                    {p}
                    {'}}'}
                  </code>
                ))}
              </div>
            </div>
            <Button variant="secondary" onClick={autoMap}>
              <Layers className="h-3.5 w-3.5" /> Auto-mapear
            </Button>
          </div>
        </div>
      ) : detectedPlaceholders.length > 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {detectedPlaceholders.length} placeholder(s) mapeados. Lista para generar.
          </div>
        </div>
      ) : null}

      {/* Grid: editor + panels */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Editor */}
        <div className="space-y-4">
          <Card title="Título">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
              maxLength={200}
            />
          </Card>

          <Card
            title="Contenido"
            subtitle={`Usa {{MAYÚSCULAS_CON_GUIÓN_BAJO}} para placeholders.  ${content.length} caracteres.`}
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="w-full rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-3 font-mono text-[13px] leading-relaxed outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
            />
          </Card>

          <Card title="Notas internas">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Instrucciones para el equipo: cuándo usar esta plantilla, consideraciones especiales…"
              className="w-full rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
            />
          </Card>

          <div className="flex justify-between rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-rose-900">Eliminar plantilla</p>
              <p className="text-xs text-rose-700">Esta acción no se puede deshacer.</p>
            </div>
            <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          </div>
        </div>

        {/* Sidebar: placeholders + catalog */}
        <div className="space-y-4">
          <Card title="Placeholders detectados" subtitle={`${detectedPlaceholders.length} campo(s) variables`}>
            {detectedPlaceholders.length === 0 ? (
              <p className="text-xs text-[color:var(--text-tertiary)]">
                El contenido aún no tiene placeholders. Agregalos como {'{{NOMBRE}}'}.
              </p>
            ) : (
              <ul className="space-y-2">
                {detectedPlaceholders.map((p) => {
                  const currentPath = mappings[p] ?? ''
                  const catalogOptions = PLACEHOLDER_CATALOG
                  return (
                    <li key={p} className="space-y-1 rounded-xl border border-[color:var(--border-default)] bg-white p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-[11px] font-semibold text-emerald-900">
                          {'{{'}
                          {p}
                          {'}}'}
                        </code>
                        {currentPath ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Mapeado
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-700">
                            Sin mapear
                          </span>
                        )}
                      </div>
                      <select
                        value={currentPath}
                        onChange={(e) => {
                          const v = e.target.value
                          setMappings((prev) => {
                            const next = { ...prev }
                            if (v) next[p] = v
                            else delete next[p]
                            return next
                          })
                        }}
                        className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-2 py-1.5 text-[12px] outline-none focus:border-emerald-400"
                      >
                        <option value="">— Seleccionar dato —</option>
                        <optgroup label="Trabajador">
                          {catalogOptions
                            .filter((c) => c.group === 'worker')
                            .map((c) => (
                              <option key={c.path} value={c.path}>
                                {c.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Empresa">
                          {catalogOptions
                            .filter((c) => c.group === 'org')
                            .map((c) => (
                              <option key={c.path} value={c.path}>
                                {c.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Metadata">
                          {catalogOptions
                            .filter((c) => c.group === 'meta')
                            .map((c) => (
                              <option key={c.path} value={c.path}>
                                {c.label}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card title="Catálogo de campos" subtitle="Click para insertar en el contenido">
            <div className="space-y-3">
              {(['worker', 'org', 'meta'] as const).map((group) => (
                <div key={group}>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                    {group === 'worker' ? 'Trabajador' : group === 'org' ? 'Empresa' : 'Metadata'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDER_CATALOG.filter((c) => c.group === group).map((c: PlaceholderField) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => insertPlaceholder(c.key)}
                        title={c.description}
                        className="rounded-md border border-[color:var(--border-default)] bg-white px-2 py-1 text-[10px] font-semibold text-[color:var(--text-primary)] transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        {'{{'}
                        {c.key}
                        {'}}'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Delete confirmation */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="¿Eliminar esta plantilla?"
        description="La plantilla será eliminada de tu biblioteca. Los contratos ya generados NO se eliminan."
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting} disabled={deleting}>
            Eliminar
          </Button>
        </div>
      </Modal>

      {/* Generate modal */}
      <GenerateModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        templateId={template.id}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Generate modal
// ═══════════════════════════════════════════════════════════════════════════

function GenerateModal({
  open,
  onOpenChange,
  templateId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  templateId: string
}) {
  const [workers, setWorkers] = useState<WorkerOption[]>([])
  const [loadingWorkers, setLoadingWorkers] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [preview, setPreview] = useState<{
    rendered: string
    warnings: string[]
    contractId?: string
  } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  useEffect(() => {
    if (!open) {
      setPreview(null)
      setSelectedWorkerId('')
      return
    }
    setLoadingWorkers(true)
    fetch('/api/workers?status=ACTIVE&limit=200')
      .then((r) => r.json())
      .then((body: { data?: WorkerOption[]; workers?: WorkerOption[] }) => {
        const list = body.data ?? body.workers ?? []
        setWorkers(list)
      })
      .catch(() => toast.error('No se pudieron cargar los trabajadores'))
      .finally(() => setLoadingWorkers(false))
  }, [open])

  const handlePreview = async () => {
    if (!selectedWorkerId) {
      toast.error('Seleccioná un trabajador')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch(`/api/org-templates/${templateId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: selectedWorkerId, persist: false }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const body = (await res.json()) as {
        data: { rendered: string; warnings: string[]; contractId?: string }
      }
      setPreview(body.data)
      if (body.data.warnings.length === 0) {
        toast.success('Documento generado')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!selectedWorkerId) {
      toast.error('Seleccioná un trabajador')
      return
    }
    setDownloadingPdf(true)
    try {
      const res = await fetch(`/api/org-templates/${templateId}/generate?format=pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: selectedWorkerId, persist: true }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = res.headers
        .get('content-disposition')
        ?.match(/filename="([^"]+)"/)?.[1]
        ?? `documento-${Date.now()}.pdf`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Descarga iniciada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al descargar PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleCopy = () => {
    if (!preview) return
    navigator.clipboard.writeText(preview.rendered)
    toast.success('Texto copiado al portapapeles')
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Generar documento para un trabajador"
      description="Elegí al trabajador. El sistema reemplazará los placeholders con sus datos reales."
      size="xl"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <select
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(e.target.value)}
            disabled={loadingWorkers}
            className="rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
          >
            <option value="">
              {loadingWorkers ? 'Cargando trabajadores…' : '— Seleccioná un trabajador —'}
            </option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.firstName} {w.lastName} — DNI {w.dni}
                {w.position ? ` (${w.position})` : ''}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            onClick={handlePreview}
            loading={generating}
            disabled={generating || !selectedWorkerId}
          >
            <Eye className="h-4 w-4" /> Previsualizar
          </Button>
          <Button
            onClick={handleDownload}
            loading={downloadingPdf}
            disabled={downloadingPdf || !selectedWorkerId}
          >
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>

        {preview ? (
          <div className="space-y-3">
            {preview.warnings.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
                {preview.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-900">
                    <AlertTriangle className="mr-1 inline h-3 w-3" /> {w}
                  </p>
                ))}
              </div>
            ) : null}
            <div className="relative max-h-[50vh] overflow-y-auto rounded-xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-5">
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-3 top-3 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-[color:var(--text-secondary)] ring-1 ring-[color:var(--border-default)] transition-colors hover:text-[color:var(--text-primary)]"
                title="Copiar texto"
              >
                <Copy className="mr-1 inline h-3 w-3" /> Copiar
              </button>
              <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-[color:var(--text-primary)]">
                {preview.rendered}
              </pre>
            </div>
            <p className="text-[11px] text-[color:var(--text-tertiary)]">
              Esta es la vista previa.  Al descargar el PDF también se creará un contrato en borrador
              asociado al trabajador.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-[color:var(--border-default)] px-6 py-12 text-center">
            <div>
              <FileText className="mx-auto mb-3 h-8 w-8 text-[color:var(--text-tertiary)]" />
              <p className="text-sm font-medium text-[color:var(--text-primary)]">
                Seleccioná un trabajador y previsualizá
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                Antes de descargar el PDF, confirmá que los datos estén correctos.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function BackLink() {
  return (
    <Link
      href="/dashboard/configuracion/empresa/plantillas"
      className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      Todas las plantillas
    </Link>
  )
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-default)] bg-white p-4 sm:p-5">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3>
        {subtitle ? (
          <p className="text-[11px] text-[color:var(--text-tertiary)]">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </section>
  )
}

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
