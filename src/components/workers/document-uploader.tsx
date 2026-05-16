'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Loader2,
  FileUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

// =============================================
// Types
// =============================================

interface WorkerDocument {
  id: string
  category: string
  documentType: string
  title: string
  fileUrl: string | null
  fileSize: number | null
  mimeType: string | null
  isRequired: boolean
  expiresAt: string | null
  verifiedAt: string | null
  status: string
  createdAt: string
}

type DocStatus = 'PENDING' | 'UPLOADED' | 'VERIFIED' | 'EXPIRED' | 'MISSING'
type DocCategory = 'INGRESO' | 'VIGENTE' | 'SST' | 'PREVISIONAL' | 'CESE'

interface LegajoDocDefinition {
  category: DocCategory
  type: string
  title: string
  required: boolean
}

interface DocumentUploaderProps {
  workerId: string
  documents: WorkerDocument[]
  onDocumentUploaded?: () => void
  onViewDocument?: (url: string, title: string) => void
}

// =============================================
// Constants
// =============================================

const CATEGORY_LABELS: Record<DocCategory, string> = {
  INGRESO: 'Documentos de Ingreso',
  VIGENTE: 'Documentos Vigentes',
  SST: 'Seguridad y Salud en el Trabajo',
  PREVISIONAL: 'Previsional',
  CESE: 'Cese',
}

const CATEGORY_ORDER: DocCategory[] = ['INGRESO', 'VIGENTE', 'SST', 'PREVISIONAL', 'CESE']

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  PENDING: { label: 'Pendiente', variant: 'warning' },
  UPLOADED: { label: 'Subido', variant: 'info' },
  VERIFIED: { label: 'Verificado', variant: 'success' },
  EXPIRED: { label: 'Vencido', variant: 'danger' },
  MISSING: { label: 'Faltante', variant: 'danger' },
}

const LEGAJO_DOCS: LegajoDocDefinition[] = [
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
  { category: 'SST', type: 'capacitacion_sst', title: 'Capacitaciones SST (4/anio)', required: true },
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

// =============================================
// Upload Modal
// =============================================

interface UploadModalProps {
  workerId: string
  docDef: LegajoDocDefinition | null
  onClose: () => void
  onUploaded: () => void
}

function UploadModal({ workerId, docDef, onClose, onUploaded }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Custom fields for non-standard uploads
  const [customTitle, setCustomTitle] = useState(docDef?.title ?? '')
  const [customCategory, setCustomCategory] = useState<DocCategory>(docDef?.category ?? 'INGRESO')
  const [customDocType, setCustomDocType] = useState(docDef?.type ?? '')
  const [expiresAt, setExpiresAt] = useState('')

  const isCustomUpload = !docDef

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setError(null)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setError(null)
    }
  }, [])

  const handleUpload = async () => {
    if (!file) return

    const title = isCustomUpload ? customTitle : docDef.title
    const category = isCustomUpload ? customCategory : docDef.category
    const documentType = isCustomUpload ? customDocType : docDef.type
    const isRequired = isCustomUpload ? false : docDef.required

    if (!title.trim() || !documentType.trim()) {
      setError('Complete todos los campos requeridos')
      return
    }

    setUploading(true)
    setError(null)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      formData.append('documentType', documentType)
      formData.append('title', title)
      formData.append('isRequired', String(isRequired))
      if (expiresAt) formData.append('expiresAt', expiresAt)

      setProgress(40)

      const res = await fetch(`/api/workers/${workerId}/documents`, {
        method: 'POST',
        body: formData,
      })

      setProgress(80)

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Error al subir el archivo')
      }

      setProgress(100)

      // Brief delay so user sees 100%
      setTimeout(() => {
        onUploaded()
        onClose()
      }, 400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo')
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#141824] rounded-2xl shadow-xl w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {isCustomUpload ? 'Subir Documento' : 'Subir Documento'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {isCustomUpload
                ? 'Suba un documento adicional al legajo'
                : docDef.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Custom fields when no docDef */}
        {isCustomUpload && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Titulo del documento *
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-white/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Ej: Constancia de capacitacion"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Categoria *
                </label>
                <select
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value as DocCategory)}
                  className="w-full px-3 py-2 text-sm border border-white/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {CATEGORY_ORDER.map(cat => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Tipo documento *
                </label>
                <input
                  type="text"
                  value={customDocType}
                  onChange={e => setCustomDocType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-white/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Ej: constancia_extra"
                />
              </div>
            </div>
          </div>
        )}

        {/* Expiration date (always shown) */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Fecha de vencimiento (opcional)
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-white/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Drag & drop zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
            dragActive
              ? 'border-primary bg-primary/5'
              : file
                ? 'border-green-300 bg-green-50'
                : 'border-white/[0.08] hover:border-white/10 hover:bg-gray-50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />

          {file ? (
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-500 shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  setFile(null)
                }}
                className="p-1 hover:bg-[color:var(--neutral-100)] rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ) : (
            <>
              <FileUp className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600 font-medium">
                Arrastre un archivo aqui o haga clic para seleccionar
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, JPEG, PNG o DOCX. Maximo 10MB.
              </p>
            </>
          )}
        </div>

        {/* Progress bar */}
        {uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Subiendo archivo...</span>
              <span className="text-xs font-medium text-primary">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-[color:var(--neutral-100)] rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all',
              file && !uploading
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-[color:var(--neutral-100)] text-gray-400 cursor-not-allowed'
            )}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Subiendo...' : 'Subir documento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================
