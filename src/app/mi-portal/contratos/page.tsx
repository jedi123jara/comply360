'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  FileSignature,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Fingerprint,
  ShieldCheck,
  Loader2,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner-toaster'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface ContractItem {
  id: string
  title: string
  type: string
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SIGNED' | 'EXPIRED' | 'ARCHIVED'
  pendingToSign: boolean
  signedAt: string | null
  signatureLevel: 'SIMPLE' | 'BIOMETRIC' | 'CERTIFIED' | null
  expiresAt: string | null
  expired: boolean
  daysToExpire: number | null
  createdAt: string
  updatedAt: string
  hasPdf: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════

export default function MiPortalContratosPage() {
  const [contracts, setContracts] = useState<ContractItem[]>([])
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState<{ total: number; pending: number; signed: number }>({
    total: 0,
    pending: 0,
    signed: 0,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mi-portal/contratos', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as {
        contracts: ContractItem[]
        totals: typeof totals
      }
      setContracts(body.contracts)
      setTotals(body.totals)
    } catch (err) {
      console.error('[mi-portal/contratos] load', err)
      toast.error('No se pudieron cargar los contratos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      void load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const pending = useMemo(() => contracts.filter((c) => c.pendingToSign), [contracts])
  const signed = useMemo(() => contracts.filter((c) => c.status === 'SIGNED'), [contracts])
  const expired = useMemo(
    () => contracts.filter((c) => c.expired || c.status === 'EXPIRED'),
    [contracts],
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Hero editorial */}
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' }}
          />
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
            Tus contratos
          </span>
        </div>
        <h1
          className="text-[32px] leading-tight text-[color:var(--text-primary)]"
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.02em' }}
          dangerouslySetInnerHTML={{
            __html:
              pending.length > 0
                ? `Tienes <em style="color:var(--emerald-700);font-style:italic;">${pending.length} contrato${pending.length === 1 ? '' : 's'}</em> pendiente${pending.length === 1 ? '' : 's'} de firma.`
                : 'Al día con tus <em style="color:var(--emerald-700);font-style:italic;">contratos</em>.',
          }}
        />
        <p className="text-sm text-[color:var(--text-secondary)]">
          {pending.length > 0
            ? 'Lee el contenido y firma con tu huella o Face ID. La firma biométrica tiene validez legal entre partes.'
            : 'Cuando tu empleador te envíe un nuevo contrato, aparecerá acá para firmar.'}
        </p>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <StatPill
          value={totals.pending}
          label="Pendientes"
          accent="amber"
          icon={<Clock className="h-3.5 w-3.5" />}
        />
        <StatPill
          value={totals.signed}
          label="Firmados"
          accent="emerald"
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        />
        <StatPill
          value={totals.total}
          label="En total"
          accent="neutral"
          icon={<FileSignature className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Pending section */}
      {pending.length > 0 ? (
        <Section
          title="Esperan tu firma"
          subtitle="Firma para continuar con tu onboarding en la empresa."
          accent="amber"
        >
          {pending.map((c) => (
            <ContractCard key={c.id} contract={c} highlight />
          ))}
        </Section>
      ) : null}

      {/* Signed */}
      {signed.length > 0 ? (
        <Section title="Firmados" subtitle={`${signed.length} contrato(s) cerrados.`}>
          {signed.map((c) => (
            <ContractCard key={c.id} contract={c} />
          ))}
        </Section>
      ) : null}

      {/* Expired */}
      {expired.length > 0 ? (
        <Section title="Vencidos / Archivados">
          {expired.map((c) => (
            <ContractCard key={c.id} contract={c} muted />
          ))}
        </Section>
      ) : null}

      {/* Empty */}
      {contracts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border-default)] bg-white px-6 py-16 text-center">
          <FileSignature className="mx-auto mb-3 h-10 w-10 text-[color:var(--text-tertiary)]" />
          <p
            className="text-xl text-[color:var(--text-primary)]"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
          >
            Aún no hay contratos vinculados a tu perfil.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[color:var(--text-secondary)]">
            Cuando tu empleador te envíe un nuevo contrato, aparecerá acá. Vas a poder leerlo y
            firmarlo con tu huella desde tu celular.
          </p>
        </div>
      ) : null}

      {/* Legal note */}
      <footer
        className="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4 text-[12px] leading-relaxed text-[color:var(--text-secondary)]"
      >
        <div className="mb-1 flex items-center gap-2 font-semibold text-[color:var(--text-primary)]">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Sobre la firma biométrica
        </div>
        <p>
          Tu huella o Face ID NO se envían a Comply360. El sensor de tu dispositivo valida
          localmente tu identidad y nosotros registramos solo la prueba criptográfica. La firma
          electrónica es válida ante Ley 27269 entre tú y tu empleador.
        </p>
      </footer>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function Section({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string
  subtitle?: string
  accent?: 'amber' | 'emerald'
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between">
        <div>
          <h2
            className="text-lg font-semibold text-[color:var(--text-primary)]"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="text-[12px] text-[color:var(--text-secondary)]">{subtitle}</p>
          ) : null}
        </div>
        {accent === 'amber' ? (
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-amber-500"
            style={{
              boxShadow: '0 0 0 3px rgba(245,158,11,0.2)',
              animation: 'c360-pulseEmerald 2.4s infinite',
            }}
          />
        ) : null}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function ContractCard({
  contract,
  highlight,
  muted,
}: {
  contract: ContractItem
  highlight?: boolean
  muted?: boolean
}) {
  const typeLabel = TYPE_LABELS[contract.type] ?? contract.type.replace(/_/g, ' ')

  return (
    <Link
      href={`/mi-portal/contratos/${contract.id}`}
      className={`group relative block overflow-hidden rounded-2xl border bg-white p-4 transition-all active:scale-[0.99] ${
        highlight
          ? 'border-amber-300 shadow-[0_4px_12px_rgba(245,158,11,0.08)]'
          : muted
            ? 'border-[color:var(--border-subtle)] opacity-80'
            : 'border-[color:var(--border-default)] hover:border-emerald-300'
      }`}
    >
      {highlight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.12), transparent 70%)',
          }}
        />
      ) : null}

      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            highlight
              ? 'bg-amber-100 text-amber-700'
              : contract.status === 'SIGNED'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]'
          }`}
        >
          {highlight ? (
            <Fingerprint className="h-5 w-5" />
          ) : contract.status === 'SIGNED' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <FileSignature className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            {typeLabel}
          </p>
          <h3
            className="mt-0.5 truncate text-[15px] font-semibold text-[color:var(--text-primary)]"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
          >
            {contract.title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <StatusPill contract={contract} />
            {contract.signedAt ? (
              <span className="text-[color:var(--text-tertiary)]">
                Firmado {formatDate(contract.signedAt)}
              </span>
            ) : (
              <span className="text-[color:var(--text-tertiary)]">
                Recibido {formatDate(contract.createdAt)}
              </span>
            )}
            {contract.signatureLevel === 'BIOMETRIC' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                <Fingerprint className="h-3 w-3" /> Biométrica
              </span>
            ) : null}
          </div>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

function StatusPill({ contract }: { contract: ContractItem }) {
  if (contract.expired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-800 ring-1 ring-rose-200">
        <AlertTriangle className="h-3 w-3" /> Vencido
      </span>
    )
  }
  if (contract.pendingToSign) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900 ring-1 ring-amber-300">
        <Clock className="h-3 w-3" /> Firma ya
      </span>
    )
  }
  if (contract.status === 'SIGNED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> Firmado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--neutral-100)] px-2 py-0.5 font-semibold text-[color:var(--text-secondary)]">
      {contract.status}
    </span>
  )
}

function StatPill({
  value,
  label,
  accent,
  icon,
}: {
  value: number
  label: string
  accent: 'amber' | 'emerald' | 'neutral'
  icon: React.ReactNode
}) {
  const palette = {
    amber: { bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'ring-emerald-200' },
    neutral: { bg: 'bg-[color:var(--neutral-50)]', text: 'text-[color:var(--text-primary)]', ring: 'ring-[color:var(--border-default)]' },
  }[accent]
  return (
    <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 ring-1 ${palette.bg} ${palette.ring}`}>
      <span className={palette.text}>{icon}</span>
      <div className="min-w-0">
        <p
          className={`text-lg leading-none ${palette.text}`}
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
        >
          {value}
        </p>
        <p className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--text-tertiary)]">
          {label}
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Utils
// ═══════════════════════════════════════════════════════════════════════════

const TYPE_LABELS: Record<string, string> = {
  LABORAL_INDEFINIDO: 'Contrato indefinido',
  LABORAL_PLAZO_FIJO: 'Contrato a plazo fijo',
  LABORAL_TIEMPO_PARCIAL: 'Contrato a tiempo parcial',
  LOCACION_SERVICIOS: 'Locación de servicios',
  ADDENDUM: 'Adenda',
  CONVENIO_PRACTICAS: 'Convenio de prácticas',
  CUSTOM: 'Documento',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}
