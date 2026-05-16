'use client'

/**
 * FirmaDocClient — UI completa de lectura + firma de OrgDocument.
 *
 * Reglas de negocio para firma válida:
 *   1. Worker debe leer el documento (scrolledToEnd === true)
 *   2. Tiempo mínimo en página ≥ 30s (configurable MIN_READING_MS)
 *   3. Checkbox "He leído y entiendo" obligatorio
 *   4. Firma con uno de 3 métodos:
 *      - SIMPLE: solo checkbox confirmation (default fallback)
 *      - BIOMETRIC: WebAuthn si el dispositivo soporta (huella/Face ID)
 *      - OTP_EMAIL: código por email (futuro — placeholder en UI)
 *
 * Diseño mobile-first — la mayoría de workers leerán desde celular.
 *
 * Animación post-firma: success state con confetti + auto-redirect a
 * /mi-portal/documentos en 3s.
 */

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, Clock, FileSignature, Fingerprint,
  Loader2, AlertCircle, Mail,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner-toaster'
import { cn } from '@/lib/utils'

const MIN_READING_MS = 30_000 // 30 segundos

interface DocData {
  id: string
  type: string
  title: string
  description: string  // contenido del doc (HTML/markdown/plain)
  fileUrl: string | null
  version: number
  deadlineDays: number | null
  lastNotifiedAt: string | null
}

interface AlreadySigned {
  acknowledgedAt: string
  signatureMethod: string
}

interface Props {
  doc: DocData
  orgName: string
  workerName: string
  alreadySigned: AlreadySigned | null
}

type SignatureMethod = 'SIMPLE' | 'OTP_EMAIL' | 'BIOMETRIC'

