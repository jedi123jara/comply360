'use client'

import { useEffect, useState } from 'react'
import { Receipt, Download, CheckCircle2, AlertCircle, Eye } from 'lucide-react'

interface PayslipItem {
  id: string
  periodo: string
  fechaEmision: string
  totalIngresos: string
  totalDescuentos: string
  netoPagar: string
  status: string
  pdfUrl: string | null
  acceptedAt: string | null
}

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  EMITIDA: { label: 'Emitida', class: 'bg-blue-100 text-blue-700' },
  ENVIADA: { label: 'Enviada', class: 'bg-amber-100 text-amber-700' },
  ACEPTADA: { label: 'Aceptada', class: 'bg-green-100 text-green-700' },
  OBSERVADA: { label: 'Observada', class: 'bg-red-100 text-red-700' },
  ANULADA: { label: 'Anulada', class: 'bg-slate-100 text-slate-600' },
}

export default function BoletasPage() {
  const [boletas, setBoletas] = useState<PayslipItem[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmAcceptId, setConfirmAcceptId] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    fetch('/api/mi-portal/boletas')
      .then((r) => r.json())
      .then((d) => setBoletas(d.boletas || []))
      .finally(() => setLoading(false))
  }, [])

  const handleAccept = async (id: string) => {
    setAccepting(true)
    try {
      const res = await fetch(`/api/mi-portal/boletas/${id}/aceptar`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setBoletas((prev) => prev.map((b) => (b.id === id ? updated : b)))
      setConfirmAcceptId(null)
    } catch {
      alert('No se pudo confirmar la boleta')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) return <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Mis Boletas de Pago</h2>
        <p className="text-sm text-slate-500 mt-1">
          Consulta, descarga y confirma la recepcion de tus boletas (D.S. 001-98-TR).
        </p>
      </div>

      {boletas.length === 0 ? (
        <div className="bg-[#141824] border border-slate-200 rounded-xl p-12 text-center">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay boletas emitidas todavia.</p>
        </div>
      ) : (
        <div className="bg-[#141824] border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Periodo</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Emisión</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">Ingresos</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">Descuentos</th>
                  <th className="text-right px-4 py-3">Neto</th>
                  <th className="text-center px-4 py-3">Estado</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boletas.map((b) => {
                  const badge = STATUS_BADGE[b.status] || STATUS_BADGE.EMITIDA
                  const periodoLabel = formatPeriodo(b.periodo)
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{periodoLabel}</td>
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                        {new Date(b.fechaEmision).toLocaleDateString('es-PE')}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 font-mono hidden md:table-cell">
                        {fmt(b.totalIngresos)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 font-mono hidden md:table-cell">
                        -{fmt(b.totalDescuentos)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                        S/ {fmt(b.netoPagar)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.class}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/mi-portal/boletas/${b.id}`}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          {b.pdfUrl && (
                            <a
                              href={b.pdfUrl}
                              download
                              className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"
                              title="Descargar PDF"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          {!b.acceptedAt && b.status !== 'ANULADA' && (
                            confirmAcceptId === b.id ? (
                              <span className="flex gap-1">
                                <button
                                  onClick={() => handleAccept(b.id)}
                                  disabled={accepting}
                                  className="bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded disabled:opacity-50"
                                >
                                  Sí
                                </button>
                                <button
                                  onClick={() => setConfirmAcceptId(null)}
                                  disabled={accepting}
                                  className="bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-1 rounded"
                                >
                                  No
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setConfirmAcceptId(b.id)}
                                className="text-xs font-semibold text-green-700 hover:underline px-2 py-1 flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Confirmar
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900">
          <p className="font-semibold">Sobre tus boletas</p>
          <p className="mt-1">
            Confirma la recepcion de cada boleta para validar que coincide con lo recibido. Si encuentras
            una observacion, contacta a RRHH y el estado pasará a &quot;Observada&quot; hasta su revisión.
          </p>
        </div>
      </div>
    </div>
  )
}

function fmt(v: string | number) {
  return Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPeriodo(periodo: string) {
  const [year, month] = periodo.split('-')
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return `${months[parseInt(month) - 1]} ${year}`
}
