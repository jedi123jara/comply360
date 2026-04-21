'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Banknote,
  TrendingUp,
  Loader2,
  Download,
  Plus,
  FileText,
} from 'lucide-react'

/**
 * TabRemuneraciones — histórico de boletas del trabajador.
 *
 * Consume `/api/workers/[id]/payslips`. Muestra:
 *  - KPI row premium (último neto, planilla acumulada año, # boletas)
 *  - Tabla histórica por periodo con bruto / descuentos / neto
 *  - Enlace a detalle boleta + botón generar nueva
 */

interface Payslip {
  id: string
  periodo: string // YYYY-MM
  fechaEmision: string
  sueldoBruto: number
  asignacionFamiliar: number
  bonificaciones: number
  totalIngresos: number
  aporteAfpOnp: number
  rentaQuintaCat: number
  totalDescuentos: number
  netoPagar: number
  essalud: number
  status: string
}

interface TabRemuneracionesProps {
  workerId: string
  workerFirstName: string
}

const pen = (n: number) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const periodoLabel = (p: string) => {
  const [y, m] = p.split('-')
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]
  const monthIdx = parseInt(m ?? '1', 10) - 1
  return `${months[monthIdx] ?? m} ${y}`
}

export function TabRemuneraciones({ workerId, workerFirstName }: TabRemuneracionesProps) {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch pattern estándar; migrar a useApiQuery en refactor futuro.
    setLoading(true)
    fetch(`/api/workers/${workerId}/payslips?limit=60`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`)
        return r.json()
      })
      .then((json: { data?: Payslip[] } | Payslip[]) => {
        if (!mounted) return
        const data = Array.isArray(json) ? json : (json.data ?? [])
        setPayslips(data)
      })
      .catch((e: Error) => {
        if (!mounted) return
        setError(e.message || 'Error al cargar boletas')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [workerId])

  const stats = useMemo(() => {
    if (payslips.length === 0) {
      return { lastNeto: 0, acumuladoYear: 0, total: 0, lastPeriodo: null as string | null }
    }
    const currentYear = new Date().getFullYear().toString()
    const acumuladoYear = payslips
      .filter((p) => p.periodo.startsWith(currentYear))
      .reduce((s, p) => s + (p.netoPagar ?? 0), 0)
    return {
      lastNeto: payslips[0].netoPagar,
      acumuladoYear,
      total: payslips.length,
      lastPeriodo: payslips[0].periodo,
    }
  }, [payslips])

  if (loading) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-10 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-600 mx-auto mb-2" />
        <p className="text-sm text-[color:var(--text-tertiary)]">Cargando boletas…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header editorial */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700 mb-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' }}
            />
            <span>Remuneraciones</span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
            dangerouslySetInnerHTML={{
              __html: `Histórico de boletas de <em style="color: var(--emerald-700); font-style: italic">${workerFirstName}</em>.`,
            }}
          />
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">
            Cada boleta registra bruto, aportes, impuestos y neto con detalle legal auditable.
          </p>
        </div>
        <Link
          href={`/dashboard/boletas?workerId=${workerId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors"
          style={{ boxShadow: '0 1px 2px rgba(4,120,87,0.18), inset 0 1px 0 rgba(255,255,255,0.12)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Generar boleta
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* KPIs premium */}
      <section
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        <div className="c360-kpi accent">
          <div className="c360-kpi-head">
            <span className="dot" />
            <Banknote size={12} strokeWidth={2.2} />
            <span>Último neto</span>
          </div>
          <div className="c360-kpi-value">
            <span style={{ fontSize: '0.55em', marginRight: 2, opacity: 0.7 }}>S/</span>
            {pen(stats.lastNeto)}
          </div>
          <div className="c360-kpi-foot">
            {stats.lastPeriodo ? periodoLabel(stats.lastPeriodo) : 'Sin emisiones todavía'}
          </div>
        </div>
        <div className="c360-kpi">
          <div className="c360-kpi-head">
            <span className="dot" />
            <TrendingUp size={12} strokeWidth={2.2} />
            <span>Acumulado {new Date().getFullYear()}</span>
          </div>
          <div className="c360-kpi-value">
            <span style={{ fontSize: '0.55em', marginRight: 2, opacity: 0.7 }}>S/</span>
            {pen(stats.acumuladoYear)}
          </div>
          <div className="c360-kpi-foot">Suma de netos emitidos este año</div>
        </div>
        <div className="c360-kpi">
          <div className="c360-kpi-head">
            <span className="dot" />
            <FileText size={12} strokeWidth={2.2} />
            <span>Boletas emitidas</span>
          </div>
          <div className="c360-kpi-value">{stats.total}</div>
          <div className="c360-kpi-foot">Total histórico en legajo</div>
        </div>
      </section>

      {/* Payslips table */}
      {payslips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border-default)] bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 mb-3">
            <Banknote className="h-5 w-5" />
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            Aún no hay boletas emitidas
          </h3>
          <p className="text-sm text-[color:var(--text-tertiary)] max-w-md mx-auto">
            Genera la primera boleta y el histórico quedará auditable aquí mismo.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[color:var(--border-default)] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[color:var(--neutral-50)] border-b border-[color:var(--border-default)]">
                  <th className="text-left px-4 py-3 font-semibold text-[color:var(--text-secondary)] text-xs uppercase tracking-widest">
                    Periodo
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-[color:var(--text-secondary)] text-xs uppercase tracking-widest">
                    Bruto
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-[color:var(--text-secondary)] text-xs uppercase tracking-widest">
                    Descuentos
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-[color:var(--text-secondary)] text-xs uppercase tracking-widest">
                    Neto
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-[color:var(--text-secondary)] text-xs uppercase tracking-widest">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border-subtle)]">
                {payslips.map((p) => (
                  <tr key={p.id} className="hover:bg-[color:var(--neutral-50)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[color:var(--text-primary)]">
                      {periodoLabel(p.periodo)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[color:var(--text-secondary)]">
                      S/ {pen(p.totalIngresos ?? p.sueldoBruto)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[color:var(--text-tertiary)]">
                      - S/ {pen(p.totalDescuentos ?? 0)}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono"
                      style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text-primary)' }}
                    >
                      S/ {pen(p.netoPagar ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          background:
                            p.status === 'PAID'
                              ? 'rgba(16,185,129,0.12)'
                              : 'rgba(245,158,11,0.12)',
                          color:
                            p.status === 'PAID'
                              ? 'var(--emerald-700)'
                              : 'var(--amber-700, #b45309)',
                        }}
                      >
                        {p.status === 'PAID' ? 'Pagada' : 'Emitida'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--border-subtle)] bg-[color:var(--neutral-50)]">
            <p className="text-xs text-[color:var(--text-tertiary)]">
              {payslips.length} boleta{payslips.length === 1 ? '' : 's'} en el legajo
            </p>
            <Link
              href={`/api/export?type=payslips&workerId=${workerId}&format=xlsx`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <Download className="h-3 w-3" />
              Exportar Excel
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
