'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Download, FileText, Calendar } from 'lucide-react'

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
  POLITICA_HOSTIGAMIENTO: 'Politica prevención hostigamiento',
  POLITICA_IGUALDAD: 'Politica igualdad salarial',
  CODIGO_ETICA: 'Codigo de ética',
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

  useEffect(() => {
    fetch('/api/mi-portal/reglamento')
      .then((r) => r.json())
      .then((d) => setDocs(d.documents || []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">RIT y Politicas de la empresa</h2>
        <p className="text-sm text-slate-500 mt-1">
          Documentos institucionales que toda persona trabajadora debe conocer.
        </p>
      </div>

      {docs.length === 0 ? (
        <div className="bg-[#141824] border border-slate-200 rounded-xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">La empresa aun no ha publicado documentos institucionales.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {docs.map((doc) => (
            <div key={doc.id} className="bg-[#141824] border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase font-semibold text-blue-700">
                    {TYPE_LABEL[doc.type] || doc.type}
                  </p>
                  <h3 className="font-semibold text-slate-900 mt-0.5 truncate">{doc.title}</h3>
                  {doc.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {doc.publishedAt
                        ? new Date(doc.publishedAt).toLocaleDateString('es-PE')
                        : 'Sin fecha'}
                    </span>
                    <span>v{doc.version}</span>
                  </div>
                </div>
              </div>
              {doc.fileUrl && (
                <a
                  href={doc.fileUrl}
                  download
                  className="mt-4 w-full bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
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
