'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Receipt,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  Clock,
  Fingerprint,
} from 'lucide-react'
import { CTSProjectionCard, SalaryChart } from '@/components/mi-portal'

/**
 * /mi-portal/boletas — Lista de boletas de pago (Emerald Light, mobile-first).
 *
 * Cambios vs versión anterior:
 *  - Layout de cards (no tabla) para mobile-first
 *  - Badges Emerald Light + emerald gradient en "Neto"
 *  - CTA de "Firmar con huella" en lugar de "Confirmar" genérico
 *  - Preparado para biometric signing (Sprint 2 lo conecta con WebAuthn real)
 *
 * Consume `GET /api/mi-portal/boletas` sin alterar contrato.
 */

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

const STATUS_META: Record<
  string,
  { label: string; bg: string; text: string; icon: typeof Clock }
> = {
  EMITIDA: {
    label: 'Emitida',
    bg: 'rgba(59,130,246,0.12)',
    text: 'rgb(29, 78, 216)',
    icon: Receipt,
  },
  ENVIADA: {
    label: 'Por firmar',
    bg: 'rgba(245,158,11,0.14)',
    text: 'var(--amber-700, #b45309)',
    icon: Clock,
  },
  ACEPTADA: {
    label: 'Firmada',
    bg: 'rgba(16,185,129,0.14)',
    text: 'var(--emerald-700)',
    icon: CheckCircle2,
  },
  OBSERVADA: {
    label: 'Observada',
    bg: 'rgba(239,68,68,0.12)',
    text: 'var(--crimson-700, #b91c1c)',
    icon: AlertCircle,
  },
  ANULADA: {
    label: 'Anulada',
    bg: 'var(--neutral-100)',
    text: 'var(--text-tertiary)',
    icon: AlertCircle,
  },
}

function formatPeriodo(periodo: string): string {
  const [year, month] = periodo.split('-')
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return `${months[parseInt(month, 10) - 1] ?? month} ${year}`
}

