'use client'

import { useState, useEffect, use } from 'react'
import { CheckCircle2, AlertTriangle, Loader2, FileText, Shield, Clock } from 'lucide-react'
import SignaturePad from '@/components/dashboard/signature-pad'

// =============================================
// TYPES
// =============================================

interface SigningData {
  contractId: string
  signerName: string
  signerEmail: string
  signerRole: string
  status: string
  expiresAt: string
  totalSigners: number
  signedCount: number
}

interface SignResult {
  status: string
  signedAt: string
  signatureHash: string
  requestStatus: string
  totalSigners: number
  signedCount: number
}

type PageState = 'loading' | 'ready' | 'signing' | 'success' | 'error' | 'already_signed'

// =============================================
// SIGNING PAGE (PUBLIC - NO AUTH)
// =============================================

export default function FirmarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [state, setState] = useState<PageState>('loading')
  const [data, setData] = useState<SigningData | null>(null)
  const [result, setResult] = useState<SignResult | null>(null)
  const [error, setError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token || token.trim().length === 0) {
        setError('Enlace de firma inválido o expirado')
        setState('error')
        return
      }

      try {
        const res = await fetch(`/api/signatures/sign?token=${encodeURIComponent(token)}`)
        const json = await res.json()

        if (!res.ok) {
          setError(json.error || 'Enlace de firma inválido o expirado')
          setState('error')
          return
        }

        if (json.data.status === 'SIGNED') {
          setState('already_signed')
          return
        }

        setData(json.data)
        setState('ready')
      } catch {
        setError('Error al verificar el enlace de firma')
        setState('error')
      }
    }

    validateToken()
  }, [token])

  // Handle signature submission
  async function handleSign(signatureDataUrl: string) {
    if (!signatureDataUrl || signatureDataUrl.trim().length === 0) {
      setError('Por favor dibuje su firma antes de continuar')
      return
    }

    if (!acceptedTerms) {
      setError('Debe aceptar los términos legales para firmar')
      return
    }

    setState('signing')
    setError('')

    try {
      const res = await fetch('/api/signatures/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signatureData: signatureDataUrl,
          acceptedTerms,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Error al registrar la firma. Intente nuevamente.')
        setState('ready')
        return
      }

      setResult(json.data)
      setState('success')
    } catch {
      setError('Error de conexion. Intente nuevamente.')
      setState('ready')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
            <Shield className="h-4 w-4" />
            Firma Electronica Segura
          </div>
          <h1 className="text-2xl font-bold text-white">
            COMPLY 360
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Plataforma de firma electronica
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#141824] bg-[#141824] rounded-2xl shadow-xl border border-white/[0.08] border-white/[0.08] overflow-hidden">
          {/* Loading */}
          {state === 'loading' && (
            <div className="p-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">
                Verificando enlace de firma...
              </p>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Enlace inválido o expirado
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                {error}
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Solicite un nuevo enlace de firma al remitente del documento.
              </p>
            </div>
          )}

          {/* Already signed */}
          {state === 'already_signed' && (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <CheckCircle2 className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Documento ya firmado
              </h2>
              <p className="text-gray-600">
                Este documento ya fue firmado con este enlace.
              </p>
            </div>
          )}

          {/* Ready to sign */}
          {(state === 'ready' || state === 'signing') && data && (
            <div className="p-6 md:p-8 space-y-6">
              {/* Document info */}
              <div className="bg-gray-50/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-medium">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Informacion del documento
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Firmante:</span>
                    <p className="font-medium text-white">{data.signerName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Rol:</span>
                    <p className="font-medium text-white">{data.signerRole}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Contrato:</span>
                    <p className="font-medium text-white">{data.contractId}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-gray-500">Expira:</span>
                    <span className="font-medium text-white">
                      {new Date(data.expiresAt).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Firmas completadas: {data.signedCount} de {data.totalSigners}
                </div>
              </div>

              {/* Signature pad */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Su firma
                </h3>
                <SignaturePad
                  onSignature={handleSign}
                  disabled={state === 'signing' || !acceptedTerms}
                />
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  id="accept-terms"
                  name="acceptedTerms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  disabled={state === 'signing'}
                  className="mt-1 h-4 w-4 rounded border-white/10 border-white/10 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-200 transition-colors">
                  Acepto que esta firma tiene validez legal según la{' '}
                  <strong className="text-white">
                    Ley 27269 de Firmas y Certificados Digitales
                  </strong>{' '}
                  y sus modificatorias. Confirmo que los datos proporcionados son verídicos.
                </span>
              </label>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Signing loading */}
              {state === 'signing' && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Registrando firma...</span>
                </div>
              )}
            </div>
          )}

          {/* Success */}
          {state === 'success' && result && (
            <div className="p-8 md:p-12 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Firma registrada exitosamente
              </h2>
              <p className="text-gray-600">
                Su firma ha sido registrada de forma segura con validez legal.
              </p>

              <div className="bg-gray-50/50 rounded-xl p-4 text-left space-y-2 max-w-md mx-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Fecha y hora:</span>
                  <span className="font-medium text-white">
                    {new Date(result.signedAt).toLocaleString('es-PE', {
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Hash de integridad:</span>
                  <span className="font-mono text-xs text-gray-300 truncate max-w-[200px]">
                    {result.signatureHash}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Estado del documento:</span>
                  <span className="font-medium text-white">
                    {result.requestStatus === 'COMPLETED'
                      ? 'Todas las firmas completadas'
                      : `${result.signedCount} de ${result.totalSigners} firmas`}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4">
                Puede cerrar esta ventana. Recibira una copia del documento firmado por correo electronico.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Protegido por COMPLY 360 &middot; Firma electronica conforme a la Ley 27269
        </p>
      </div>
    </div>
  )
}
