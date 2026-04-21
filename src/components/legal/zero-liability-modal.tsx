'use client'

import { useCallback, useEffect, useState } from 'react'
import { Scale, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner-toaster'

const ACK_KEY = 'comply360:zero-liability-templates:acknowledged'
const ACK_VERSION = 'v1.0.0'

/**
 * ZeroLiabilityModal — aparece la primera vez que el admin entra a la
 * biblioteca de plantillas. Le explica que el contenido legal es
 * responsabilidad de SU empresa/abogado, no de Comply360. Comply360 es
 * motor de sustitución determinística, no generador de contenido.
 *
 * Esto nos protege civilmente (Código Civil Perú art. 1321) y penalmente
 * (no somos responsables del contenido jurídico del contrato).
 *
 * Persistencia:
 *  - localStorage con versión → se resetea si cambiamos texto legal
 *  - Además se registra en AuditLog vía /api/consent scope=org.template-zero-liability
 */
export function ZeroLiabilityModal() {
  const [visible, setVisible] = useState(false)
  const [ack, setAck] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(ACK_KEY) : null
    if (stored !== ACK_VERSION) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot boot check
      setVisible(true)
    }
  }, [])

  const handleAccept = useCallback(async () => {
    if (!ack || submitting) return
    setSubmitting(true)
    try {
      // Fire-and-forget audit log — si falla, igual marcamos localmente
      fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'org',
          acceptedDocs: ['zero-liability-templates'],
        }),
      }).catch(() => null)

      localStorage.setItem(ACK_KEY, ACK_VERSION)
      toast.success('Entendido. Ya podés crear plantillas.')
      setVisible(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }, [ack, submitting])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm motion-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl motion-scale-in">
        <div className="border-b border-[color:var(--border-subtle)] px-6 py-5">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_14px_rgba(4,120,87,0.3)]"
              style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
            >
              <Scale className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                Antes de crear plantillas
              </p>
              <h2
                className="mt-0.5 text-2xl leading-tight text-[color:var(--text-primary)]"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
              >
                ¿Quién responde por el contenido de tus contratos?
              </h2>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3 text-sm leading-relaxed text-[color:var(--text-primary)]">
          <p>
            Comply360 funciona como <strong>motor de sustitución determinística</strong>:
            vos subís tu contrato tal como te lo entregó tu abogado, marcás los campos
            variables con <code className="rounded bg-[color:var(--neutral-100)] px-1 py-0.5 text-[11px]">{'{{VARIABLES}}'}</code>,
            y nosotros los reemplazamos con los datos de cada trabajador.
          </p>
          <p>
            <strong>Nosotros NO generamos contenido legal con IA.</strong> Eso es a propósito:
            evita riesgos de cláusulas inválidas o ambiguas.
          </p>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <p className="flex items-start gap-2 text-[12px] text-amber-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Responsabilidad legal:</strong> el contenido de tus plantillas es
                responsabilidad exclusiva de tu empresa y tu asesor legal. Comply360 no
                audita ni certifica el contenido jurídico. Si una cláusula resulta inválida
                o genera una contingencia, es responsabilidad de tu empresa.
              </span>
            </p>
          </div>

          <p className="text-[12px] text-[color:var(--text-secondary)]">
            Esta aceptación queda registrada con fecha, IP y dispositivo en tu historial
            de auditoría conforme a la Ley N° 29733.
          </p>

          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[color:var(--border-default)] bg-white p-3 mt-2">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600 shrink-0"
            />
            <span className="text-[12px] leading-relaxed">
              Entiendo y acepto que <strong>el contenido de mis plantillas es responsabilidad
              de mi empresa y mi asesor legal</strong>. Comply360 actúa como motor técnico
              de sustitución, no como generador ni validador de contenido legal.
            </span>
          </label>
        </div>

        <div className="border-t border-[color:var(--border-subtle)] px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={handleAccept}
            disabled={!ack || submitting}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(4,120,87,0.3)] transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Registrando…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Entendido, continuar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
