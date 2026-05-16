'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CreditCard,
  Shield,
  CheckCircle2,
  Loader2,
  X,
  ExternalLink,
  AlertOctagon,
} from 'lucide-react'
import { track } from '@/lib/analytics'

/**
 * CulqiCheckoutModal — flujo de pago real con Culqi (Perú).
 *
 * Arquitectura:
 *  1. Carga el SDK Culqi v4 (`https://checkout.culqi.com/js/v4`) vía <script>
 *  2. Click "Pagar S/ X" → Culqi.open() abre el form seguro (tarjeta, Yape, bancos)
 *  3. Usuario completa → Culqi.js genera un token PCI-safe
 *  4. Frontend POSTea `{ planId, token: Culqi.token.id }` a /api/payments/checkout
 *  5. Backend valida + llama Culqi.createCharge → actualiza Organization.plan
 *  6. Redirect automático al dashboard con toast de éxito
 *
 * Fallback: si no hay NEXT_PUBLIC_CULQI_PUBLIC_KEY → redirect a WhatsApp.
 */

interface CulqiToken {
  id: string
  email?: string
}

interface CulqiSDK {
  publicKey: string
  settings: (opts: {
    title: string
    currency: string
    amount: number
    description?: string
    order?: string
  }) => void
  options: (opts: {
    lang?: string
    installments?: boolean
    paymentMethods?: {
      tarjeta?: boolean
      yape?: boolean
      bancaMovil?: boolean
      agente?: boolean
      billetera?: boolean
      cuotealo?: boolean
    }
    style?: {
      logo?: string
      bannerColor?: string
      buttonBackground?: string
      buttonText?: string
      priceColor?: string
    }
  }) => void
  open: () => void
  close: () => void
  token?: CulqiToken
  error?: { user_message?: string; merchant_message?: string }
}

declare global {
  interface Window {
    Culqi?: CulqiSDK
    culqi?: () => void
  }
}

export interface CulqiCheckoutModalProps {
  open: boolean
  onClose: () => void
  plan: {
    key: 'STARTER' | 'EMPRESA' | 'PRO'
    name: string
    priceSoles: number
    priceInCentimos: number
    features: string[]
  }
  orgName?: string
  /** Fallback WhatsApp si no hay clave pública. */
  whatsappNumber?: string
}

type Status = 'idle' | 'loading-sdk' | 'sdk-ready' | 'processing' | 'success' | 'error'

const IGV_RATE = 0.18

