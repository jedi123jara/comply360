'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Building2,
  Calendar,
  Mail,
  X,
  Clock,
  Sparkles,
  ScrollText,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner-toaster'
import { track } from '@/lib/analytics'
import {
  tryBiometricCeremony,
  tryStrongBiometricCeremony,
  hasBiometricHardware,
  type BiometricCeremonyResult,
} from '@/lib/webauthn'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface ContractDetail {
  id: string
  title: string
  type: string
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SIGNED' | 'EXPIRED' | 'ARCHIVED'
  pendingToSign: boolean
  contentHtml: string
  signedAt: string | null
  signature: {
    level: 'SIMPLE' | 'BIOMETRIC' | 'CERTIFIED'
    signedAt: string | null
    userAgent: string | null
  } | null
  expiresAt: string | null
  createdAt: string
  pdfUrl: string | null
  organization: {
    name: string
    razonSocial: string | null
    ruc: string | null
    address: string | null
  }
  sentBy: { name: string; email: string | null } | null
}

type SigningStep = 'idle' | 'reading' | 'ceremony' | 'submitting' | 'success' | 'error'

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════

export default function ContratoDetailPage() {
  const params = useParams()
  const id =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : ''
  const router = useRouter()

  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmedRead, setConfirmedRead] = useState(false)
  const [signingStep, setSigningStep] = useState<SigningStep>('idle')
  const [signError, setSignError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/mi-portal/contratos/${id}`, { cache: 'no-store' })
      if (res.status === 404) {
        toast.error('Contrato no encontrado')
        router.push('/mi-portal/contratos')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as ContractDetail
      setContract(body)
    } catch (err) {
      console.error('[mi-portal/contrato] load', err)
      toast.error('No se pudo cargar el contrato')
    } finally {
      setLoading(false)
    }
  }, [id, router])

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

  useEffect(() => {
    hasBiometricHardware().then(setBiometricAvailable).catch(() => setBiometricAvailable(false))
  }, [])

  const organizationName = useMemo(
    () => contract?.organization.razonSocial ?? contract?.organization.name ?? 'Tu empresa',
    [contract],
  )

  const typeLabel = contract ? (TYPE_LABELS[contract.type] ?? contract.type.replace(/_/g, ' ')) : ''

  const handleSign = async () => {
    if (!contract) return
    setSignError(null)

    track('biometric_ceremony_started', { contractId: contract.id })

    // Step 1: biometric ceremony.
    // FIX #4.J — preferimos `tryStrongBiometricCeremony` (server-side challenge
    // y verify con @simplewebauthn/server). Si el user aún no enroló su passkey
    // (`no-credentials`) o la plataforma no soporta WebAuthn, caemos al flujo
    // legacy `tryBiometricCeremony` (challenge client-side, suficiente para
    // SIMPLE y BIOMETRIC sin replay-protection fuerte).
    setSigningStep('ceremony')
    let ceremony: BiometricCeremonyResult
    try {
      const strong = await tryStrongBiometricCeremony({
        action: 'sign_contract',
        entityId: contract.id,
      })
      if (strong.verified) {
        ceremony = {
          verified: true,
          credentialId: strong.credentialId,
          challenge: strong.challenge,
          challengeToken: strong.challengeToken,
          userAgent: strong.userAgent,
        }
      } else if (strong.reason === 'user-cancelled' || strong.reason === 'timeout') {
        ceremony = { verified: false, reason: strong.reason, userAgent: strong.userAgent }
      } else {
        // no-credentials / no-platform-auth / not-supported / error → legacy
        ceremony = await tryBiometricCeremony({
          action: 'sign_contract',
          entityId: contract.id,
        })
      }
    } catch {
      ceremony = { verified: false, reason: 'error' }
    }

    // Step 2: si el dispositivo tiene biométrica pero el user canceló,
    // abortamos. Si no hay biométrica disponible, seguimos con SIMPLE.
    const hardwareAvailable = biometricAvailable ?? (await hasBiometricHardware())
    if (hardwareAvailable && !ceremony.verified && ceremony.reason === 'user-cancelled') {
      track('biometric_ceremony_failed', { reason: 'user-cancelled' })
      setSignError('Firma cancelada. Puedes volver a intentarlo.')
      setSigningStep('error')
      return
    }

    const signatureLevel: 'SIMPLE' | 'BIOMETRIC' = ceremony.verified ? 'BIOMETRIC' : 'SIMPLE'

    if (ceremony.verified) {
      track('biometric_ceremony_succeeded', { signatureLevel })
    } else {
      track('biometric_ceremony_failed', { reason: ceremony.reason ?? 'unknown' })
    }

    // Step 3: POST al backend
    setSigningStep('submitting')
    try {
      const res = await fetch(`/api/mi-portal/contratos/${contract.id}/firmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureLevel,
          userAgent: ceremony.userAgent ?? navigator.userAgent,
          credentialId: ceremony.credentialId ?? null,
          challengeToken: ceremony.challengeToken,
          challenge: ceremony.challenge,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        data?: { signatureLevel?: string; signedAt?: string }
        message?: string
        error?: string
      }
      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      track('worker_contract_signed', { signatureLevel, contractId: contract.id })
      setSigningStep('success')
      toast.success(body.message ?? 'Contrato firmado')

      // Refresh + auto-close modal
      setTimeout(() => {
        setModalOpen(false)
        setSigningStep('idle')
        void load()
      }, 1800)
    } catch (err) {
      setSignError(err instanceof Error ? err.message : 'Error al firmar')
      setSigningStep('error')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!contract) return null

  const signed = contract.status === 'SIGNED'

  return (
    <div className="space-y-5 pb-24">
      {/* Back */}
      <Link
        href="/mi-portal/contratos"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a contratos
      </Link>

      {/* Hero */}
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' }}
          />
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
            {typeLabel}
          </span>
        </div>
        <h1
          className="text-[28px] leading-tight text-[color:var(--text-primary)]"
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.02em' }}
        >
          {contract.title}
        </h1>

        {/* Chip row */}
        <div className="flex flex-wrap items-center gap-2">
          {signed ? (
            <StatusChip variant="success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Firmado {contract.signedAt ? formatDate(contract.signedAt) : ''}
            </StatusChip>
          ) : (
            <StatusChip variant="warning">
              <Clock className="h-3.5 w-3.5" />
              Pendiente de firma
            </StatusChip>
          )}
          {contract.signature?.level === 'BIOMETRIC' ? (
            <StatusChip variant="info">
              <Fingerprint className="h-3.5 w-3.5" /> Biométrica
            </StatusChip>
          ) : null}
        </div>
      </header>

      {/* Meta card */}
      <section className="rounded-2xl border border-[color:var(--border-default)] bg-white p-4 space-y-2.5">
        <MetaRow icon={<Building2 className="h-3.5 w-3.5" />} label="Empresa" value={organizationName} />
        {contract.organization.ruc ? (
          <MetaRow
            icon={<ScrollText className="h-3.5 w-3.5" />}
            label="RUC"
            value={contract.organization.ruc}
          />
        ) : null}
        <MetaRow
          icon={<Calendar className="h-3.5 w-3.5" />}
          label="Recibido"
          value={formatDate(contract.createdAt)}
        />
        {contract.sentBy ? (
          <MetaRow
            icon={<Mail className="h-3.5 w-3.5" />}
            label="Enviado por"
            value={`${contract.sentBy.name}${contract.sentBy.email ? ` · ${contract.sentBy.email}` : ''}`}
          />
        ) : null}
      </section>

      {/* Content */}
      <section className="rounded-2xl border border-[color:var(--border-default)] bg-white">
        <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-4 py-3">
          <h2
            className="text-sm font-semibold text-[color:var(--text-primary)]"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
          >
            Contenido
          </h2>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Lee con calma
          </span>
        </div>
        <article
          className="prose prose-sm max-w-none px-4 py-4 text-[13px] leading-relaxed text-[color:var(--text-primary)]"
          style={{
            fontFamily: 'var(--font-serif)',
            lineHeight: 1.7,
          }}
          dangerouslySetInnerHTML={{
            __html: contract.contentHtml || '<p><em>Sin contenido disponible.</em></p>',
          }}
        />
      </section>

      {/* Sign block */}
      {!signed ? (
        <section
          className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-white p-5 shadow-[0_4px_12px_rgba(245,158,11,0.08)]"
        >
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <h3
                className="text-lg text-[color:var(--text-primary)]"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
              >
                Firma este contrato
              </h3>
              <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
                Usa tu huella, Face ID o Windows Hello. La firma queda registrada con tu dispositivo
                y fecha, cumpliendo con la Ley 27269.
              </p>
            </div>
          </div>

          <label className="mb-2 flex cursor-pointer items-start gap-2 rounded-xl border border-[color:var(--border-default)] bg-white p-3">
            <input
              type="checkbox"
              checked={confirmedRead}
              onChange={(e) => setConfirmedRead(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            <span className="text-[12px] leading-relaxed text-[color:var(--text-primary)]">
              He leído el contenido completo del contrato y acepto sus términos y condiciones.
            </span>
          </label>

          {/* Disclaimer legal prominente sobre nivel de firma — Ley 27269 */}
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] leading-relaxed text-amber-900">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            <strong>Sobre la validez de tu firma:</strong> Tu firma biométrica es una <em>firma
            electrónica fuerte</em> según la Ley N° 27269 — válida entre tú y tu empleador y
            reconocida ante la TFL de SUNAFIL. <strong>No equivale</strong> a la firma digital
            certificada RENIEC con Time Stamping, que se exige para algunos trámites ante entidades
            públicas. Al firmar, confirmas que el dispositivo es tuyo y que autorizas el uso de
            tus datos biométricos para verificar tu identidad.
          </div>

          <button
            onClick={() => setModalOpen(true)}
            disabled={!confirmedRead}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(4,120,87,0.3)] transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <Fingerprint className="h-5 w-5" />
            {biometricAvailable === false ? 'Aceptar contrato' : 'Firmar con huella'}
          </button>

          {biometricAvailable === false ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-800">
              <AlertTriangle className="h-3 w-3" />
              Tu dispositivo no tiene huella o Face ID — se firmará como firma electrónica simple.
            </p>
          ) : null}
        </section>
      ) : (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-[0_4px_14px_rgba(4,120,87,0.3)]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className="text-lg text-emerald-900"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
              >
                Contrato firmado
              </h3>
              <p className="mt-0.5 text-xs text-emerald-800">
                {contract.signedAt ? `Firmado el ${formatDate(contract.signedAt)}` : null}
                {contract.signature?.level === 'BIOMETRIC'
                  ? ' con firma biométrica fuerte.'
                  : contract.signature?.level === 'SIMPLE'
                    ? ' con firma electrónica simple.'
                    : ''}
              </p>
              {contract.signature?.userAgent ? (
                <p className="mt-1 break-all text-[10px] text-emerald-700/80">
                  Desde: {shortenUserAgent(contract.signature.userAgent)}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      )}

      {/* Legal footer */}
      <footer
        className="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4 text-[11px] leading-relaxed text-[color:var(--text-secondary)]"
      >
        <div className="mb-1 flex items-center gap-2 font-semibold text-[color:var(--text-primary)]">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Sobre la validez legal
        </div>
        <p>
          La firma biométrica en Comply360 es una <strong>firma electrónica fuerte</strong> según la
          Ley 27269. El sensor de tu dispositivo (Touch ID, Face ID, huella Android, Windows Hello)
          valida localmente tu identidad; nosotros registramos solo la prueba criptográfica junto a
          la fecha, IP y user-agent. Tu huella nunca sale del dispositivo. Para trámites ante
          entidades públicas que exijan firma digital RENIEC, consultá con tu abogado.
        </p>
      </footer>

      {/* Ceremony modal */}
      {modalOpen ? (
        <CeremonyModal
          contractTitle={contract.title}
          step={signingStep}
          error={signError}
          biometricAvailable={biometricAvailable !== false}
          onStart={handleSign}
          onClose={() => {
            setModalOpen(false)
            setSigningStep('idle')
            setSignError(null)
          }}
        />
      ) : null}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Ceremony modal
// ═══════════════════════════════════════════════════════════════════════════

function CeremonyModal({
  contractTitle,
  step,
  error,
  biometricAvailable,
  onStart,
  onClose,
}: {
  contractTitle: string
  step: SigningStep
  error: string | null
  biometricAvailable: boolean
  onStart: () => void
  onClose: () => void
}) {
  const allowClose = step !== 'ceremony' && step !== 'submitting'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm motion-fade-in"
      onClick={allowClose ? onClose : undefined}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl motion-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {allowClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-full p-2 text-[color:var(--text-tertiary)] hover:bg-[color:var(--neutral-100)] hover:text-[color:var(--text-primary)]"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <div className="px-6 py-6">
          {step === 'idle' || step === 'reading' ? (
            <>
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-[0_8px_24px_rgba(4,120,87,0.3)]"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}
              >
                <Fingerprint className="h-8 w-8" />
              </div>
              <h3
                className="text-center text-xl text-[color:var(--text-primary)]"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
              >
                {biometricAvailable ? 'Firmar con huella' : 'Confirmar firma'}
              </h3>
              <p className="mt-2 text-center text-xs text-[color:var(--text-secondary)]">
                Estás a punto de firmar: <strong>{contractTitle}</strong>
              </p>
              <p className="mt-3 text-center text-[11px] text-[color:var(--text-tertiary)]">
                {biometricAvailable
                  ? 'Al continuar, tu dispositivo te pedirá tu huella o Face ID. La firma queda registrada con tu identidad y fecha.'
                  : 'No detectamos biométrica en tu dispositivo. La firma se registrará como firma electrónica simple.'}
              </p>
              <button
                type="button"
                onClick={onStart}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(4,120,87,0.3)] hover:bg-emerald-700 active:scale-[0.98]"
              >
                <Fingerprint className="h-5 w-5" />
                Iniciar firma
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
              >
                Cancelar
              </button>
            </>
          ) : null}

          {step === 'ceremony' ? (
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-20 w-20 animate-pulse items-center justify-center rounded-3xl text-white shadow-[0_8px_32px_rgba(4,120,87,0.4)]"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}
              >
                <Fingerprint className="h-10 w-10" />
              </div>
              <h3
                className="text-xl text-[color:var(--text-primary)]"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
              >
                Acercá tu huella
              </h3>
              <p className="mt-2 text-xs text-[color:var(--text-secondary)]">
                Tu dispositivo está pidiendo la verificación biométrica.
              </p>
            </div>
          ) : null}

          {step === 'submitting' ? (
            <div className="text-center py-4">
              <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-[color:var(--text-primary)]">
                Registrando firma…
              </p>
            </div>
          ) : null}

          {step === 'success' ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-[0_8px_24px_rgba(4,120,87,0.3)]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3
                className="text-xl text-emerald-900"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
              >
                ¡Contrato firmado!
              </h3>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-800">
                <Sparkles className="h-3.5 w-3.5" /> Preparando tus próximos pasos
              </p>
            </div>
          ) : null}

          {step === 'error' ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3
                className="text-xl text-[color:var(--text-primary)]"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
              >
                Algo falló
              </h3>
              <p className="mt-2 text-xs text-[color:var(--text-secondary)]">
                {error ?? 'No pudimos completar la firma.'}
              </p>
              <button
                type="button"
                onClick={onStart}
                className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
              >
                Cancelar
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function StatusChip({
  children,
  variant,
}: {
  children: React.ReactNode
  variant: 'success' | 'warning' | 'info'
}) {
  const palette = {
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    warning: 'bg-amber-100 text-amber-900 ring-amber-300',
    info: 'bg-blue-50 text-blue-800 ring-blue-200',
  }[variant]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${palette}`}
    >
      {children}
    </span>
  )
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="mt-0.5 text-[color:var(--text-tertiary)]">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[color:var(--text-tertiary)]">{label}: </span>
        <span className="font-medium text-[color:var(--text-primary)]">{value}</span>
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
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function shortenUserAgent(ua: string): string {
  const m =
    /(iPhone|iPad|Android|Macintosh|Windows NT [\d.]+)/.exec(ua)?.[1] ??
    /Chrome|Safari|Firefox|Edge/.exec(ua)?.[0] ??
    'Dispositivo'
  return m
}
