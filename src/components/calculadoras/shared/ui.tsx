'use client'

import { Calculator } from 'lucide-react'

/**
 * Clases base de las calculadoras, todas con tokens del tema (sin fondos
 * oscuros fijos), para que se vean bien en la página y dentro del cajón.
 */
export const CARD =
  'bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm'
export const LABEL = 'block text-sm font-semibold text-[color:var(--text-secondary)] mb-1.5'
export const INPUT =
  'w-full px-3 py-3 border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all'
export const HINT = 'mt-1 text-xs text-[color:var(--text-tertiary)]'
/** Botón secundario sobre la tarjeta de resultado (fondo de color). */
export const HERO_BTN =
  'flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-colors border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed'
/** Botón principal sobre la tarjeta de resultado. */
export const HERO_BTN_PRIMARY =
  'flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-white/90 text-[color:var(--text-primary)] rounded-xl font-bold text-sm transition-colors'

/**
 * Estado vacío del panel de resultados: dice exactamente qué dato falta
 * para que el usuario no se quede adivinando.
 */
export function EstadoVacio({ titulo, faltantes }: { titulo: string; faltantes: string[] }) {
  return (
    <div className={`${CARD} p-10 text-center`}>
      <div className="w-14 h-14 rounded-2xl bg-[color:var(--neutral-100)] flex items-center justify-center mx-auto mb-4">
        <Calculator className="w-7 h-7 text-[color:var(--text-tertiary)]" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-[color:var(--text-primary)] mb-1">{titulo}</h3>
      {faltantes.length > 0 ? (
        <p className="text-sm text-[color:var(--text-secondary)]">
          Te falta completar: <span className="font-semibold">{faltantes.join(', ')}</span>.
        </p>
      ) : (
        <p className="text-sm text-[color:var(--text-secondary)]">El resultado aparece apenas completes los datos.</p>
      )}
    </div>
  )
}
