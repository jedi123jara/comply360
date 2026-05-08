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
  TrendingUp,
  TrendingDown,
  Fingerprint,
  ShieldCheck,
  X,
  Eye,
} from 'lucide-react'
import { tryBiometricCeremony as runCeremony, tryStrongBiometricCeremony, hasBiometricHardware } from '@/lib/webauthn'

/**
 * /mi-portal/boletas/[id] — Detalle de boleta + firma biométrica (Sprint 1 Fase 1).
 *
 * Flujo de firma "Nivel 1" (electrónica simple con ceremony biométrica):
 *  1. Usuario tap "Firmar con huella"
 *  2. Modal de ceremony aparece con resumen de la boleta
 *  3. Sistema invoca `navigator.credentials.get()` (WebAuthn) para que el OS
 *     pida biométrico (Face ID / Touch ID / Android Biometric)
 *  4. Si el usuario confirma → POST /api/mi-portal/boletas/[id]/aceptar
 *  5. Backend registra AuditLog con timestamp + biometricType + hash doc
 *
 * Fallback graceful: si WebAuthn no está disponible (browser viejo o sin
 * credential enrollado), se acepta como firma electrónica simple (checkbox
 * explícito de consentimiento).
 */

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(v: string | null | undefined): string {
  if (!v) return '0.00'
  return Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPeriodo(periodo: string): string {
  const [year, month] = periodo.split('-')
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return `${months[parseInt(month, 10) - 1] ?? month} ${year}`
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function BoletaDetailPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const [boleta, setBoleta] = useState<PayslipDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingState, setSigningState] = useState<'idle' | 'ceremony' | 'biometric' | 'submitting' | 'success' | 'error'>('idle')
  const [signError, setSignError] = useState<string | null>(null)
  const [showCeremony, setShowCeremony] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [hasBiometric, setHasBiometric] = useState<boolean | null>(null)

  useEffect(() => {
    hasBiometricHardware().then(setHasBiometric)
  }, [])

  useEffect(() => {
    if (!id) return
    let mounted = true
    fetch(`/api/mi-portal/boletas/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return
        setBoleta(d.error ? null : d)
      })
      .catch(() => {
        if (!mounted) return
        setBoleta(null)
      })
      .finally(() => {
         
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [id])

  async function handleSign() {
    if (!boleta) return
    setSignError(null)
    setSigningState('biometric')
    try {
      let signatureLevel = 'SIMPLE'
      let ceremonyPayload: any = {}

      if (hasBiometric) {
        // FIX #4.J — preferimos strong ceremony con server challenge + verify.
        // Fallback al legacy `runCeremony` si el user no tiene credential
        // registrado todavía (no-credentials) o la plataforma rechaza WebAuthn
        // strong.
        const strong = await tryStrongBiometricCeremony({
          action: 'sign_payslip',
          entityId: id,
        })

        let ceremony: Awaited<ReturnType<typeof runCeremony>>
        if (strong.verified) {
          ceremony = {
            verified: true,
            credentialId: strong.credentialId,
            challenge: strong.challenge,
            challengeToken: strong.challengeToken,
            userAgent: strong.userAgent,
          }
        } else if (strong.reason === 'user-cancelled' || strong.reason === 'timeout') {
          setSigningState('idle')
          return
        } else {
          ceremony = await runCeremony({
            action: 'sign_payslip',
            entityId: id,
          })
        }

        if (!ceremony.verified) {
          if (ceremony.reason === 'user-cancelled') {
            setSigningState('idle')
            return
          }
          setSignError('No pudimos validar tu huella/biometría. Intenta nuevamente o usa otro dispositivo.')
          setSigningState('error')
          return
        }

        signatureLevel = 'BIOMETRIC'
        ceremonyPayload = {
          userAgent: ceremony.userAgent ?? navigator.userAgent,
          credentialId: ceremony.credentialId ?? null,
          challengeToken: ceremony.challengeToken,
          challenge: ceremony.challenge,
        }
      }

      // Step 2: POST al backend con el resultado
      setSigningState('submitting')
      const res = await fetch(`/api/mi-portal/boletas/${id}/aceptar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureLevel,
          ...ceremonyPayload
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const updated = await res.json()
      setBoleta({ ...boleta, status: updated.status, acceptedAt: updated.acceptedAt })
      setSigningState('success')
      // Auto-close del modal después de 1.5s
      setTimeout(() => {
        setShowCeremony(false)
        setSigningState('idle')
      }, 1500)
    } catch (err) {
      setSignError(err instanceof Error ? err.message : 'Error desconocido')
      setSigningState('error')
    }
  }

  if (loading) return <LoadingState />

  if (!boleta) {
    return (
      <div className="text-center py-16">
        <Receipt className="h-12 w-12 text-[color:var(--text-tertiary)] mx-auto mb-3 opacity-50" />
        <p className="text-[color:var(--text-secondary)] font-semibold">Boleta no encontrada</p>
        <Link
          href="/mi-portal/boletas"
          className="text-emerald-700 text-sm font-semibold hover:underline mt-2 inline-block"
        >
          ← Volver a mis boletas
        </Link>
      </div>
    )
  }

  const periodoLabel = formatPeriodo(boleta.periodo)
  const canSign = !boleta.acceptedAt && boleta.status !== 'ANULADA'

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Back */}
      <Link
        href="/mi-portal/boletas"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a mis boletas
      </Link>

      {/* ─── Header con acción principal ──────────────────────────── */}
      <header>
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-700 mb-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' }}
          />
          <span>Boleta de pago</span>
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
        >
          {periodoLabel}
        </h1>
        <p className="text-sm text-[color:var(--text-tertiary)]">
          Emitida el{' '}
          {new Date(boleta.fechaEmision).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </header>

      {/* ─── NETO A PAGAR (hero) ──────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 45%, #10b981 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            top: '-40%',
            right: '-10%',
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)',
          }}
        />
        <div className="relative">
          <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">
            Neto a pagar
          </p>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
              fontWeight: 400,
              letterSpacing: '-0.025em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            S/ {fmt(boleta.netoPagar)}
          </p>
          {boleta.essalud && Number(boleta.essalud) > 0 ? (
            <p className="text-emerald-100 text-xs mt-3">
              <b className="text-white">+ S/ {fmt(boleta.essalud)}</b> EsSalud (aporte del empleador)
            </p>
          ) : null}
        </div>
      </section>

      {/* ─── INGRESOS ─────────────────────────────────────────────── */}
      <section
        className="rounded-2xl p-5"
        style={{ background: 'white', border: '0.5px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 28, height: 28, background: 'rgba(16,185,129,0.12)', color: 'var(--emerald-700)' }}
          >
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <h2 className="font-bold text-[color:var(--text-primary)] text-sm">Ingresos</h2>
        </div>
        <div className="space-y-2">
          <Row label="Sueldo básico" value={fmt(boleta.sueldoBruto)} />
          {boleta.asignacionFamiliar && Number(boleta.asignacionFamiliar) > 0 ? (
            <Row label="Asignación familiar" value={fmt(boleta.asignacionFamiliar)} />
          ) : null}
          {boleta.horasExtras && Number(boleta.horasExtras) > 0 ? (
            <Row label="Horas extras" value={fmt(boleta.horasExtras)} />
          ) : null}
          {boleta.bonificaciones && Number(boleta.bonificaciones) > 0 ? (
            <Row label="Bonificaciones" value={fmt(boleta.bonificaciones)} />
          ) : null}
        </div>
        <div
          className="mt-3 pt-3 flex justify-between items-baseline"
          style={{ borderTop: '0.5px solid var(--border-subtle)' }}
        >
          <span className="text-sm font-bold text-[color:var(--text-primary)]">Total ingresos</span>
          <span
            className="font-mono tabular-nums"
            style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--emerald-700)' }}
          >
            S/ {fmt(boleta.totalIngresos)}
          </span>
        </div>
      </section>

      {/* ─── DESCUENTOS ──────────────────────────────────────────── */}
      <section
        className="rounded-2xl p-5"
        style={{ background: 'white', border: '0.5px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 28, height: 28, background: 'rgba(239,68,68,0.1)', color: 'var(--crimson-600, #dc2626)' }}
          >
            <TrendingDown className="h-3.5 w-3.5" />
          </div>
          <h2 className="font-bold text-[color:var(--text-primary)] text-sm">Descuentos</h2>
        </div>
        <div className="space-y-2">
          {boleta.aporteAfpOnp && Number(boleta.aporteAfpOnp) > 0 ? (
            <Row label="AFP / ONP" value={fmt(boleta.aporteAfpOnp)} negative />
          ) : null}
          {boleta.rentaQuintaCat && Number(boleta.rentaQuintaCat) > 0 ? (
            <Row label="Renta 5ta categoría" value={fmt(boleta.rentaQuintaCat)} negative />
          ) : null}
          {boleta.otrosDescuentos && Number(boleta.otrosDescuentos) > 0 ? (
            <Row label="Otros descuentos" value={fmt(boleta.otrosDescuentos)} negative />
          ) : null}
        </div>
        <div
          className="mt-3 pt-3 flex justify-between items-baseline"
          style={{ borderTop: '0.5px solid var(--border-subtle)' }}
        >
          <span className="text-sm font-bold text-[color:var(--text-primary)]">Total descuentos</span>
          <span
            className="font-mono tabular-nums"
            style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--crimson-700, #b91c1c)' }}
          >
            - S/ {fmt(boleta.totalDescuentos)}
          </span>
        </div>
      </section>

      {/* ─── ACCIONES ────────────────────────────────────────────── */}
      <section className="flex flex-wrap gap-2.5">
        {boleta.pdfUrl ? (
          <>
            <button
              type="button"
              onClick={() => setShowPdfPreview(p => !p)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors"
              style={{
                background: showPdfPreview ? 'var(--emerald-50)' : 'white',
                border: showPdfPreview
                  ? '0.5px solid var(--border-emerald)'
                  : '0.5px solid var(--border-default)',
                color: showPdfPreview
                  ? 'var(--emerald-700)'
                  : 'var(--text-primary)',
              }}
              title="Revisa el PDF antes de firmar"
            >
              <Eye className="h-4 w-4" />
              {showPdfPreview ? 'Ocultar PDF' : 'Ver PDF antes de firmar'}
            </button>
            <a
              href={boleta.pdfUrl}
              download
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors"
              style={{
                background: 'white',
                border: '0.5px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </a>
          </>
        ) : null}

        {canSign ? (
          <button
            type="button"
            onClick={() => setShowCeremony(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 text-sm font-bold transition-colors"
            style={{
              boxShadow:
                '0 10px 24px -6px rgba(4,120,87,0.45), inset 0 1px 0 rgba(255,255,255,0.14)',
            }}
          >
            <Fingerprint className="h-4 w-4" />
            {hasBiometric === false ? 'Firmar Electrónicamente' : 'Firmar con huella'}
          </button>
        ) : null}

        {boleta.acceptedAt ? (
          <div
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{
              background: 'rgba(16,185,129,0.1)',
              color: 'var(--emerald-700)',
              border: '0.5px solid rgba(16,185,129,0.3)',
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            Firmada el{' '}
            {new Date(boleta.acceptedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        ) : null}
      </section>

      {/* ─── Preview inline del PDF (toggle) ──────────────────────── */}
      {showPdfPreview && boleta.pdfUrl ? (
        <section
          className="rounded-2xl overflow-hidden border bg-white shadow-sm"
          style={{ border: '0.5px solid var(--border-default)' }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-[color:var(--neutral-50)]">
            <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">
              Vista previa de la boleta
            </span>
            <button
              type="button"
              onClick={() => setShowPdfPreview(false)}
              className="p-1 rounded text-[color:var(--text-tertiary)] hover:bg-white"
              aria-label="Cerrar preview"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <iframe
            src={boleta.pdfUrl}
            title="Boleta PDF"
            className="w-full"
            style={{ height: '70vh', minHeight: 480, border: 0 }}
          />
        </section>
      ) : null}

      {/* ─── Legal notice ────────────────────────────────────────── */}
      <div
        className="flex items-start gap-2.5 rounded-xl p-4"
        style={{
          background: 'rgba(16,185,129,0.05)',
          border: '0.5px solid rgba(16,185,129,0.2)',
        }}
      >
        <ShieldCheck className="h-4 w-4 text-emerald-700 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">
          <b className="text-[color:var(--text-primary)]">D.S. 001-98-TR · Ley 27269</b> — El empleador
          está obligado a entregar la boleta dentro de 48 horas del pago. La firma biométrica con
          audit log tiene el mismo valor legal que la firma manuscrita.
        </p>
      </div>

      {/* ─── Ceremony modal (firma biométrica) ───────────────────── */}
      {showCeremony ? (
        <BiometricCeremonyModal
          amount={boleta.netoPagar}
          periodo={periodoLabel}
          state={signingState}
          error={signError}
          hasBiometric={hasBiometric}
          onSign={handleSign}
          onClose={() => {
            if (signingState !== 'submitting') {
              setShowCeremony(false)
              setSigningState('idle')
              setSignError(null)
            }
          }}
        />
      ) : null}
    </div>
  )
}

// ─── BiometricCeremonyModal ─────────────────────────────────────────────────

function BiometricCeremonyModal({
  amount,
  periodo,
  state,
  error,
  hasBiometric,
  onSign,
  onClose,
}: {
  amount: string
  periodo: string
  state: 'idle' | 'ceremony' | 'biometric' | 'submitting' | 'success' | 'error'
  error: string | null
  hasBiometric: boolean | null
  onSign: () => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }}
      />

      <div
        className="relative w-full max-w-sm motion-fade-in-up"
        style={{
          background: 'white',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow:
            '0 30px 60px -12px rgba(4, 120, 87, 0.45), 0 0 0 1px rgba(15, 23, 42, 0.06)',
        }}
      >
        {state !== 'submitting' ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[color:var(--neutral-50)] z-10"
          >
            <X className="h-4 w-4 text-[color:var(--text-tertiary)]" />
          </button>
        ) : null}

        {/* Hero con huella */}
        <div className="text-center px-6 pt-10 pb-6">
          <div
            className="inline-flex items-center justify-center rounded-full mb-4"
            style={{
              width: 72,
              height: 72,
              background:
                state === 'success'
                  ? 'linear-gradient(165deg, #10b981 0%, #047857 100%)'
                  : state === 'error'
                    ? 'linear-gradient(165deg, #ef4444 0%, #dc2626 100%)'
                    : 'linear-gradient(165deg, #10b981 0%, #047857 100%)',
              boxShadow: '0 14px 32px -8px rgba(4,120,87,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            {state === 'success' ? (
              <CheckCircle2 className="h-8 w-8 text-white" />
            ) : state === 'error' ? (
              <AlertCircle className="h-8 w-8 text-white" />
            ) : state === 'biometric' || state === 'submitting' ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : (
              <Fingerprint className="h-8 w-8 text-white" />
            )}
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: '-0.015em',
              color: 'var(--text-primary)',
              lineHeight: 1.15,
              marginBottom: 8,
            }}
          >
            {state === 'success' ? (
              <>
                ¡Boleta <em style={{ color: 'var(--emerald-700)', fontStyle: 'italic' }}>firmada</em>!
              </>
            ) : state === 'error' ? (
              'No se pudo firmar'
            ) : state === 'biometric' ? (
              hasBiometric === false ? 'Procesando firma' : 'Confirmá tu identidad'
            ) : state === 'submitting' ? (
              'Registrando firma...'
            ) : (
              <>
                Firmar boleta de <em style={{ color: 'var(--emerald-700)', fontStyle: 'italic' }}>{periodo}</em>
              </>
            )}
          </h2>
          <p className="text-sm text-[color:var(--text-secondary)]">
            {state === 'success'
              ? (hasBiometric === false ? 'La boleta quedó registrada en tu legajo digital de forma electrónica.' : 'La boleta quedó registrada en tu legajo digital con huella y timestamp auditable.')
              : state === 'error'
                ? error || 'Intentá nuevamente en unos segundos.'
                : state === 'biometric'
                  ? (hasBiometric === false ? 'Aplicando firma electrónica...' : 'Sigue las instrucciones de tu dispositivo para confirmar con huella, rostro o PIN.')
                  : state === 'submitting'
                    ? 'Firmando en el sistema...'
                    : (hasBiometric === false ? 'Confirmá la recepción de tu boleta. La firma queda auditada legalmente (D.S. 001-98-TR).' : 'Confirmá la recepción de tu boleta con tu huella. La firma queda auditada legalmente (D.S. 001-98-TR).')}
          </p>
        </div>

        {/* Amount summary (solo en idle) */}
        {state === 'idle' ? (
          <div
            className="mx-6 mb-6 rounded-xl p-4"
            style={{ background: 'var(--neutral-50)', border: '0.5px solid var(--border-default)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)] mb-1">
              Neto a recibir
            </p>
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 28,
                fontWeight: 400,
                color: 'var(--emerald-700)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              S/ {fmt(amount)}
            </p>
          </div>
        ) : null}

        {/* Actions */}
        {state === 'idle' ? (
          <div className="px-6 pb-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onSign}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 text-sm font-bold transition-colors"
              style={{
                boxShadow:
                  '0 10px 24px -6px rgba(4,120,87,0.5), inset 0 1px 0 rgba(255,255,255,0.14)',
              }}
            >
              <Fingerprint className="h-4 w-4" />
              {hasBiometric === false ? 'Confirmar Firma Electrónica' : 'Firmar con mi huella'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full text-xs font-semibold text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] py-2"
            >
              Cancelar
            </button>
          </div>
        ) : state === 'error' ? (
          <div className="px-6 pb-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onSign}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 text-sm font-bold transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Row ────────────────────────────────────────────────────────────────────

function Row({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-[color:var(--text-secondary)]">{label}</span>
      <span
        className="font-mono tabular-nums font-medium"
        style={{ color: negative ? 'var(--crimson-700, #b91c1c)' : 'var(--text-primary)' }}
      >
        {negative ? '- ' : ''}S/ {value}
      </span>
    </div>
  )
}

// ─── Loading ───────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
    </div>
  )
}
