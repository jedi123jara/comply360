'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Eye,
  FileCheck2,
  Fingerprint,
  Receipt,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  WalletCards,
  Clock,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { CTSProjectionCard } from '@/components/mi-portal'
import { formatSoles } from '@/lib/format/peruvian'

const SalaryChart = dynamic(
  () => import('@/components/mi-portal').then((m) => ({ default: m.SalaryChart })),
  {
    ssr: false,
    loading: () => <div className="c360-os-skeleton-block h-[240px]" aria-busy="true" />,
  },
)

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

const MOCK_BOLETAS: PayslipItem[] = [
  {
    id: 'preview-may-2026',
    periodo: '2026-05',
    fechaEmision: '2026-05-15T12:00:00.000Z',
    totalIngresos: '2450.00',
    totalDescuentos: '318.40',
    netoPagar: '2131.60',
    status: 'ENVIADA',
    pdfUrl: null,
    acceptedAt: null,
  },
  {
    id: 'preview-apr-2026',
    periodo: '2026-04',
    fechaEmision: '2026-04-30T12:00:00.000Z',
    totalIngresos: '2450.00',
    totalDescuentos: '306.20',
    netoPagar: '2143.80',
    status: 'ACEPTADA',
    pdfUrl: null,
    acceptedAt: '2026-05-01T09:14:00.000Z',
  },
  {
    id: 'preview-mar-2026',
    periodo: '2026-03',
    fechaEmision: '2026-03-31T12:00:00.000Z',
    totalIngresos: '2380.00',
    totalDescuentos: '298.30',
    netoPagar: '2081.70',
    status: 'ACEPTADA',
    pdfUrl: null,
    acceptedAt: '2026-04-01T08:42:00.000Z',
  },
]

const STATUS_META: Record<
  string,
  { label: string; bg: string; text: string; icon: LucideIcon }
