'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Receipt,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

interface PayslipDetail {
  id: string
  periodo: string
  fechaEmision: string
  sueldoBruto: string
  asignacionFamiliar: string | null
  horasExtras: string | null
  bonificaciones: string | null
  totalIngresos: string
  aporteAfpOnp: string | null
  rentaQuintaCat: string | null
  otrosDescuentos: string | null
  totalDescuentos: string
  netoPagar: string
  essalud: string | null
  pdfUrl: string | null
  status: string
  acceptedAt: string | null
}

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  EMITIDA:   { label: 'Emitida',   class: 'bg-blue-100 text-blue-700' },
  ENVIADA:   { label: 'Enviada',   class: 'bg-amber-100 text-amber-700' },
  ACEPTADA:  { label: 'Aceptada', class: 'bg-green-100 text-green-700' },
  OBSERVADA: { label: 'Observada', class: 'bg-red-100 text-red-700' },
  ANULADA:   { label: 'Anulada',   class: 'bg-slate-100 text-slate-500' },
}

function fmt(v: string | null | undefined) {
  if (!v) return '0.00'
  return Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPeriodo(periodo: string) {
  const [year, month] = periodo.split('-')
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${months[parseInt(month) - 1]} ${year}`
}

export default function BoletaDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [boleta, setBoleta] = useState<PayslipDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [confirmAccept, setConfirmAccept] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/mi-portal/boletas/${id}`)
      .then((r) => r.json())
      .then((d) => setBoleta(d.error ? null : d))
      .catch(() => setBoleta(null))
      .finally(() => setLoading(false))
  }, [id])

  const handleAccept = async () => {
    if (!boleta) return
    setAccepting(true)
    try {
      const res = await fetch(`/api/mi-portal/boletas/${id}/aceptar`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setBoleta({ ...boleta, status: updated.status, acceptedAt: updated.acceptedAt })
      setConfirmAccept(false)
    } catch {
      alert('No se pudo confirmar la boleta. Intenta nuevamente.')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
      </div>
    )
  }

  if (!boleta) {
    return (
      <div className="text-center py-16">
        <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Boleta no encontrada</p>
        <Link href="/mi-portal/boletas" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
          ← Volver a boletas
        </Link>
      </div>
    )
  }

  const badge = STATUS_BADGE[boleta.status] || STATUS_BADGE.EMITIDA
  const canAccept = !boleta.acceptedAt && boleta.status !== 'ANULADA'

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <Link
        href="/mi-portal/boletas"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a mis boletas
      </Link>

      {/* Header */}
      <div className="bg-[#141824] bg-[#141824] border border-slate-200 border-white/[0.08] rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900">
                Boleta de Pago — {formatPeriodo(boleta.periodo)}
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Emitida el {new Date(boleta.fechaEmision).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${badge.class}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Ingresos */}
      <div className="bg-[#141824] bg-[#141824] border border-slate-200 border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <h2 className="font-semibold text-slate-900 text-sm">Ingresos</h2>
        </div>
        <div className="space-y-2">
          <Row label="Sueldo básico" value={fmt(boleta.sueldoBruto)} />
          {boleta.asignacionFamiliar && Number(boleta.asignacionFamiliar) > 0 && (
            <Row label="Asignación familiar" value={fmt(boleta.asignacionFamiliar)} />
          )}
          {boleta.horasExtras && Number(boleta.horasExtras) > 0 && (
            <Row label="Horas extras" value={fmt(boleta.horasExtras)} />
          )}
          {boleta.bonificaciones && Number(boleta.bonificaciones) > 0 && (
            <Row label="Bonificaciones" value={fmt(boleta.bonificaciones)} />
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 border-white/[0.08] flex justify-between">
          <span className="text-sm font-semibold text-slate-700">Total Ingresos</span>
          <span className="font-bold text-green-600 font-mono">S/ {fmt(boleta.totalIngresos)}</span>
        </div>
      </div>

      {/* Descuentos */}
      <div className="bg-[#141824] bg-[#141824] border border-slate-200 border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-4 h-4 text-red-500" />
          <h2 className="font-semibold text-slate-900 text-sm">Descuentos</h2>
        </div>
        <div className="space-y-2">
          {boleta.aporteAfpOnp && Number(boleta.aporteAfpOnp) > 0 && (
            <Row label="AFP / ONP" value={fmt(boleta.aporteAfpOnp)} negative />
          )}
          {boleta.rentaQuintaCat && Number(boleta.rentaQuintaCat) > 0 && (
            <Row label="Renta 5ta. categoría" value={fmt(boleta.rentaQuintaCat)} negative />
          )}
          {boleta.otrosDescuentos && Number(boleta.otrosDescuentos) > 0 && (
            <Row label="Otros descuentos" value={fmt(boleta.otrosDescuentos)} negative />
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 border-white/[0.08] flex justify-between">
          <span className="text-sm font-semibold text-slate-700">Total Descuentos</span>
          <span className="font-bold text-red-600 font-mono">-S/ {fmt(boleta.totalDescuentos)}</span>
        </div>
      </div>

      {/* Neto a pagar */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <p className="text-blue-100 text-sm font-medium mb-1">Neto a Pagar</p>
        <p className="text-4xl font-bold font-mono tracking-tight">S/ {fmt(boleta.netoPagar)}</p>
        {boleta.essalud && Number(boleta.essalud) > 0 && (
          <p className="text-blue-200 text-xs mt-2">
            + EsSalud empleador: S/ {fmt(boleta.essalud)} (aporte del empleador, no descontado)
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        {boleta.pdfUrl && (
          <a
            href={boleta.pdfUrl}
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 bg-white/[0.04] text-slate-700 hover:bg-slate-200 hover:bg-white/[0.06] text-sm font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar PDF
          </a>
        )}

        {canAccept && (
          confirmAccept ? (
            <span className="flex gap-2 items-center">
              <span className="text-xs text-slate-500">¿Confirmar recepción?</span>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {accepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Sí, confirmar
              </button>
              <button
                onClick={() => setConfirmAccept(false)}
                disabled={accepting}
                className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmAccept(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar recepción
            </button>
          )
        )}

        {boleta.acceptedAt && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-semibold border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            Confirmada el {new Date(boleta.acceptedAt).toLocaleDateString('es-PE')}
          </div>
        )}
      </div>

      {/* Aviso legal */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          <span className="font-semibold">D.S. 001-98-TR</span> — El empleador está obligado a entregar boleta de pago dentro de las 48 horas de pagada la remuneración. La firma o confirmación digital tiene el mismo valor legal que la firma manuscrita.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-mono font-medium ${negative ? 'text-red-600' : 'text-slate-800'}`}>
        {negative ? '-' : ''}S/ {value}
      </span>
    </div>
  )
}