function fmt(v: string | number): string {
  return Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function BoletasPage() {
  const [boletas, setBoletas] = useState<PayslipItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetch('/api/mi-portal/boletas')
      .then((r) => {
        if (!r.ok) throw new Error('No pudimos cargar tus boletas')
        return r.json()
      })
      .then((d: { boletas?: PayslipItem[] }) => {
        if (!mounted) return
        setBoletas(d.boletas || [])
      })
      .catch((e: Error) => {
        if (!mounted) return
        setError(e.message)
      })
      .finally(() => {
         
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} />

  const pending = boletas.filter((b) => !b.acceptedAt && b.status !== 'ANULADA').length

  return (
    <div className="space-y-6">
      {/* ─── Header editorial ────────────────────────────────────────── */}
      <header className="pb-4" style={{ borderBottom: '0.5px solid var(--border-default)' }}>
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-700 mb-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' }}
          />
          <span>{pending > 0 ? `${pending} por firmar` : 'Todas firmadas'}</span>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}
          dangerouslySetInnerHTML={{
            __html: `Mis <em style="color: var(--emerald-700); font-style: italic">boletas de pago</em>`,
          }}
        />
        <p className="text-sm text-[color:var(--text-secondary)] max-w-xl">
          Consulta, descarga y firma la recepción de cada boleta. La firma con huella tiene el mismo
          valor legal que la firma manuscrita (D.S. 001-98-TR · Ley 27269).
        </p>
      </header>

      {/* ─── Evolución del sueldo ─────────────────────────────────────── */}
      <SalaryChart />

      {/* ─── CTS proyectada ───────────────────────────────────────────── */}
      <CTSProjectionCard />

      {/* ─── Empty ───────────────────────────────────────────────────── */}
      {boletas.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'white', border: '0.5px dashed var(--border-default)' }}
        >
          <Receipt className="h-12 w-12 text-[color:var(--text-tertiary)] mx-auto mb-3 opacity-60" />
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            Aún no hay boletas emitidas
          </h3>
          <p className="text-sm text-[color:var(--text-tertiary)] max-w-md mx-auto">
            Cuando la empresa emita tu próxima boleta, aparecerá acá para que la firmes.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {boletas.map((b) => (
            <PayslipCard key={b.id} boleta={b} />
          ))}
        </div>
      )}

      {/* ─── Legal notice ────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-2.5 rounded-xl p-4"
        style={{
          background: 'rgba(16,185,129,0.05)',
          border: '0.5px solid rgba(16,185,129,0.2)',
        }}
      >
        <Fingerprint className="h-4 w-4 text-emerald-700 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">
          <b className="text-[color:var(--text-primary)]">Firma con huella digital</b>.
          Cuando firmas una boleta, la biometría de tu dispositivo queda registrada
          como prueba de recepción. Base legal: D.S. 001-98-TR Art. 19 + Ley 27269.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  PayslipCard — tarjeta individual de boleta
// ─────────────────────────────────────────────────────────────────────────────

function PayslipCard({ boleta }: { boleta: PayslipItem }) {
  const status = STATUS_META[boleta.status] ?? STATUS_META.EMITIDA
  const StatusIcon = status.icon
  const isPending = !boleta.acceptedAt && boleta.status !== 'ANULADA'

  return (
    <Link
      href={`/mi-portal/boletas/${boleta.id}`}
      className="group block rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-lift,0_8px_16px_-4px_rgba(15,23,42,0.08))]"
      style={{
        background: isPending
          ? 'linear-gradient(135deg, #fffbeb 0%, #ffffff 70%)'
          : 'white',
        border: isPending
          ? '0.5px solid rgba(245,158,11,0.22)'
          : '0.5px solid var(--border-default)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-bold text-[color:var(--text-primary)]">
              {formatPeriodo(boleta.periodo)}
            </h3>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: status.bg,
                color: status.text,
              }}
            >
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
          </div>
          <p className="text-[11px] text-[color:var(--text-tertiary)]">
            Emitida el {new Date(boleta.fechaEmision).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)]">
            Neto
          </p>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--emerald-700)',
              letterSpacing: '-0.015em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            S/ {fmt(boleta.netoPagar)}
          </p>
        </div>
      </div>

      {/* Ingreso / descuento summary */}
      <div className="flex items-center gap-4 text-[11px] text-[color:var(--text-tertiary)] mb-3">
        <span>
          Ingresos <span className="font-mono font-semibold text-[color:var(--text-secondary)]">S/ {fmt(boleta.totalIngresos)}</span>
        </span>
        <span>
          Descuentos <span className="font-mono font-semibold text-[color:var(--text-secondary)]">-S/ {fmt(boleta.totalDescuentos)}</span>
        </span>
      </div>

      {/* Actions footer */}
      <div className="flex items-center justify-between pt-3" style={{ borderTop: '0.5px solid var(--border-subtle)' }}>
        {isPending ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
            <Fingerprint className="h-3.5 w-3.5" />
            Firma con huella
          </span>
        ) : boleta.acceptedAt ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Firmada el {new Date(boleta.acceptedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
          </span>
        ) : (
          <span className="text-xs text-[color:var(--text-tertiary)]">—</span>
        )}
        <div className="flex items-center gap-2">
          {boleta.pdfUrl ? (
            <a
              href={boleta.pdfUrl}
              download
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-[color:var(--text-tertiary)] hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
              title="Descargar PDF"
              aria-label="Descargar"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          ) : null}
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-emerald-700 group-hover:bg-emerald-50 transition-colors">
            <Eye className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  States
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-3 w-20 rounded bg-emerald-100 mb-2" />
        <div className="h-9 w-64 rounded-lg bg-gray-200 mb-2" />
        <div className="h-4 w-96 rounded bg-[color:var(--neutral-100)]" />
      </div>
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl h-32 bg-[color:var(--neutral-100)]" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: '#fef2f2', border: '0.5px solid rgba(239,68,68,0.25)' }}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-red-900">No pudimos cargar tus boletas</h3>
          <p className="text-sm text-red-800 mt-1">{message}</p>
        </div>
      </div>
    </div>
  )
}
