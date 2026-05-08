'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  Plus,
  PenTool,
  Eye,
  CheckCircle,
  AlertTriangle,
  Archive,
  Loader2,
  Shield,
  Calendar,
} from 'lucide-react'

/**
 * TabContratos — lista de contratos del trabajador.
 *
 * Consume `/api/contracts?workerId=${id}`. Muestra cada contrato como card
 * con type label, status badge, AI risk score, fecha expiración y enlace a
 * ver/editar. CTA "Nuevo contrato" pre-rellena con el workerId.
 */

interface ContractItem {
  id: string
  title: string
  type: string
  status: string
  aiRiskScore: number | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

interface TabContratosProps {
  workerId: string
  workerFirstName: string
}

const TYPE_LABELS: Record<string, string> = {
  LABORAL_INDEFINIDO: 'Plazo Indeterminado',
  LABORAL_PLAZO_FIJO: 'Plazo Fijo',
  LOCACION_SERVICIOS: 'Locación de Servicios',
  TIEMPO_PARCIAL: 'Tiempo Parcial',
  MYPE_MICRO: 'MYPE Microempresa',
  MYPE_PEQUENA: 'MYPE Pequeña Empresa',
  CONVENIO_PRACTICAS: 'Convenio de Prácticas',
  NDA: 'Confidencialidad',
}

const STATUS_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  DRAFT: { label: 'Borrador', icon: PenTool, color: '#64748b' },
  IN_REVIEW: { label: 'En revisión', icon: Eye, color: '#f59e0b' },
  APPROVED: { label: 'Aprobado', icon: CheckCircle, color: '#2563eb' },
  SIGNED: { label: 'Firmado', icon: CheckCircle, color: '#1e40af' },
  EXPIRED: { label: 'Vencido', icon: AlertTriangle, color: '#ef4444' },
  ARCHIVED: { label: 'Archivado', icon: Archive, color: '#94a3b8' },
}

export function TabContratos({ workerId, workerFirstName }: TabContratosProps) {
  const [contracts, setContracts] = useState<ContractItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch pattern estándar; migrar a useApiQuery en refactor futuro.
    setLoading(true)
    fetch(`/api/contracts?workerId=${workerId}&limit=50`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`)
        return r.json()
      })
      .then((json: { data?: ContractItem[] }) => {
        if (!mounted) return
        setContracts(json.data ?? [])
      })
      .catch((e: Error) => {
        if (!mounted) return
        setError(e.message || 'Error al cargar contratos')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [workerId])

  if (loading) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-10 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-600 mx-auto mb-2" />
        <p className="text-sm text-[color:var(--text-tertiary)]">Cargando contratos…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700 mb-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' }}
            />
            <span>{contracts.length} contrato{contracts.length === 1 ? '' : 's'}</span>
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
              __html: `Contratos vinculados a <em style="color: var(--emerald-700); font-style: italic">${workerFirstName}</em>.`,
            }}
          />
          <p className="text-sm text-[color:var(--text-secondary)] mt-1 max-w-2xl">
            Indefinidos, plazo fijo, locación o MYPE — cada uno enlazado al legajo y al motor de alertas.
          </p>
        </div>
        <Link
          href={`/dashboard/contratos/nuevo?workerId=${workerId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors"
          style={{ boxShadow: '0 1px 2px rgba(4,120,87,0.18), inset 0 1px 0 rgba(255,255,255,0.12)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Generar nuevo
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {contracts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border-default)] bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 mb-3">
            <FileText className="h-5 w-5" />
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: '-0.015em',
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            Todavía no hay contratos
          </h3>
          <p className="text-sm text-[color:var(--text-tertiary)] max-w-md mx-auto mb-5">
            Genera el primer contrato con pre-fill automático de los datos del trabajador:
            DNI, cargo, sueldo y régimen.
          </p>
          <Link
            href={`/dashboard/contratos/nuevo?workerId=${workerId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Crear primer contrato
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {contracts.map((c) => (
            <ContractRow key={c.id} contract={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function ContractRow({ contract }: { contract: ContractItem }) {
  const status = STATUS_META[contract.status] ?? STATUS_META.DRAFT
  const typeLabel = TYPE_LABELS[contract.type] ?? contract.type
  const Icon = status.icon
  const expires = contract.expiresAt ? new Date(contract.expiresAt) : null
  // `Date.now()` durante render se considera impuro en React 19. Lo cacheamos
  // con useState initializer — se ejecuta una vez en mount y queda estable.
  const [nowMs] = useState(() => Date.now())
  const daysToExpiry = expires
    ? Math.ceil((expires.getTime() - nowMs) / (24 * 3600 * 1000))
    : null
  const riskLevel =
    contract.aiRiskScore == null
      ? null
      : contract.aiRiskScore >= 70
        ? 'low'
        : contract.aiRiskScore >= 40
          ? 'medium'
          : 'high'

  return (
    <Link
      href={`/dashboard/contratos/${contract.id}`}
      className="group flex items-center gap-4 rounded-xl border border-[color:var(--border-subtle)] bg-white px-5 py-4 hover:border-emerald-500/40 hover:shadow-sm transition-all"
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
        style={{
          background: `color-mix(in srgb, ${status.color} 12%, transparent)`,
          color: status.color,
        }}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-semibold text-[color:var(--text-primary)] truncate">
            {contract.title}
          </h4>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: `color-mix(in srgb, ${status.color} 12%, transparent)`,
              color: status.color,
            }}
          >
            {status.label}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
          {typeLabel}
          {expires && daysToExpiry !== null ? (
            <>
              {' · '}
              <Calendar className="inline h-3 w-3 -mt-0.5" />{' '}
              {daysToExpiry > 0
                ? `Vence en ${daysToExpiry} d`
                : daysToExpiry === 0
                  ? 'Vence hoy'
                  : `Vencido hace ${Math.abs(daysToExpiry)} d`}
            </>
          ) : null}
        </p>
      </div>

      {riskLevel ? (
        <div
          className="hidden sm:flex items-center gap-1.5 text-xs font-semibold flex-shrink-0"
          style={{
            color:
              riskLevel === 'low'
                ? 'var(--emerald-700)'
                : riskLevel === 'medium'
                  ? 'var(--amber-700, #b45309)'
                  : 'var(--crimson-700, #b91c1c)',
          }}
        >
          <Shield className="h-3.5 w-3.5" />
          Riesgo IA {contract.aiRiskScore}
        </div>
      ) : null}

      <span className="text-[color:var(--text-tertiary)] group-hover:text-emerald-700 transition-colors text-sm flex-shrink-0">
        →
      </span>
    </Link>
  )
}