> = {
  EMITIDA: {
    label: 'Emitida',
    bg: 'rgba(59,130,246,0.12)',
    text: '#1d4ed8',
    icon: Receipt,
  },
  ENVIADA: {
    label: 'Por firmar',
    bg: 'rgba(245,158,11,0.16)',
    text: '#b45309',
    icon: Clock,
  },
  ACEPTADA: {
    label: 'Firmada',
    bg: 'rgba(16,185,129,0.15)',
    text: '#047857',
    icon: CheckCircle2,
  },
  OBSERVADA: {
    label: 'Observada',
    bg: 'rgba(239,68,68,0.12)',
    text: '#b91c1c',
    icon: AlertCircle,
  },
  ANULADA: {
    label: 'Anulada',
    bg: '#f1f5f9',
    text: '#64748b',
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

function withPreviewHref(href: string, enabled: boolean): string {
  if (!enabled || !href.startsWith('/mi-portal')) return href
  if (href.includes('__workerPreview=')) return href
  const [pathAndQuery, hash = ''] = href.split('#')
  const separator = pathAndQuery.includes('?') ? '&' : '?'
  return `${pathAndQuery}${separator}__workerPreview=1${hash ? `#${hash}` : ''}`
}

export default function BoletasPage() {
  const [boletas, setBoletas] = useState<PayslipItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const isWorkerPreview =
    process.env.NODE_ENV === 'development' && searchParams.get('__workerPreview') === '1'
  const displayBoletas = isWorkerPreview ? MOCK_BOLETAS : boletas

  useEffect(() => {
    if (isWorkerPreview) return

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
  }, [isWorkerPreview])

  const stats = useMemo(() => {
    const pending = displayBoletas.filter((b) => !b.acceptedAt && b.status !== 'ANULADA').length
    const signed = displayBoletas.filter((b) => b.acceptedAt).length
    const latest = displayBoletas[0] ?? null
    const monthlyNet = latest ? Number(latest.netoPagar) : 0
    const previousNet = displayBoletas[1] ? Number(displayBoletas[1].netoPagar) : monthlyNet
    const delta = monthlyNet - previousNet
    return { pending, signed, latest, monthlyNet, previousNet, delta }
  }, [displayBoletas])

  if (!isWorkerPreview && loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} />

  return (
    <div className="c360-worker-os c360-worker-wallet space-y-6 pb-24">
      <section className="c360-os-hero c360-wallet-hero">
        <div className="c360-os-hero-copy">
          <span className="c360-os-eyebrow">
            <WalletCards className="h-3.5 w-3.5" />
            Wallet laboral
          </span>
          <h1>Boletas, pagos y firma en un solo lugar.</h1>
          <p>
            Revisa tu neto, descarga comprobantes y firma la recepción con una
            ceremonia biométrica auditable.
          </p>
          <div className="c360-os-hero-actions">
            {stats.pending > 0 && stats.latest ? (
              <Link href={withPreviewHref(`/mi-portal/boletas/${stats.latest.id}`, isWorkerPreview)} className="c360-os-primary-action">
                Firmar pendiente
                <Fingerprint className="h-4 w-4" />
              </Link>
            ) : (
              <span className="c360-os-done-pill">
                <CheckCircle2 className="h-4 w-4" />
                Todo firmado
              </span>
            )}
            <span className="c360-os-audit-pill">
              <ShieldCheck className="h-4 w-4" />
              Audit trail activo
            </span>
          </div>
        </div>

        <aside className="c360-wallet-statement">
          <p className="text-xs font-black text-emerald-700">Última boleta</p>
          <h2>{stats.latest ? formatPeriodo(stats.latest.periodo) : 'Sin emisión'}</h2>
          <div className="c360-wallet-net">
            <span>Neto a pagar</span>
            <strong>{formatSoles(stats.monthlyNet)}</strong>
          </div>
          <div className="c360-wallet-bars" aria-hidden="true">
            <span style={{ width: '92%' }} />
            <span style={{ width: '76%' }} />
            <span style={{ width: '54%' }} />
          </div>
          <div className="c360-wallet-statement-row">
            <span>Ingresos</span>
            <strong>{formatSoles(stats.latest?.totalIngresos ?? 0)}</strong>
          </div>
          <div className="c360-wallet-statement-row">
            <span>Descuentos</span>
            <strong>-{formatSoles(stats.latest?.totalDescuentos ?? 0)}</strong>
          </div>
        </aside>
      </section>

      <section className="c360-os-metrics-grid">
        <MetricCard
          icon={Fingerprint}
          label="Pendientes de firma"
          value={stats.pending}
          helper={stats.pending > 0 ? 'Requieren tu huella' : 'Nada por firmar'}
          tone="amber"
        />
        <MetricCard
          icon={FileCheck2}
          label="Boletas firmadas"
          value={stats.signed}
          helper="Con recepción registrada"
          tone="emerald"
        />
        <MetricCard
          icon={stats.delta >= 0 ? TrendingUp : TrendingDown}
          label="Variación del neto"
          value={`${stats.delta >= 0 ? '+' : ''}${formatSoles(Math.abs(stats.delta))}`}
          helper="vs. periodo anterior"
          tone="blue"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.82fr]">
        {isWorkerPreview ? (
          <>
            <PreviewSalaryInsight />
            <PreviewCTSInsight />
          </>
        ) : (
          <>
            <SalaryChart />
            <CTSProjectionCard />
          </>
        )}
      </section>

      <section className="c360-os-panel">
        <div className="c360-os-section-head">
          <div>
            <span>Historial</span>
            <h2>Estados de pago</h2>
          </div>
          <small>{displayBoletas.length} registro{displayBoletas.length === 1 ? '' : 's'}</small>
        </div>

        {displayBoletas.length === 0 ? (
          <div className="c360-os-empty">
            <Receipt className="h-9 w-9" />
            <h3>Aún no hay boletas emitidas</h3>
            <p>Cuando la empresa emita tu próxima boleta, aparecerá acá para firmarla.</p>
          </div>
        ) : (
          <div className="c360-wallet-list">
            {displayBoletas.map((b) => (
              <PayslipCard key={b.id} boleta={b} isWorkerPreview={isWorkerPreview} />
            ))}
          </div>
        )}
      </section>

      <div className="c360-os-legal-note">
        <Fingerprint className="h-4 w-4" />
        <p>
          <b>Firma con huella digital.</b> La biometría de tu dispositivo no se envía a
          Comply360; se registra una prueba criptográfica de recepción.
        </p>
      </div>
    </div>
  )
}

function PreviewSalaryInsight() {
  const bars = [
    { label: 'Ene', value: 58 },
    { label: 'Feb', value: 64 },
    { label: 'Mar', value: 70 },
    { label: 'Abr', value: 76 },
    { label: 'May', value: 84 },
  ]

  return (
    <article className="c360-os-panel c360-wallet-chart-preview">
      <div className="c360-os-section-head">
        <div>
          <span>Tendencia</span>
          <h2>Mi sueldo neto</h2>
        </div>
        <small>+2.4%</small>
      </div>
      <div className="c360-wallet-chart-grid" aria-label="Evolución referencial del sueldo neto">
        {bars.map((bar) => (
          <span key={bar.label}>
            <i style={{ height: `${bar.value}%` }} />
            <b>{bar.label}</b>
          </span>
        ))}
      </div>
      <p>
        Promedio del periodo: <strong>{formatSoles(2119.30)}</strong>
      </p>
    </article>
  )
}

function PreviewCTSInsight() {
  return (
    <article className="c360-os-panel c360-wallet-cts-preview">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5" />
        <span>Tu CTS proyectada</span>
      </div>
      <strong>{formatSoles(1226.40)}</strong>
      <p>Próximo depósito: <b>15 de noviembre</b></p>
      <div className="c360-wallet-cts-steps" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </article>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  helper: string
  tone: 'emerald' | 'blue' | 'amber'
}) {
  return (
    <article className={`c360-os-metric c360-os-tone-${tone}`}>
      <div className="c360-os-metric-icon">
        <Icon className="h-5 w-5" />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  )
}

function PayslipCard({ boleta, isWorkerPreview }: { boleta: PayslipItem; isWorkerPreview: boolean }) {
  const status = STATUS_META[boleta.status] ?? STATUS_META.EMITIDA
  const StatusIcon = status.icon
  const isPending = !boleta.acceptedAt && boleta.status !== 'ANULADA'
  const detailHref = withPreviewHref(`/mi-portal/boletas/${boleta.id}`, isWorkerPreview)

  return (
    <article className={`c360-wallet-payslip ${isPending ? 'is-pending' : ''}`}>
      <Link href={detailHref} className="c360-wallet-payslip-main">
        <div className="c360-wallet-payslip-icon">
          {isPending ? <Fingerprint className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3>{formatPeriodo(boleta.periodo)}</h3>
            <span className="c360-wallet-status" style={{ background: status.bg, color: status.text }}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
          </div>
          <p>
            Emitida el{' '}
            {new Date(boleta.fechaEmision).toLocaleDateString('es-PE', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="c360-wallet-payslip-net">
          <span>Neto</span>
          <strong>{formatSoles(boleta.netoPagar)}</strong>
        </div>
      </Link>

      <div className="c360-wallet-payslip-footer">
        <span>
          <CircleDollarSign className="h-3.5 w-3.5" />
          Ingresos {formatSoles(boleta.totalIngresos)}
        </span>
        <span>Descuentos -{formatSoles(boleta.totalDescuentos)}</span>
        <div className="ml-auto flex items-center gap-1">
          {boleta.pdfUrl ? (
            <a href={boleta.pdfUrl} download aria-label="Descargar boleta">
              <Download className="h-4 w-4" />
            </a>
          ) : null}
          <Link href={detailHref} aria-label="Ver boleta">
            <Eye className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}

function LoadingSkeleton() {
  return (
    <div className="c360-worker-os space-y-6" aria-busy="true">
      <div className="c360-os-skeleton-block h-[330px]" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="c360-os-skeleton-block h-32" />
        <div className="c360-os-skeleton-block h-32" />
        <div className="c360-os-skeleton-block h-32" />
      </div>
      <div className="c360-os-skeleton-block h-64" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="c360-os-error">
      <AlertCircle className="h-5 w-5" />
      <div>
        <h3>No pudimos cargar tus boletas</h3>
        <p>{message}</p>
      </div>
    </div>
  )
}