// Document Row
// =============================================

interface DocumentRowProps {
  docDef: LegajoDocDefinition
  uploadedDoc: WorkerDocument | undefined
  onUploadClick: () => void
  workerId: string
  onVerified?: () => void
  onViewDocument?: (url: string, title: string) => void
}

function DocumentRow({ docDef, uploadedDoc, onUploadClick, workerId, onVerified, onViewDocument }: DocumentRowProps) {
  const status = uploadedDoc?.status as DocStatus
  const [verifying, setVerifying] = useState(false)

  // Expiration logic
  const expiresAt = uploadedDoc?.expiresAt ? new Date(uploadedDoc.expiresAt) : null
  const now = new Date()
  const daysUntilExpiry = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000) : null
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30

  const handleVerify = async () => {
    if (!uploadedDoc) return
    setVerifying(true)
    try {
      const res = await fetch(`/api/workers/${workerId}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: uploadedDoc.id, action: 'verify' }),
      })
      if (res.ok) onVerified?.()
    } catch { /* silently fail */ }
    finally { setVerifying(false) }
  }

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[color:var(--neutral-50)] transition-colors group">
      {/* Status icon */}
      {isExpired ? (
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
      ) : status === 'VERIFIED' ? (
        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
      ) : status === 'UPLOADED' ? (
        <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
      ) : status === 'EXPIRED' ? (
        <Clock className="w-4 h-4 text-red-400 shrink-0" />
      ) : docDef.required ? (
        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-white/10 shrink-0" />
      )}

      {/* Title + expiry warning */}
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm', uploadedDoc ? 'text-gray-300' : 'text-gray-500')}>
          {docDef.title}
          {docDef.required && <span className="text-red-400 ml-1">*</span>}
        </span>
        {isExpired && (
          <span className="ml-2 text-[10px] font-semibold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
            Vencido hace {Math.abs(daysUntilExpiry!)} días
          </span>
        )}
        {isExpiringSoon && (
          <span className="ml-2 text-[10px] font-semibold text-amber-400 bg-amber-50 px-1.5 py-0.5 rounded">
            Vence en {daysUntilExpiry} días
          </span>
        )}
      </div>

      {/* Status badge */}
      {status && STATUS_CONFIG[status] && (
        <Badge variant={isExpired ? 'danger' : STATUS_CONFIG[status].variant} size="sm">
          {isExpired ? 'Vencido' : STATUS_CONFIG[status].label}
        </Badge>
      )}

      {/* Verify button (only for UPLOADED docs) */}
      {status === 'UPLOADED' && !isExpired && (
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="p-1 text-gray-400 hover:text-green-400 rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Verificar documento"
        >
          {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* View button */}
      {uploadedDoc?.fileUrl && (
        <button
          onClick={() => onViewDocument
            ? onViewDocument(uploadedDoc.fileUrl!, uploadedDoc.title || docDef.title)
            : window.open(uploadedDoc.fileUrl!, '_blank')
          }
          className="p-1 text-gray-400 hover:text-primary rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Ver documento"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Upload/Replace button */}
      <button
        onClick={onUploadClick}
        className={cn(
          'flex items-center gap-1 text-xs font-medium rounded px-2 py-1 transition-all',
          uploadedDoc
            ? 'text-gray-400 hover:text-primary opacity-0 group-hover:opacity-100'
            : 'text-primary hover:bg-primary/5'
        )}
      >
        <Upload className="w-3 h-3" />
        {uploadedDoc ? 'Reemplazar' : 'Subir'}
      </button>
    </div>
  )
}

// =============================================
// Main Component: DocumentUploader
// =============================================

export function DocumentUploader({ workerId, documents: initialDocuments, onDocumentUploaded, onViewDocument }: DocumentUploaderProps) {
  const [documents, setDocuments] = useState<WorkerDocument[]>(initialDocuments)
  const [uploadTarget, setUploadTarget] = useState<LegajoDocDefinition | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isCustomUpload, setIsCustomUpload] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Keep documents in sync with parent
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      setDocuments(initialDocuments)
    })
    return () => {
      cancelled = true
    }
  }, [initialDocuments])

  // Refresh documents from server
  const refreshDocuments = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/workers/${workerId}/documents`)
      if (res.ok) {
        const json = await res.json()
        setDocuments(json.data)
      }
    } catch (err) {
      console.error('Error refreshing documents:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const handleUploadClick = (docDef: LegajoDocDefinition) => {
    setUploadTarget(docDef)
    setIsCustomUpload(false)
    setShowUploadModal(true)
  }

  const handleCustomUpload = () => {
    setUploadTarget(null)
    setIsCustomUpload(true)
    setShowUploadModal(true)
  }

  const handleUploaded = () => {
    refreshDocuments()
    onDocumentUploaded?.()
  }

  const handleCloseModal = () => {
    setShowUploadModal(false)
    setUploadTarget(null)
    setIsCustomUpload(false)
  }

  // Build a map of uploaded document types for quick lookup
  const docByType = new Map<string, WorkerDocument>()
  for (const doc of documents) {
    // Keep the most recent upload for each type
    if (!docByType.has(doc.documentType) || doc.createdAt > docByType.get(doc.documentType)!.createdAt) {
      docByType.set(doc.documentType, doc)
    }
  }

  // Calculate progress
  const requiredDocs = LEGAJO_DOCS.filter(d => d.required)
  const uploadedRequired = requiredDocs.filter(d => {
    const doc = docByType.get(d.type)
    return doc && (doc.status === 'UPLOADED' || doc.status === 'VERIFIED')
  }).length
  const legajoPercent = requiredDocs.length > 0
    ? Math.round((uploadedRequired / requiredDocs.length) * 100)
    : 0

  // Find extra documents not in the standard legajo definition
  const standardTypes = new Set(LEGAJO_DOCS.map(d => d.type))
  const extraDocuments = documents.filter(d => !standardTypes.has(d.documentType))

  // Calculate expiry stats
  const now = new Date()
  const expiredCount = documents.filter(d => {
    if (!d.expiresAt) return false
    return new Date(d.expiresAt) <= now
  }).length
  const expiringSoonCount = documents.filter(d => {
    if (!d.expiresAt) return false
    const exp = new Date(d.expiresAt)
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86_400_000)
    return daysLeft > 0 && daysLeft <= 30
  }).length

  return (
    <div>
      {/* Progress header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-300">
              Completitud del Legajo
            </span>
            <span className={cn(
              'text-sm font-bold',
              legajoPercent >= 70 ? 'text-green-600' : legajoPercent >= 40 ? 'text-amber-600' : 'text-red-600'
            )}>
              {legajoPercent}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-[color:var(--neutral-100)] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                legajoPercent >= 70 ? 'bg-green-500' : legajoPercent >= 40 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${legajoPercent}%` }}
            />
          </div>
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          <span className="text-xs text-gray-500 block">{uploadedRequired}/{requiredDocs.length} obligatorios</span>
          {(expiredCount > 0 || expiringSoonCount > 0) && (
            <div className="flex items-center gap-2">
              {expiredCount > 0 && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {expiredCount} vencido{expiredCount > 1 ? 's' : ''}
                </span>
              )}
              {expiringSoonCount > 0 && (
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {expiringSoonCount} por vencer
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500">
          Los documentos marcados con <span className="text-red-400 font-semibold">*</span> son obligatorios para el cumplimiento laboral.
        </p>
        <button
          onClick={handleCustomUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Subir otro documento
        </button>
      </div>

      {/* Documents by category */}
      {CATEGORY_ORDER.map(cat => {
        const catDocs = LEGAJO_DOCS.filter(d => d.category === cat)
        return (
          <div key={cat} className="mb-6">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {CATEGORY_LABELS[cat]}
            </h4>
            <div className="space-y-1">
              {catDocs.map(docDef => (
                <DocumentRow
                  key={docDef.type}
                  docDef={docDef}
                  uploadedDoc={docByType.get(docDef.type)}
                  onUploadClick={() => handleUploadClick(docDef)}
                  workerId={workerId}
                  onVerified={refreshDocuments}
                  onViewDocument={onViewDocument}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Extra documents (not in standard legajo) */}
      {extraDocuments.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Documentos Adicionales
          </h4>
          <div className="space-y-1">
            {extraDocuments.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[color:var(--neutral-50)] transition-colors group"
              >
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-sm text-gray-300 flex-1">{doc.title}</span>
                <Badge
                  variant={STATUS_CONFIG[doc.status]?.variant ?? 'neutral'}
                  size="sm"
                >
                  {STATUS_CONFIG[doc.status]?.label ?? doc.status}
                </Badge>
                {doc.fileUrl && (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-primary rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Ver documento"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh indicator */}
      {refreshing && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          <span className="text-xs text-gray-400 ml-2">Actualizando...</span>
        </div>
      )}

      {/* Upload modal */}
      {showUploadModal && (
        <UploadModal
          workerId={workerId}
          docDef={isCustomUpload ? null : uploadTarget}
          onClose={handleCloseModal}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  )
}