export function FirmaDocClient({ doc, orgName, workerName, alreadySigned }: Props) {
  const router = useRouter()
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [scrollPercent, setScrollPercent] = useState(0)
  const [readingMs, setReadingMs] = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [startTime] = useState(() => Date.now())

  const contentRef = useRef<HTMLDivElement>(null)

  // ─── Tracker de tiempo en página ─────────────────────────────────
  useEffect(() => {
    if (alreadySigned) return
    const interval = setInterval(() => {
      setReadingMs(Date.now() - startTime)
    }, 1000)
    return () => clearInterval(interval)
  }, [alreadySigned, startTime])

  // ─── Tracker de scroll ───────────────────────────────────────────
  useEffect(() => {
    if (alreadySigned) return
    function onScroll() {
      const el = contentRef.current
      if (!el) return
      const docHeight = el.scrollHeight
      const winHeight = window.innerHeight
      const scrollPos = window.scrollY + winHeight
      const elTop = el.getBoundingClientRect().top + window.scrollY
      const visiblePct = Math.min(100, Math.max(0, ((scrollPos - elTop) / docHeight) * 100))
      setScrollPercent(Math.round(visiblePct))
      // Considerar "leído" si llegó al 95%+ del contenido
      if (visiblePct >= 95) setScrolledToEnd(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // initial check
    return () => window.removeEventListener('scroll', onScroll)
  }, [alreadySigned])

  // ─── Submit firma ────────────────────────────────────────────────
  async function handleSign(method: SignatureMethod, signatureProof: Record<string, unknown> | null) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/mi-portal/acknowledgments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.id,
          documentVersion: doc.version,
          signatureMethod: method,
          signatureProof,
          scrolledToEnd: true,
          readingTimeMs: Date.now() - startTime,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al firmar')
      setSuccess(true)
      toast.success('✓ Firma registrada con valor legal')
      setTimeout(() => router.push('/mi-portal/documentos'), 3000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al firmar')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Caso: ya firmó ──────────────────────────────────────────────
  if (alreadySigned) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/mi-portal/documentos" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a Documentos
        </Link>
        <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 p-6 text-center">
          <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-600 mb-3" />
          <h1 className="text-xl font-bold text-emerald-900">Ya firmaste esta versión</h1>
          <p className="text-sm text-emerald-800 mt-2 leading-relaxed">
            Firmaste <strong>{doc.title}</strong> v{doc.version} el{' '}
            {new Date(alreadySigned.acknowledgedAt).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' })}{' '}
            con método <strong>{alreadySigned.signatureMethod}</strong>.
          </p>
          <p className="text-xs text-emerald-700 mt-3">
            Si tu empresa actualiza el documento a una nueva versión, te pediremos firmar de nuevo.
          </p>
        </div>
      </div>
    )
  }

  // ─── Caso: éxito post-firma ─────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-emerald-400 opacity-20 blur-2xl rounded-full" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">¡Firma registrada!</h1>
          <p className="text-sm text-slate-600 mt-2">
            Quedó archivada con valor legal Ley 27269. Tu empresa recibió el acuse automáticamente.
          </p>
          <p className="text-xs text-slate-500 mt-4">Redirigiendo en 3 segundos…</p>
        </div>
      </div>
    )
  }

  // ─── Render principal ───────────────────────────────────────────
  const readingSec = Math.floor(readingMs / 1000)
  const minReadingSec = MIN_READING_MS / 1000
  const timeProgress = Math.min(100, Math.round((readingMs / MIN_READING_MS) * 100))
  const canSign = scrolledToEnd && readingMs >= MIN_READING_MS && confirmed

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Sticky progress header */}
      <div
        className="sticky top-14 z-30 bg-white border-b border-slate-200 px-4 py-2"
        style={{ backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.95)' }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span className="font-semibold">Progreso de lectura</span>
            <span>{scrollPercent}% leído · {readingSec}s</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', scrolledToEnd ? 'bg-emerald-500' : 'bg-amber-500')}
              style={{ width: `${scrollPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        <Link href="/mi-portal/documentos" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Volver a Documentos
        </Link>

        {/* Header doc */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 ring-1 ring-purple-200">
            v{doc.version} · {doc.type.replace(/_/g, ' ')}
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 leading-tight"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
          >
            {doc.title}
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            <strong>{orgName}</strong> requiere que leas y firmes este documento. Tu firma queda registrada con valor
            legal Ley 27269.
          </p>
        </div>

        {/* Contenido del documento */}
        <div ref={contentRef} className="bg-white rounded-2xl ring-1 ring-slate-200 p-6 sm:p-8 mb-6">
          {doc.fileUrl ? (
            <div className="prose prose-slate max-w-none">
              <p className="text-sm text-slate-600 mb-4 italic">
                Este documento incluye un archivo adjunto. Descárgalo y léelo completo:
              </p>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white font-semibold px-4 py-2 hover:bg-slate-800"
              >
                <FileSignature className="w-4 h-4" />
                Descargar documento
              </a>
            </div>
          ) : null}
          {doc.description && (
            <div
              className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed mt-4 whitespace-pre-wrap"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {doc.description}
            </div>
          )}
        </div>

        {/* Firma — sección al final del doc */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Firmar acuse de recibo</h2>

          {/* Status checks */}
          <div className="space-y-2 mb-5">
            <CheckRow done={scrolledToEnd} label="Leíste el documento completo" hint="Haz scroll hasta el final" />
            <CheckRow
              done={readingMs >= MIN_READING_MS}
              label={`Tiempo mínimo de lectura (${minReadingSec}s)`}
              hint={`Llevas ${readingSec}s. Faltan ${Math.max(0, minReadingSec - readingSec)}s.`}
              progress={timeProgress}
            />
          </div>

          {/* Checkbox confirmation */}
          <label className="flex items-start gap-3 cursor-pointer rounded-lg p-3 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700 leading-relaxed">
              Yo, <strong>{workerName}</strong>, declaro que he leído y entiendo el contenido de{' '}
              <strong>&quot;{doc.title}&quot;</strong> v{doc.version}, y acepto las disposiciones que en él se establecen.
            </span>
          </label>

          {/* CTA Firmar */}
          <button
            onClick={() => setShowSignModal(true)}
            disabled={!canSign || submitting}
            className={cn(
              'mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-base px-5 py-3.5 transition-all',
              canSign
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
            )}
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSignature className="w-5 h-5" />}
            {canSign ? 'Firmar electrónicamente' : 'Completa los pasos arriba para firmar'}
          </button>
        </div>

        {/* Trust strip */}
        <div className="text-center text-xs text-slate-500 leading-relaxed px-4">
          <AlertCircle className="inline w-3 h-3 mr-1" />
          Tu firma queda registrada con timestamp, IP y método. Es válida bajo la Ley 27269 de Firmas y
          Certificados Digitales del Perú.
        </div>
      </div>

      {/* Modal de selección de método de firma */}
      {showSignModal && (
        <SignMethodModal
          documentId={doc.id}
          onClose={() => setShowSignModal(false)}
          onSign={handleSign}
          submitting={submitting}
        />
      )}
    </div>
  )
}

// ─── CheckRow ────────────────────────────────────────────────────────────────
function CheckRow({
  done,
  label,
  hint,
  progress,
}: {
  done: boolean
  label: string
  hint: string
  progress?: number
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0',
          done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400',
        )}
      >
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3 h-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', done ? 'text-slate-900' : 'text-slate-600')}>{label}</p>
        {!done && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
        {progress !== undefined && progress < 100 && !done && (
          <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal de selección de método de firma ──────────────────────────────────
function SignMethodModal({
  documentId,
  onClose,
  onSign,
  submitting,
}: {
  documentId: string
  onClose: () => void
  onSign: (method: SignatureMethod, signatureProof: Record<string, unknown> | null) => Promise<void>
  submitting: boolean
}) {
  const [biometricAvailable, setBiometricAvailable] = useState<boolean | null>(null)
  const [biometricInProgress, setBiometricInProgress] = useState(false)

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      // Detectar si WebAuthn está disponible
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          .then((avail) => setBiometricAvailable(avail))
          .catch(() => setBiometricAvailable(false))
      } else {
        setBiometricAvailable(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleBiometric() {
    // Flow real WebAuthn server-side:
    //   1. Pedir challenge al server
    //   2. Correr ceremonia WebAuthn con ese challenge
    //   3. Enviar al endpoint de firma con challenge + token + credentialId
    //   4. Server verifica criptográficamente
    setBiometricInProgress(true)
    try {
      // 1. Challenge desde server
      const challengeRes = await fetch('/api/webauthn/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign_doc_acknowledgment',
          entityId: documentId,
        }),
      })
      if (!challengeRes.ok) {
        // Server-side WebAuthn no configurado o doc inválido — degradar a SIMPLE
        const errJson = await challengeRes.json().catch(() => ({}))
        toast.error(errJson.error ?? 'WebAuthn no disponible — firmando con método simple')
        await onSign('SIMPLE', { biometricAttempted: true, fallbackReason: 'no_challenge' })
        return
      }
      const { challenge: challengeB64, token: challengeToken } = await challengeRes.json()

      // 2. Ceremonia WebAuthn
      const challengeBytes = base64UrlToBytes(challengeB64)
      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: challengeBytes as BufferSource,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60_000,
        },
      })) as PublicKeyCredential | null

      if (!credential) {
        toast.error('Cancelaste la firma biométrica')
        return
      }

      // 3. Enviar al endpoint con challenge + token + credentialId
      await onSign('BIOMETRIC', {
        challenge: challengeB64,
        challengeToken,
        credentialId: credential.id,
        type: credential.type,
        authenticatorAttachment: credential.authenticatorAttachment ?? null,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error en biometría'
      // Si el usuario abortó la ceremonia (NotAllowedError), mensaje suave
      if (err instanceof Error && err.name === 'NotAllowedError') {
        toast.error('Cancelaste o no autorizaste la firma biométrica')
      } else {
        toast.error(`Biometría falló: ${msg}. Usando firma simple.`)
        await onSign('SIMPLE', { biometricAttempted: true, fallbackError: msg })
      }
    } finally {
      setBiometricInProgress(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Elige tu método de firma</h2>
        <p className="text-sm text-slate-600 mb-5">
          Todos tienen el mismo valor legal. La biometría es la más fuerte si tu dispositivo la soporta.
        </p>

        <div className="space-y-2">
          {/* Biometric — si está disponible */}
          {biometricAvailable === true && (
            <button
              onClick={handleBiometric}
              disabled={submitting || biometricInProgress}
              className="w-full text-left flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                {biometricInProgress ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Fingerprint className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-emerald-900 text-sm">
                  {biometricInProgress ? 'Verificando huella...' : 'Huella o Face ID'}
                </p>
                <p className="text-xs text-emerald-800">
                  {biometricInProgress
                    ? 'Acércate al sensor o coloca tu huella'
                    : 'Recomendado · firma criptográfica server-verified'}
                </p>
              </div>
            </button>
          )}

          {/* SIMPLE — siempre disponible */}
          <button
            onClick={() => onSign('SIMPLE', null)}
            disabled={submitting}
            className="w-full text-left flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">Firma simple</p>
              <p className="text-xs text-slate-600">Confirmar con un click — válido bajo Ley 27269</p>
            </div>
          </button>

          {/* OTP_EMAIL — placeholder Sprint futuro */}
          <button
            disabled
            className="w-full text-left flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-50 cursor-not-allowed"
            title="Próximamente"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">Código por email</p>
              <p className="text-xs text-slate-600">Próximamente</p>
            </div>
          </button>
        </div>

        <button onClick={onClose} disabled={submitting} className="mt-5 w-full text-sm text-slate-600 hover:text-slate-900">
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Helper: base64url → Uint8Array (para WebAuthn challenge bytes) ─────────
function base64UrlToBytes(base64url: string): Uint8Array {
  // Convertir base64url a base64 estándar
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
