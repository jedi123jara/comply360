'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Download, FileText, Calendar } from 'lucide-react'
import { PageHeader, EmptyState, ErrorState, CardGridSkeleton } from '@/components/mi-portal'
import { formatShortDate } from '@/lib/format/peruvian'

interface OrgDocItem {
  id: string
  type: string
  title: string
  description: string | null
  fileUrl: string | null
  version: number
  publishedAt: string | null
  validUntil: string | null
}

const TYPE_LABEL: Record<string, string> = {
  RIT: 'Reglamento Interno de Trabajo',
  REGLAMENTO_SST: 'Reglamento de Seguridad y Salud',
  POLITICA_HOSTIGAMIENTO: 'Política prevención hostigamiento',
  POLITICA_IGUALDAD: 'Política igualdad salarial',
  CODIGO_ETICA: 'Código de ética',
  MOF: 'Manual de Organización y Funciones',
  ROF: 'Reglamento de Organización y Funciones',
  PLAN_SST: 'Plan anual de SST',
  PROTOCOLO_DENUNCIAS: 'Protocolo canal de denuncias',
  CONVENIO_COLECTIVO: 'Convenio colectivo',
  COMUNICADO: 'Comunicado',
  OTRO: 'Otro documento',
}

export default function ReglamentoPage() {
  const [docs, setDocs] = useState<OrgDocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mi-portal/reglamento', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      setDocs(d.documents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  return (
    <div className="space-y-5">
      <PageHeader
        title="RIT y políticas"
        subtitle="Documentos institucionales que toda persona trabajadora debe conocer."
        icon={<BookOpen className="w-5 h-5" />}
      />

      {loading && <CardGridSkeleton cards={4} />}

      {error && !loading && (
        <ErrorState title="No se pudieron cargar los documentos" message={error} onRetry={load} />
      )}

      {!loading && !error && docs.length === 0 && (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" />}
          title="Sin documentos publicados"
          description="Cuando la empresa publique su Reglamento Interno, políticas o comunicados los verás acá."
        />
      )}

      {!loading && !error && docs.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-emerald-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase font-bold text-emerald-700 tracking-wide">
                    {TYPE_LABEL[doc.type] ?? doc.type}
                  </p>
                  <h3 className="font-semibold text-slate-900 mt-0.5 leading-tight">
                    {doc.title}
                  </h3>
                  {doc.description && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{doc.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatShortDate(doc.publishedAt)}
                    </span>
                    <span>v{doc.version}</span>
                  </div>
                </div>
              </div>
              {doc.fileUrl && (
                <a
                  href={doc.fileUrl}
                  download
                  className="mt-4 w-full bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
