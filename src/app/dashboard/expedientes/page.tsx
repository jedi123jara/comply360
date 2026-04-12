'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  FolderOpen,
  Search,
  Eye,
  Download,
  Trash2,
  Upload,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  CheckCircle,
  AlertTriangle,
  XCircle,
  X,
  Loader2,
  Filter,
  ChevronDown,
  CalendarDays,
  Tag,
  FolderSearch,
  UploadCloud,
  FileCheck,
  FileClock,
  FileX,
  ScanSearch,
  Layers,
  CheckSquare,
  Square,
} from 'lucide-react'

/* -------------------------------------------------- */
/*  Types                                             */
/* -------------------------------------------------- */

type DocStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO'
type DocCategory =
  | 'CONTRATOS_LABORALES'
  | 'POLITICAS_INTERNAS'
  | 'DOCUMENTOS_SST'
  | 'REGISTROS_SUNAFIL'
  | 'BOLETAS_PAGO'
  | 'DOCUMENTOS_PERSONALES'

type FileType = 'PDF' | 'DOC' | 'XLS' | 'IMG' | 'OTHER'

interface Documento {
  id: string
  title: string
  fileName: string
  fileUrl: string
  fileType: FileType
  mimeType: string
  fileSize: number
  category: DocCategory
  status: DocStatus
  uploadDate: string
  expirationDate: string | null
  daysUntilExpiry: number | null
  uploadedBy: string
  isDigitized: boolean
}

interface DocStats {
  total: number
  vigentes: number
  porVencer: number
  vencidos: number
  sinDigitalizar: number
}

/* -------------------------------------------------- */
/*  Config                                            */
/* -------------------------------------------------- */

const CATEGORY_CONFIG: Record<DocCategory, { label: string; icon: typeof FileText }> = {
  CONTRATOS_LABORALES: { label: 'Contratos laborales', icon: FileCheck },
  POLITICAS_INTERNAS: { label: 'Politicas internas', icon: FileText },
  DOCUMENTOS_SST: { label: 'Documentos SST', icon: AlertTriangle },
  REGISTROS_SUNAFIL: { label: 'Registros SUNAFIL', icon: FolderSearch },
  BOLETAS_PAGO: { label: 'Boletas de pago', icon: FileSpreadsheet },
  DOCUMENTOS_PERSONALES: { label: 'Documentos personales', icon: File },
}

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; bgCard: string; icon: typeof CheckCircle }> = {
  VIGENTE: {
    label: 'Vigente',
    color: 'bg-emerald-100 text-emerald-700 bg-emerald-900/30 text-emerald-400',
    bgCard: 'border-emerald-200 border-emerald-800',
    icon: CheckCircle,
  },
  POR_VENCER: {
    label: 'Por vencer',
    color: 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400',
    bgCard: 'border-amber-200 border-amber-800',
    icon: AlertTriangle,
  },
  VENCIDO: {
    label: 'Vencido',
    color: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400',
    bgCard: 'border-red-200 border-red-800',
    icon: XCircle,
  },
}

const FILE_ICON_CONFIG: Record<FileType, { icon: typeof FileText; color: string }> = {
  PDF: { icon: FileText, color: 'text-red-500 bg-red-50 bg-red-900/20' },
  DOC: { icon: FileText, color: 'text-blue-500 bg-blue-50 bg-blue-900/20' },
  XLS: { icon: FileSpreadsheet, color: 'text-green-600 bg-green-50 bg-green-900/20' },
  IMG: { icon: ImageIcon, color: 'text-purple-500 bg-purple-50 bg-purple-900/20' },
  OTHER: { icon: File, color: 'text-gray-500 bg-white/[0.02] bg-gray-700' },
}

const ACCEPTED_FORMATS = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB


