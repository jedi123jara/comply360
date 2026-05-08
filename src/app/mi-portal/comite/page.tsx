'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Vote,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Fingerprint,
  Shield,
  ArrowLeft,
  Clock,
} from 'lucide-react'
import {
  tryBiometricCeremony,
  tryStrongBiometricCeremony,
  hasBiometricHardware,
} from '@/lib/webauthn'

/**
 * /mi-portal/comite — Votación electrónica del Comité SST con WebAuthn.
 *
 * Cumple R.M. 245-2021-TR (elección de representantes de los trabajadores
 * al Comité SST). Cada voto requiere ceremonia biométrica WebAuthn con
 * userVerification: 'required' — el dispositivo del trabajador valida su
 * huella/Face ID localmente, y solo recibimos la prueba criptográfica.
 *
 * Audit trail completo: hashFirma + credentialId + IP + userAgent + timestamp.
 */

interface Candidato {
  workerId: string
  nombre: string
  origen: 'REPRESENTANTE_EMPLEADOR' | 'REPRESENTANTE_TRABAJADORES'
}

interface EleccionActiva {
  comiteId: string
  fechaInicio: string
  fechaCierre: string
  cuposEmpleador: number
  cuposTrabajadores: number
  candidatos: Candidato[]
  yaVote: boolean
}

type VoteState = 'idle' | 'asking-challenge' | 'biometric' | 'submitting' | 'success' | 'error'

export default function ComitePortalPage() {
  const [elecciones, setElecciones] = useState<EleccionActiva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/mi-portal/comite/elecciones-activas', {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('No se pudieron cargar las elecciones')
        const json = await res.json()
        if (!cancelled) setElecciones(json.elecciones ?? [])
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error desconocido')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <Link
        href="/mi-portal"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a mi portal
      </Link>

      <header>
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-700 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Comité SST
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Elecciones del Comité SST
        </h1>
        <p className="text-sm text-slate-600">
          Tu voto define a quién represente a los trabajadores ante la empresa en seguridad y salud.
          Tu huella firma el voto — nadie puede votar por ti.
        </p>
      </header>

      {error && (
        <div className="rounded-xl bg-red-50 ring-1 ring-red-200 p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {elecciones.length === 0 && !error && (
        <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-8 text-center">
          <Vote className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 text-sm">
            No hay elecciones activas en este momento.
          </p>
        </div>
      )}

      {elecciones.map((e) => (
        <EleccionCard key={e.comiteId} eleccion={e} />
      ))}
    </div>
  )
}

function EleccionCard({ eleccion }: { eleccion: EleccionActiva }) {
  const [state, setState] = useState<VoteState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const fechaCierreLabel = new Date(eleccion.fechaCierre).toLocaleString('es-PE', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  async function castVote(candidatoWorkerId: string) {
    setSelected(candidatoWorkerId)
    setErrorMsg(null)

    if (!hasBiometricHardware()) {
      setErrorMsg(
        'Tu dispositivo no tiene huella o Face ID disponible. Usa un celular o laptop con biometría para votar.',
      )
      setState('error')
      return
    }

    try {
      setState('asking-challenge')
      // FIX #4.J — strong ceremony (server challenge + verify) preferida.
      // Fallback al legacy si el user no tiene credential todavía.
      const strong = await tryStrongBiometricCeremony({
        action: 'vote_committee',
        entityId: eleccion.comiteId,
      })
      let ceremony: Awaited<ReturnType<typeof tryBiometricCeremony>>
      if (strong.verified) {
        ceremony = {
          verified: true,
          credentialId: strong.credentialId,
          challenge: strong.challenge,
          challengeToken: strong.challengeToken,
          userAgent: strong.userAgent,
        }
      } else if (strong.reason === 'user-cancelled' || strong.reason === 'timeout') {
        setState('idle')
        return
      } else {
        ceremony = await tryBiometricCeremony({
          action: 'vote_committee',
          entityId: eleccion.comiteId,
        })
      }

      if (!ceremony.verified) {
        if (ceremony.reason === 'user-cancelled') {
          setState('idle')
          return
        }
        setErrorMsg(
          ceremony.reason === 'no-platform-auth'
            ? 'Tu dispositivo no tiene huella o Face ID configurado.'
            : ceremony.reason === 'challenge-unavailable'
            ? 'No se pudo iniciar la firma. Reintenta en unos segundos.'
            : 'No se pudo validar tu huella. Reintenta o usa otro dispositivo.',
        )
        setState('error')
        return
      }

      if (!ceremony.challenge || !ceremony.challengeToken || !ceremony.credentialId) {
        setErrorMsg('La firma no devolvió la prueba criptográfica esperada.')
        setState('error')
        return
      }

      // 2) Enviar voto al servidor con la prueba WebAuthn
      setState('submitting')
      const res = await fetch(
        `/api/mi-portal/comite/${eleccion.comiteId}/votar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidatoWorkerId,
            webauthn: {
              token: ceremony.challengeToken,
              challenge: ceremony.challenge,
              credentialId: ceremony.credentialId,
            },
          }),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      setState('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido')
      setState('error')
    }
  }

  if (eleccion.yaVote || state === 'success') {
    return (
      <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-emerald-900 mb-1">
          {state === 'success' ? '¡Voto registrado!' : 'Ya votaste en esta elección'}
        </h3>
        <p className="text-sm text-emerald-800">
          Tu voto fue firmado biométricamente y registrado con un hash criptográfico único. Nadie más puede modificarlo.
        </p>
        <p className="text-xs text-emerald-700 mt-3">
          La votación cierra el {fechaCierreLabel}.
        </p>
      </div>
    )
  }

  const isSubmitting = state === 'asking-challenge' || state === 'biometric' || state === 'submitting'

  return (
    <div className="rounded-xl bg-white ring-1 ring-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Comité SST en elección</h3>
          <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Cierra el {fechaCierreLabel}
          </p>
        </div>
        <div className="text-xs text-slate-500 text-right shrink-0">
          {eleccion.cuposTrabajadores} cupos representantes trabajadores
        </div>
      </div>

      <p className="text-sm text-slate-700 mb-4">
        Elige <strong>1 representante</strong> de los trabajadores. Tu huella firmará el voto.
      </p>

      <div className="space-y-2">
        {eleccion.candidatos
          .filter((c) => c.origen === 'REPRESENTANTE_TRABAJADORES')
          .map((c) => {
            const isSelected = selected === c.workerId
            return (
              <button
                key={c.workerId}
                type="button"
                disabled={isSubmitting}
                onClick={() => castVote(c.workerId)}
                className={`w-full text-left rounded-lg ring-1 px-4 py-3 transition-all ${
                  isSelected && isSubmitting
                    ? 'bg-emerald-50 ring-emerald-400'
                    : 'bg-white ring-slate-200 hover:ring-emerald-300 hover:bg-emerald-50/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{c.nombre}</span>
                  {isSelected && isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  ) : (
                    <Fingerprint className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>
            )
          })}
      </div>

      {errorMsg && (
        <div className="mt-3 rounded-lg bg-red-50 ring-1 ring-red-200 p-3 text-xs text-red-800 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {errorMsg}
        </div>
      )}

      {state === 'biometric' && (
        <p className="mt-3 text-xs text-emerald-700 flex items-center gap-1">
          <Fingerprint className="w-3.5 h-3.5" />
          Acerca tu huella o mira la cámara para confirmar el voto...
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
        <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
        <span>
          Tu huella nunca sale de tu dispositivo. Solo guardamos la prueba criptográfica del voto. Validez legal según Ley 27269 (firmas y certificados digitales).
        </span>
      </div>
    </div>
  )
}