export function CulqiCheckoutModal({
  open,
  onClose,
  plan,
  orgName,
  whatsappNumber = '51999999999',
}: CulqiCheckoutModalProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const handlerRef = useRef<((e?: Event) => void) | null>(null)

  const publicKey =
    typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY : undefined
  const hasKey = Boolean(publicKey)

  const totalSoles = plan.priceSoles * (1 + IGV_RATE)
  const igvAmount = plan.priceSoles * IGV_RATE
  // Culqi cobra el total (precio + IGV) en céntimos
  const totalInCentimos = Math.round(totalSoles * 100)

  // Load Culqi SDK once when modal opens
  useEffect(() => {
    if (!open) return
    if (typeof window === 'undefined') return
    let cancelled = false

    // Checkout iniciado (tanto con Culqi real como con fallback WhatsApp)
    track('checkout_started', {
      plan: plan.key,
      amount: totalSoles,
      has_culqi_key: hasKey,
    })

    if (!hasKey) return

    void Promise.resolve().then(() => {
      if (cancelled) return
      // Skip if already loaded
      if (window.Culqi) {
        setStatus('sdk-ready')
        return
      }

      setStatus('loading-sdk')
      const script = document.createElement('script')
      script.src = 'https://checkout.culqi.com/js/v4'
      script.async = true
      script.onload = () => {
        if (cancelled) return
        if (window.Culqi && publicKey) {
          window.Culqi.publicKey = publicKey
          setStatus('sdk-ready')
        } else {
          setStatus('error')
          setError('No pudimos inicializar Culqi')
        }
      }
      script.onerror = () => {
        if (cancelled) return
        setStatus('error')
        setError('No pudimos cargar el SDK de pagos')
      }
      document.body.appendChild(script)
    })

    return () => {
      cancelled = true
      // Don't remove the script — Culqi caches its state on window
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- plan.key + totalSoles incluidos in-body; re-correr en cambio re-trackearía falsamente.
  }, [open, hasKey, publicKey])

  // Wire Culqi global callback — se ejecuta cuando el usuario completa el form
  useEffect(() => {
    if (!open || typeof window === 'undefined') return

    handlerRef.current = () => {
      const culqi = window.Culqi
      if (!culqi) return

      if (culqi.token) {
        setStatus('processing')
        fetch('/api/payments/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: plan.key, token: culqi.token.id }),
        })
          .then(async (r) => {
            const data = await r.json().catch(() => ({}))
            if (!r.ok) {
              throw new Error(data.error || `HTTP ${r.status}`)
            }
            setStatus('success')
            track('payment_completed', {
              plan: plan.key,
              amount: totalSoles,
              currency: 'PEN',
            })
            // Auto-close después de 2s + redirect al dashboard
            setTimeout(() => {
              window.location.assign('/dashboard?upgraded=1')
            }, 2000)
          })
          .catch((err: Error) => {
            setStatus('error')
            setError(err.message || 'Error procesando el pago')
            track('payment_failed', {
              plan: plan.key,
              reason: err.message?.slice(0, 100) ?? 'unknown',
              phase: 'backend',
            })
          })
      } else if (culqi.error) {
        setStatus('error')
        const reason = culqi.error.user_message || culqi.error.merchant_message || 'Pago rechazado'
        setError(reason)
        track('payment_failed', {
          plan: plan.key,
          reason: reason.slice(0, 100),
          phase: 'culqi_sdk',
        })
      }
    }

    window.culqi = handlerRef.current
    return () => {
      if (window.culqi === handlerRef.current) {
        window.culqi = undefined
      }
    }
    // totalSoles is read inside handlerRef at callback time — we include it
    // so the handler rebinds when plan/price change mid-checkout.
  }, [open, plan.key, totalSoles])

  function openCulqiCheckout() {
    if (!window.Culqi || !hasKey) return
    setError(null)
    track('checkout_sdk_opened', {
      plan: plan.key,
      amount: totalSoles,
    })
    window.Culqi.settings({
      title: 'COMPLY360',
      currency: 'PEN',
      amount: totalInCentimos,
      description: `${plan.name} — ${orgName ?? 'COMPLY360'} (suscripción mensual)`,
      order: `comply360-${plan.key}-${Date.now()}`,
    })
    window.Culqi.options({
      lang: 'es',
      installments: false,
      paymentMethods: {
        tarjeta: true,
        yape: true,
        bancaMovil: true,
        agente: false,
        billetera: false,
        cuotealo: true,
      },
      style: {
        bannerColor: '#1e40af',
        buttonBackground: '#2563eb',
        buttonText: '#ffffff',
        priceColor: '#1e3a8a',
      },
    })
    window.Culqi.open()
  }

  function openWhatsAppFallback() {
    const msg = `Hola, quiero activar el Plan ${plan.name} de COMPLY360`
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="culqi-checkout-title"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0"
        style={{
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(8px)',
        }}
      />

      <div
        className="relative w-full max-w-lg motion-fade-in-up"
        style={{
          background: 'white',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow:
            '0 30px 60px -12px rgba(4, 120, 87, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.06)',
        }}
      >
        {/* Header editorial */}
        <div
          className="relative px-7 pt-8 pb-6 text-white overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 45%, #2563eb 100%)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-100 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
            Pago seguro · Culqi
          </div>

          <h2
            id="culqi-checkout-title"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              fontSize: 26,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: 4,
            }}
          >
            Plan <em style={{ fontStyle: 'italic', color: '#dbeafe' }}>{plan.name}</em>
          </h2>
          <p className="text-emerald-50 text-sm">
            Suscripción mensual renovable. Cancela cuando quieras.
          </p>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-5">
          {/* Price breakdown */}
          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--neutral-50)',
              border: '0.5px solid var(--border-default)',
            }}
          >
            <div className="flex items-center justify-between text-sm text-[color:var(--text-secondary)] mb-1">
              <span>Precio base</span>
              <span className="font-mono">S/ {plan.priceSoles.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[color:var(--text-tertiary)] mb-3">
              <span>IGV (18%)</span>
              <span className="font-mono">S/ {igvAmount.toFixed(2)}</span>
            </div>
            <div
              className="flex items-baseline justify-between pt-3"
              style={{ borderTop: '0.5px solid var(--border-default)' }}
            >
              <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                Total mensual
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 26,
                  color: 'var(--emerald-700)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                S/ {totalSoles.toFixed(2)}
              </span>
            </div>
          </div>

          {/* What's included */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-tertiary)] mb-2">
              Incluye
            </p>
            <ul className="space-y-1.5">
              {plan.features.slice(0, 5).map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-[color:var(--text-secondary)]"
                >
                  <CheckCircle2
                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                    style={{ color: 'var(--emerald-600)' }}
                  />
                  <span>{f}</span>
                </li>
              ))}
              {plan.features.length > 5 && (
                <li className="text-xs text-[color:var(--text-tertiary)] ml-6 mt-1">
                  + {plan.features.length - 5} funcionalidades más
                </li>
              )}
            </ul>
          </div>

          {/* Status messages */}
          {status === 'success' && (
            <div className="flex items-start gap-3 rounded-xl p-4 bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-900">¡Pago exitoso!</p>
                <p className="mt-0.5 text-xs text-emerald-800">
                  Plan {plan.name} activado. Redirigiendo al dashboard…
                </p>
              </div>
            </div>
          )}

          {status === 'error' && error && (
            <div className="flex items-start gap-3 rounded-xl p-4 bg-red-50 border border-red-200">
              <AlertOctagon className="h-5 w-5 text-red-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-900">No pudimos procesar el pago</p>
                <p className="mt-0.5 text-xs text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Primary CTA */}
          {status !== 'success' && (
            <>
              {hasKey ? (
                <button
                  type="button"
                  onClick={openCulqiCheckout}
                  disabled={status === 'loading-sdk' || status === 'processing'}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    boxShadow:
                      '0 10px 28px -6px rgba(4,120,87,0.45), inset 0 1px 0 rgba(255,255,255,0.14)',
                  }}
                >
                  {status === 'loading-sdk' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando pasarela…
                    </>
                  ) : status === 'processing' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando pago…
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Pagar S/ {totalSoles.toFixed(2)}
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openWhatsAppFallback}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 text-sm font-bold transition-colors"
                >
                  Activar vía WhatsApp
                  <ExternalLink className="h-4 w-4" />
                </button>
              )}
            </>
          )}

          {/* Security note */}
          <div
            className="flex items-start gap-2 rounded-lg p-3 text-xs"
            style={{
              background: 'var(--neutral-50)',
              border: '0.5px solid var(--border-subtle)',
            }}
          >
            <Shield className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-emerald-700" />
            <p className="text-[color:var(--text-tertiary)] leading-relaxed">
              Procesado por <b>Culqi</b> (certificado PCI-DSS nivel 1). Aceptamos Visa, Mastercard,
              American Express, Yape y banca móvil. No almacenamos datos de tu tarjeta.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