function computeStats(docs: Documento[]): DocStats {
  return {
    total: docs.length,
    vigentes: docs.filter(d => d.status === 'VIGENTE').length,
    porVencer: docs.filter(d => d.status === 'POR_VENCER').length,
    vencidos: docs.filter(d => d.status === 'VENCIDO').length,
    sinDigitalizar: docs.filter(d => !d.isDigitized).length,
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileTypeFromName(name: string): FileType {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'PDF'
  if (['doc', 'docx'].includes(ext)) return 'DOC'
  if (['xls', 'xlsx'].includes(ext)) return 'XLS'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'IMG'
  return 'OTHER'
}

/* -------------------------------------------------- */
/*  Main Component                                    */
/* -------------------------------------------------- */

export default function ExpedientesPage() {
  const [documents, setDocuments] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | 'ALL'>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<DocStatus | 'ALL'>('ALL')
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())
  const [bulkDownloadInfo, setBulkDownloadInfo] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showCategorySidebar, setShowCategorySidebar] = useState(true)

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadCategory, setUploadCategory] = useState<DocCategory>('CONTRATOS_LABORALES')
  const [uploadExpDate, setUploadExpDate] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/documentos')
      .then(r => r.json())
      .then(data => {
        setDocuments(data.documents || [])
      })
      .catch(() => {
        // No fallback a datos demo — mostrar estado vacío
        setDocuments([])
      })
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => computeStats(documents), [documents])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of Object.keys(CATEGORY_CONFIG)) {
      counts[cat] = documents.filter(d => d.category === cat).length
    }
    return counts
  }, [documents])

  const filtered = useMemo(() => {
    return documents.filter(doc => {
      const matchesCat = selectedCategory === 'ALL' || doc.category === selectedCategory
      const matchesStatus = selectedStatus === 'ALL' || doc.status === selectedStatus
      const matchesSearch =
        searchQuery === '' ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCat && matchesStatus && matchesSearch
    })
  }, [documents, selectedCategory, selectedStatus, searchQuery])

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedDocs.size === filtered.length) {
      setSelectedDocs(new Set())
    } else {
      setSelectedDocs(new Set(filtered.map(d => d.id)))
    }
  }

  const clearSelection = () => setSelectedDocs(new Set())

  // Batch operations
  const handleBulkDelete = () => {
    setDocuments(prev => prev.filter(d => !selectedDocs.has(d.id)))
    setSelectedDocs(new Set())
    setConfirmBulkDelete(false)
  }

  const handleBulkDownload = () => {
    setBulkDownloadInfo(`Preparando descarga de ${selectedDocs.size} documento(s)...`)
    setSelectedDocs(new Set())
    setTimeout(() => setBulkDownloadInfo(null), 4000)
  }

  const handleBulkChangeCategory = (cat: DocCategory) => {
    setDocuments(prev =>
      prev.map(d => (selectedDocs.has(d.id) ? { ...d, category: cat } : d))
    )
    setSelectedDocs(new Set())
  }

  // Upload handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.dataTransfer.files).filter(f => f.size <= MAX_FILE_SIZE)
    setUploadFiles(prev => [...prev, ...files])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files).filter(f => f.size <= MAX_FILE_SIZE)
    setUploadFiles(prev => [...prev, ...files])
  }

  const removeUploadFile = (idx: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return
    setIsUploading(true)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      uploadFiles.forEach(f => formData.append('files', f))
      formData.append('category', uploadCategory)
      if (uploadExpDate) formData.append('expirationDate', uploadExpDate)

      setUploadProgress(40)
      const res = await fetch('/api/storage/upload', { method: 'POST', body: formData })
      setUploadProgress(80)

      if (res.ok) {
        // Refrescar lista desde API para obtener URLs reales
        const updated = await fetch('/api/documentos').then(r => r.json())
        setDocuments(updated.documents || [])
      } else {
        // Fallback optimista: agregar documentos localmente
        const newDocs: Documento[] = uploadFiles.map((file, idx) => ({
          id: `doc-new-${Date.now()}-${idx}`,
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
          fileName: file.name,
          fileUrl: URL.createObjectURL(file),
          fileType: getFileTypeFromName(file.name),
          mimeType: file.type,
          fileSize: file.size,
          category: uploadCategory,
          status: 'VIGENTE' as DocStatus,
          uploadDate: new Date().toISOString(),
          expirationDate: uploadExpDate ? new Date(uploadExpDate).toISOString() : null,
          daysUntilExpiry: uploadExpDate
            ? Math.ceil((new Date(uploadExpDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null,
          uploadedBy: 'Usuario actual',
          isDigitized: true,
        }))
        setDocuments(prev => [...newDocs, ...prev])
      }
    } catch {
      // Continuar sin error bloqueante
    } finally {
      setUploadProgress(100)
      setIsUploading(false)
      setUploadFiles([])
      setUploadExpDate('')
      setUploadProgress(0)
      setShowUploadModal(false)
    }
  }

  const handleDeleteDoc = async (id: string) => {
    // Optimistic update
    setDocuments(prev => prev.filter(d => d.id !== id))
    setConfirmDeleteId(null)
    // Persist deletion in backend
    try {
      await fetch(`/api/documentos?id=${id}`, { method: 'DELETE' })
    } catch {
      // Silent fail — UI ya actualizó
    }
  }

  return (
    <div className="space-y-6">
      {/* Bulk download info banner — replaces native alert() */}
      {bulkDownloadInfo && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 border-blue-800 bg-blue-50 bg-blue-900/20 px-4 py-3">
          <Download className="h-5 w-5 text-blue-500 shrink-0" />
          <p className="text-sm text-blue-800 text-blue-300">{bulkDownloadInfo}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-[#1e3a6e] text-blue-400" />
            Gestion Documental
          </h1>
          <p className="text-gray-500 text-gray-400 mt-1">
            Administra, organiza y controla la vigencia de todos los documentos laborales de tu organizacion.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a6e] hover:bg-[#162d57] text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-[#1e3a6e]/20"
        >
          <UploadCloud className="w-4 h-4" />
          Subir documento
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard
          icon={Layers}
          iconBg="bg-blue-100 bg-blue-900/30"
          iconColor="text-blue-600 text-blue-400"
          value={loading ? '-' : stats.total}
          label="Total documentos"
        />
        <KPICard
          icon={FileCheck}
          iconBg="bg-emerald-100 bg-emerald-900/30"
          iconColor="text-emerald-600 text-emerald-400"
          value={loading ? '-' : stats.vigentes}
          label="Vigentes"
        />
        <KPICard
          icon={FileClock}
          iconBg="bg-amber-100 bg-amber-900/30"
          iconColor="text-amber-600 text-amber-400"
          value={loading ? '-' : stats.porVencer}
          label="Por vencer"
        />
        <KPICard
          icon={FileX}
          iconBg="bg-red-100 bg-red-900/30"
          iconColor="text-red-600 text-red-400"
          value={loading ? '-' : stats.vencidos}
          label="Vencidos"
        />
        <KPICard
          icon={ScanSearch}
          iconBg="bg-purple-100 bg-purple-900/30"
          iconColor="text-purple-600 text-purple-400"
          value={loading ? '-' : stats.sinDigitalizar}
          label="Sin digitalizar"
        />
      </div>

      {/* Search + Status Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por titulo, archivo, categoria..."
            className="w-full pl-10 pr-4 py-2.5 border border-white/10 border-slate-600 rounded-xl focus:ring-2 focus:ring-[#1e3a6e]/20 focus:border-[#1e3a6e] text-sm bg-white/[0.04] text-gray-200"
          />
        </div>
        <div className="flex border border-white/10 border-slate-600 rounded-xl overflow-hidden">
          {([
            { key: 'ALL' as const, label: 'Todos' },
            { key: 'VIGENTE' as const, label: 'Vigente' },
            { key: 'POR_VENCER' as const, label: 'Por vencer' },
            { key: 'VENCIDO' as const, label: 'Vencido' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatus(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                selectedStatus === tab.key
                  ? 'bg-[#1e3a6e] text-white'
                  : 'text-slate-300 hover:bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCategorySidebar(!showCategorySidebar)}
          className="flex items-center gap-2 px-4 py-2.5 border border-white/10 border-slate-600 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
        >
          <Filter className="w-4 h-4" />
          Categorias
        </button>
      </div>

      {/* Batch operations bar */}
      {selectedDocs.size > 0 && (
        <div className="bg-[#1e3a6e]/5 bg-[#1e3a6e]/20 border border-[#1e3a6e]/20 border-[#1e3a6e]/40 rounded-xl px-5 py-3 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-[#1e3a6e] text-blue-300">
            {selectedDocs.size} documento(s) seleccionado(s)
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleBulkDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1e3a6e] text-blue-300 bg-[#141824] bg-white/[0.04] border border-[#1e3a6e]/20 border-slate-600 hover:bg-[#1e3a6e]/10 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar
            </button>
            <BulkCategoryDropdown onSelect={handleBulkChangeCategory} />
            {confirmBulkDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-600 text-red-400 font-medium">¿Eliminar {selectedDocs.size} doc(s)?</span>
                <button
                  onClick={handleBulkDelete}
                  className="px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Sí
                </button>
                <button
                  onClick={() => setConfirmBulkDelete(false)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 text-gray-300 bg-[#141824] bg-white/[0.04] border border-white/[0.08] border-gray-600 hover:bg-white/[0.02] hover:bg-slate-600 rounded-lg transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmBulkDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 text-red-400 bg-[#141824] bg-white/[0.04] border border-red-200 border-red-800 hover:bg-red-50 hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            )}
            <button
              onClick={clearSelection}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 text-gray-400 hover:text-gray-300 hover:text-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Main content: sidebar + doc list */}
      <div className="flex gap-6">
        {/* Category sidebar */}
        {showCategorySidebar && (
          <div className="w-64 shrink-0 hidden lg:block">
            <div className="bg-[#141824] rounded-2xl border border-white/[0.08] shadow-sm p-4 sticky top-6">
              <h3 className="text-xs font-bold text-gray-500 text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5" />
                Categorias
              </h3>
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#1e3a6e]/10 text-[#1e3a6e] bg-[#1e3a6e]/30 text-blue-300'
                    : 'text-slate-300 hover:bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Todas
                </span>
                <span className="text-xs bg-white/[0.04] text-gray-500 text-gray-400 px-2 py-0.5 rounded-full">
                  {documents.length}
                </span>
              </button>
              {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map(cat => {
                const conf = CATEGORY_CONFIG[cat]
                const CatIcon = conf.icon
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                      selectedCategory === cat
                        ? 'bg-[#1e3a6e]/10 text-[#1e3a6e] bg-[#1e3a6e]/30 text-blue-300'
                        : 'text-slate-300 hover:bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <CatIcon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{conf.label}</span>
                    </span>
                    <span className="text-xs bg-white/[0.04] text-gray-500 text-gray-400 px-2 py-0.5 rounded-full shrink-0">
                      {categoryCounts[cat] ?? 0}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Document list */}
        <div className="flex-1 min-w-0">
          {loading && (
            <div className="bg-[#141824] rounded-2xl border border-white/[0.08] shadow-sm p-16 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#1e3a6e] animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-500 text-gray-400">
                Cargando documentos...
              </p>
            </div>
          )}

          {!loading && (
            <div className="bg-[#141824] rounded-2xl border border-white/[0.08] shadow-sm overflow-hidden">
              {/* Table header */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06] border-white/[0.08] bg-white/[0.02]/50 bg-white/[0.04]/50">
                      <th className="w-10 px-4 py-3">
                        <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600 hover:text-slate-200">
                          {selectedDocs.size === filtered.length && filtered.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-[#1e3a6e] text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">
                        Documento
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">
                        Fecha subida
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">
                        Vigencia
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 divide-slate-700">
                    {filtered.map(doc => {
                      const fileConf = FILE_ICON_CONFIG[doc.fileType]
                      const FileIcon = fileConf.icon
                      const statusConf = STATUS_CONFIG[doc.status]
                      const StatusIcon = statusConf.icon
                      const catConf = CATEGORY_CONFIG[doc.category]
                      const isSelected = selectedDocs.has(doc.id)

                      return (
                        <tr
                          key={doc.id}
                          className={`hover:bg-white/[0.02]/50 hover:bg-white/[0.04]/50 transition-colors ${
                            isSelected ? 'bg-[#1e3a6e]/5 bg-[#1e3a6e]/10' : ''
                          }`}
                        >
                          <td className="w-10 px-4 py-3">
                            <button onClick={() => toggleSelect(doc.id)} className="text-gray-400 hover:text-gray-600 hover:text-slate-200">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#1e3a6e] text-blue-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg ${fileConf.color} flex items-center justify-center shrink-0`}>
                                <FileIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate max-w-[240px]">
                                  {doc.title}
                                </p>
                                <p className="text-xs text-gray-400 text-slate-500 truncate">
                                  {doc.fileName || 'Sin archivo'} {doc.fileSize > 0 && `· ${formatFileSize(doc.fileSize)}`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium text-slate-300 truncate">
                              {catConf.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 text-gray-400">
                              <CalendarDays className="w-3 h-3" />
                              {new Date(doc.uploadDate).toLocaleDateString('es-PE', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConf.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConf.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {doc.daysUntilExpiry !== null ? (
                              <span
                                className={`text-xs font-medium ${
                                  doc.daysUntilExpiry <= 0
                                    ? 'text-red-600 text-red-400'
                                    : doc.daysUntilExpiry <= 30
                                    ? 'text-amber-600 text-amber-400'
                                    : 'text-gray-500 text-gray-400'
                                }`}
                              >
                                {doc.daysUntilExpiry <= 0
                                  ? `Vencido hace ${Math.abs(doc.daysUntilExpiry)}d`
                                  : `Vence en ${doc.daysUntilExpiry}d`}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 text-slate-500">Sin vencimiento</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => setPreviewDoc(doc)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#1e3a6e] text-blue-300 bg-[#1e3a6e]/5 bg-[#1e3a6e]/20 hover:bg-[#1e3a6e]/10 hover:bg-[#1e3a6e]/30 rounded-lg transition-colors"
                                title="Vista previa"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.04] rounded-lg transition-colors"
                                title="Descargar"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              {confirmDeleteId === doc.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDeleteDoc(doc.id)}
                                    className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                                  >
                                    Sí
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 text-[11px] font-semibold text-gray-500 hover:bg-white/[0.04] hover:bg-gray-700 rounded-md transition-colors"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(doc.id)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-red-500 text-red-400 hover:bg-red-50 hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Empty state */}
              {filtered.length === 0 && (
                <div className="p-12 text-center">
                  <FolderOpen className="w-10 h-10 text-gray-300 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500 text-gray-400">
                    {documents.length === 0 ? 'No hay documentos registrados' : 'No se encontraron documentos'}
                  </p>
                  <p className="text-xs text-gray-400 text-slate-500 mt-1">
                    {documents.length === 0
                      ? 'Sube tu primer documento haciendo clic en "Subir documento".'
                      : 'Intenta con otros terminos de busqueda o filtros.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          uploadFiles={uploadFiles}
          uploadCategory={uploadCategory}
          uploadExpDate={uploadExpDate}
          uploadProgress={uploadProgress}
          isUploading={isUploading}
          fileInputRef={fileInputRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
          onRemoveFile={removeUploadFile}
          onCategoryChange={setUploadCategory}
          onExpDateChange={setUploadExpDate}
          onUpload={handleUpload}
          onClose={() => {
            setShowUploadModal(false)
            setUploadFiles([])
            setUploadExpDate('')
            setUploadProgress(0)
          }}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------- */
/*  KPI Card                                          */
/* -------------------------------------------------- */

function KPICard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
}: {
  icon: typeof Layers
  iconBg: string
  iconColor: string
  value: string | number
  label: string
}) {
  return (
    <div className="bg-[#141824] rounded-xl border border-white/[0.08] p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs font-medium text-gray-500 text-gray-400">{label}</p>
      </div>
    </div>
  )
}

/* -------------------------------------------------- */
/*  Bulk Category Dropdown                            */
/* -------------------------------------------------- */

function BulkCategoryDropdown({ onSelect }: { onSelect: (cat: DocCategory) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1e3a6e] text-blue-300 bg-[#141824] bg-white/[0.04] border border-[#1e3a6e]/20 border-slate-600 hover:bg-[#1e3a6e]/10 hover:bg-slate-600 rounded-lg transition-colors"
      >
        <Tag className="w-3.5 h-3.5" />
        Cambiar categoria
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-56 bg-[#141824] border border-white/[0.08] rounded-xl shadow-xl z-50 py-2">
            {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map(cat => {
              const conf = CATEGORY_CONFIG[cat]
              const CatIcon = conf.icon
              return (
                <button
                  key={cat}
                  onClick={() => {
                    onSelect(cat)
                    setOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 text-gray-200 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <CatIcon className="w-4 h-4 text-gray-400 text-slate-500" />
                  {conf.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* -------------------------------------------------- */
/*  Preview Modal                                     */
/* -------------------------------------------------- */

function PreviewModal({ doc, onClose }: { doc: Documento; onClose: () => void }) {
  const fileConf = FILE_ICON_CONFIG[doc.fileType]
  const FileIcon = fileConf.icon
  const statusConf = STATUS_CONFIG[doc.status]
  const StatusIcon = statusConf.icon
  const catConf = CATEGORY_CONFIG[doc.category]

  const canPreviewInline = doc.fileType === 'PDF' || doc.fileType === 'IMG'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#141824] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${fileConf.color} flex items-center justify-center`}>
              <FileIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{doc.title}</h2>
              <p className="text-xs text-gray-400 text-slate-500">{doc.fileName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#1e3a6e] text-blue-300 bg-[#1e3a6e]/5 bg-[#1e3a6e]/20 hover:bg-[#1e3a6e]/10 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Descargar
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/[0.04] rounded-lg transition-colors text-gray-500 text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Preview area */}
          <div className="flex-1 bg-white/[0.04] bg-slate-900 flex items-center justify-center p-4 overflow-auto min-h-[400px]">
            {doc.fileType === 'PDF' && doc.fileUrl ? (
              <iframe
                src={doc.fileUrl}
                className="w-full h-full min-h-[500px] rounded-lg border border-white/[0.08] bg-[#141824]"
                title={doc.title}
              />
            ) : doc.fileType === 'IMG' && doc.fileUrl ? (
              <div className="flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.fileUrl}
                  alt={doc.title}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            ) : (
              <div className="text-center">
                <div className={`w-20 h-20 rounded-2xl ${fileConf.color} flex items-center justify-center mx-auto mb-4`}>
                  <FileIcon className="w-10 h-10" />
                </div>
                <p className="text-sm font-medium text-slate-300 mb-1">
                  Vista previa no disponible para este tipo de archivo
                </p>
                <p className="text-xs text-gray-400 text-slate-500 mb-4">
                  {doc.fileType === 'DOC' ? 'Archivo Word' : doc.fileType === 'XLS' ? 'Archivo Excel' : 'Archivo'}
                  {doc.fileSize > 0 && ` · ${formatFileSize(doc.fileSize)}`}
                </p>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#1e3a6e] hover:bg-[#162d57] text-white rounded-xl font-semibold text-sm transition-colors mx-auto">
                  <Download className="w-4 h-4" />
                  Descargar archivo
                </button>
              </div>
            )}
          </div>

          {/* Info sidebar */}
          <div className="w-72 shrink-0 border-l border-white/[0.08] p-5 overflow-y-auto">
            <h3 className="text-xs font-bold text-gray-500 text-gray-400 uppercase tracking-wider mb-4">
              Informacion del documento
            </h3>
            <div className="space-y-4">
              <InfoRow label="Estado">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConf.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConf.label}
                </span>
              </InfoRow>
              <InfoRow label="Categoria">
                <span className="text-sm text-gray-300 text-gray-200">{catConf.label}</span>
              </InfoRow>
              <InfoRow label="Tipo de archivo">
                <span className="text-sm text-gray-300 text-gray-200">{doc.fileType}</span>
              </InfoRow>
              <InfoRow label="Tamano">
                <span className="text-sm text-gray-300 text-gray-200">{formatFileSize(doc.fileSize)}</span>
              </InfoRow>
              <InfoRow label="Fecha de subida">
                <span className="text-sm text-gray-300 text-gray-200">
                  {new Date(doc.uploadDate).toLocaleDateString('es-PE', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </InfoRow>
              {doc.expirationDate && (
                <InfoRow label="Fecha de vencimiento">
                  <span className={`text-sm font-medium ${
                    doc.daysUntilExpiry !== null && doc.daysUntilExpiry <= 0
                      ? 'text-red-600 text-red-400'
                      : doc.daysUntilExpiry !== null && doc.daysUntilExpiry <= 30
                      ? 'text-amber-600 text-amber-400'
                      : 'text-gray-300 text-gray-200'
                  }`}>
                    {new Date(doc.expirationDate).toLocaleDateString('es-PE', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </InfoRow>
              )}
              {doc.daysUntilExpiry !== null && (
                <InfoRow label="Vigencia restante">
                  <span className={`text-sm font-bold ${
                    doc.daysUntilExpiry <= 0
                      ? 'text-red-600 text-red-400'
                      : doc.daysUntilExpiry <= 30
                      ? 'text-amber-600 text-amber-400'
                      : 'text-emerald-600 text-emerald-400'
                  }`}>
                    {doc.daysUntilExpiry <= 0
                      ? `Vencido hace ${Math.abs(doc.daysUntilExpiry)} dias`
                      : `${doc.daysUntilExpiry} dias`}
                  </span>
                </InfoRow>
              )}
              <InfoRow label="Subido por">
                <span className="text-sm text-gray-300 text-gray-200">{doc.uploadedBy}</span>
              </InfoRow>
              <InfoRow label="Digitalizado">
                <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                  doc.isDigitized
                    ? 'text-emerald-600 text-emerald-400'
                    : 'text-red-500 text-red-400'
                }`}>
                  {doc.isDigitized ? (
                    <><CheckCircle className="w-3.5 h-3.5" /> Si</>
                  ) : (
                    <><XCircle className="w-3.5 h-3.5" /> No</>
                  )}
                </span>
              </InfoRow>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------- */
/*  Upload Modal                                      */
/* -------------------------------------------------- */

function UploadModal({
  uploadFiles,
  uploadCategory,
  uploadExpDate,
  uploadProgress,
  isUploading,
  fileInputRef,
  onDragOver,
  onDrop,
  onFileSelect,
  onRemoveFile,
  onCategoryChange,
  onExpDateChange,
  onUpload,
  onClose,
}: {
  uploadFiles: File[]
  uploadCategory: DocCategory
  uploadExpDate: string
  uploadProgress: number
  isUploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (idx: number) => void
  onCategoryChange: (cat: DocCategory) => void
  onExpDateChange: (date: string) => void
  onUpload: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#141824] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[#1e3a6e] text-blue-400" />
            Subir documento
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/[0.04] rounded-lg transition-colors text-gray-500 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Drag & Drop zone */}
          <div
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 border-slate-600 hover:border-[#1e3a6e] hover:border-blue-400 rounded-xl p-8 text-center cursor-pointer transition-colors group"
          >
            <UploadCloud className="w-10 h-10 text-gray-300 text-slate-600 group-hover:text-[#1e3a6e] group-hover:text-blue-400 mx-auto mb-3 transition-colors" />
            <p className="text-sm font-medium text-slate-300 mb-1">
              Arrastra archivos aqui o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-400 text-slate-500">
              PDF, DOC, DOCX, XLS, XLSX, JPG, PNG — Max 10 MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FORMATS}
              multiple
              onChange={onFileSelect}
              className="hidden"
            />
          </div>

          {/* Selected files list */}
          {uploadFiles.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadFiles.map((file, idx) => {
                const ft = getFileTypeFromName(file.name)
                const conf = FILE_ICON_CONFIG[ft]
                const FIcon = conf.icon
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] bg-white/[0.04] rounded-lg"
                  >
                    <div className={`w-8 h-8 rounded-lg ${conf.color} flex items-center justify-center shrink-0`}>
                      <FIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-300 text-gray-200 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400 text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveFile(idx) }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Category selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 text-slate-300 mb-1.5">
              Categoria
            </label>
            <select
              value={uploadCategory}
              onChange={e => onCategoryChange(e.target.value as DocCategory)}
              className="w-full px-4 py-2.5 border border-white/10 border-slate-600 rounded-xl text-sm bg-white/[0.04] text-gray-200 focus:ring-2 focus:ring-[#1e3a6e]/20 focus:border-[#1e3a6e]"
            >
              {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map(cat => (
                <option key={cat} value={cat}>
                  {CATEGORY_CONFIG[cat].label}
                </option>
              ))}
            </select>
          </div>

          {/* Expiration date picker */}
          <div>
            <label className="block text-sm font-medium text-gray-300 text-slate-300 mb-1.5">
              Fecha de vencimiento (opcional)
            </label>
            <input
              type="date"
              value={uploadExpDate}
              onChange={e => onExpDateChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-white/10 border-slate-600 rounded-xl text-sm bg-white/[0.04] text-gray-200 focus:ring-2 focus:ring-[#1e3a6e]/20 focus:border-[#1e3a6e]"
            />
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-300">Subiendo...</span>
                <span className="text-xs font-bold text-[#1e3a6e] text-blue-300">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 bg-slate-600 rounded-full h-2.5">
                <div
                  className="bg-[#1e3a6e] bg-blue-400 h-2.5 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.08] bg-white/[0.02]/50 bg-white/[0.04]/50">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.04] rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onUpload}
            disabled={uploadFiles.length === 0 || isUploading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a6e] hover:bg-[#162d57] text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-[#1e3a6e]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isUploading ? 'Subiendo...' : `Subir ${uploadFiles.length > 0 ? `(${uploadFiles.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------- */
/*  Info Row                                          */
/* -------------------------------------------------- */

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 text-slate-500 mb-1">{label}</p>
      {children}
    </div>
  )
}
