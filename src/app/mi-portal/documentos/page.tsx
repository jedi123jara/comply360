'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Upload, CheckCircle2, Clock, AlertCircle, Download } from 'lucide-react'

interface DocItem {
  id: string
  category: string
  documentType: string
  title: string
  status: string
  fileUrl: string | null
  isRequired: boolean
  expiresAt: string | null
  createdAt: string
}

const STATUS_BADGE: Record<string, { label: string; class: string; icon: typeof CheckCircle2 }> = {
  PENDING: { label: 'Pendiente', class: 'bg-amber-100 text-amber-700', icon: Clock },
  UPLOADED: { label: 'Subido', class: 'bg-blue-100 text-blue-700', icon: FileText },
  VERIFIED: { label: 'Verificado', class: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  EXPIRED: { label: 'Vencido', class: 'bg-red-100 text-red-700', icon: AlertCircle },
  MISSING: { label: 'Falta', class: 'bg-red-100 text-red-700', icon: AlertCircle },
}

const CATEGORY_LABEL: Record<string, string> = {
  INGRESO: 'Documentos de ingreso',
  VIGENTE: 'Documentos vigentes',
  SST: 'Seguridad y salud',
  PREVISIONAL: 'Previsional',
  CESE: 'Documentos de cese',
}

export default function MisDocumentosPage() {
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mi-portal/documentos')
      .then((r) => r.json())
      .then((d) => setDocs(d.documents || []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />

  const grouped = docs.reduce<Record<string, DocItem[]>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mis Documentos</h2>
          <p className="text-sm text-slate-500 mt-1">
            Documentos personales requeridos por la empresa.
          </p>
        </div>
        <Link
          href="/mi-portal/documentos/subir"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Subir documento
        </Link>
      </div>

      {docs.length === 0 ? (
        <div className="bg-[#141824] border border-slate-200 rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay documentos asignados a tu legajo todavia.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="bg-[#141824] border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 text-sm">
                  {CATEGORY_LABEL[category] || category}
                </h3>
              </div>
              <ul className="divide-y divide-slate-100">
                {items.map((doc) => {
                  const badge = STATUS_BADGE[doc.status] || STATUS_BADGE.PENDING
                  const Icon = badge.icon
                  return (
                    <li key={doc.id} className="px-4 py-3 flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{doc.title}</p>
                        <p className="text-xs text-slate-500">
                          {doc.documentType.replaceAll('_', ' ')}
                          {doc.isRequired && <span className="ml-2 text-red-600">• Obligatorio</span>}
                          {doc.expiresAt && (
                            <span className="ml-2">• Vence: {new Date(doc.expiresAt).toLocaleDateString('es-PE')}</span>
                          )}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${badge.class}`}>
                        <Icon className="w-3 h-3" />
                        {badge.label}
                      </span>
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          download
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"
                          title="Descargar"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
