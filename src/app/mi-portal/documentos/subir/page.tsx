'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const DOC_TYPES = [
  { value: 'DNI', label: 'Copia de DNI' },
  { value: 'CV', label: 'CV / Hoja de vida' },
  { value: 'CONSTANCIA_ESTUDIOS', label: 'Constancia de estudios' },
  { value: 'CERTIFICADO_LABORAL', label: 'Certificado laboral anterior' },
  { value: 'CERTIFICADO_MEDICO', label: 'Certificado medico' },
  { value: 'RECIBO_SERVICIOS', label: 'Recibo de servicios (domicilio)' },
  { value: 'CUENTA_BANCARIA', label: 'Constancia cuenta bancaria' },
  { value: 'ANTECEDENTES', label: 'Antecedentes penales/policiales' },
  { value: 'OTRO', label: 'Otro documento' },
]

export default function SubirDocumentoPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    documentType: 'DNI',
    title: '',
    file: null as File | null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.file) {
      setMessage({ type: 'error', text: 'Selecciona un archivo' })
      return
    }
    if (!form.title.trim()) {
      setMessage({ type: 'error', text: 'Ingresa un titulo' })
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const fd = new FormData()
      fd.append('documentType', form.documentType)
      fd.append('title', form.title)
      fd.append('file', form.file)
      const res = await fetch('/api/mi-portal/documentos', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al subir')
      }
      setMessage({ type: 'success', text: 'Documento subido. RRHH lo revisara pronto.' })
      setTimeout(() => router.push('/mi-portal/documentos'), 1500)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/mi-portal/documentos"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a mis documentos
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Subir documento</h2>
        <p className="text-sm text-slate-500 mt-1">
          El documento sera revisado por RRHH antes de ser marcado como verificado.
        </p>
      </div>

      {message && (
        <div className={`flex items-start gap-3 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#141824] border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de documento</label>
          <select
            value={form.documentType}
            onChange={(e) => setForm({ ...form, documentType: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Titulo / Descripción</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ej: Copia de DNI vigente"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            maxLength={120}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Archivo (PDF, JPG, PNG)</label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input
              id="file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
              className="hidden"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              {form.file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <span className="text-sm font-medium text-slate-900">{form.file.name}</span>
                  <span className="text-xs text-slate-500">
                    {(form.file.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-sm text-slate-600">Click para seleccionar archivo</span>
                  <span className="text-xs text-slate-400">Maximo 5 MB</span>
                </div>
              )}
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {submitting ? 'Subiendo...' : 'Subir documento'}
        </button>
      </form>
    </div>
  )
}
