'use client'

import { useId } from 'react'
import { AlertTriangle, Info, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Term, TermHint } from '@/components/ui/term'
import {
  AVISO_REFERENCIAL,
  REGIMENES,
  REGIMENES_OTROS,
  REGIMENES_PRINCIPALES,
  getRegimenInfo,
  normalizarRegimen,
  notaRegimen,
  type CalcConRegimen,
  type RegimenKey,
} from './regimen'

interface RegimenSelectorProps {
  calc: CalcConRegimen
  value: string | undefined
  onChange: (value: RegimenKey) => void
  /** Nombre del trabajador si el régimen se tomó de su ficha. */
  origenTrabajador?: string | null
}

/**
 * Selector de régimen laboral con explicación corta de cada opción y una
 * nota de qué cambia en ESTA calculadora. Si el régimen tiene reglas propias
 * que el motor aún no calcula, muestra un aviso de resultado referencial.
 */
export function RegimenSelector({ calc, value, onChange, origenTrabajador }: RegimenSelectorProps) {
  const groupId = useId()
  const actual = normalizarRegimen(value)
  const info = getRegimenInfo(actual)
  const esOtro = !REGIMENES_PRINCIPALES.includes(actual)
  const nota = notaRegimen(calc, actual)

  return (
    <fieldset className="space-y-2.5">
      <legend id={`${groupId}-legend`} className="block text-sm font-semibold text-[color:var(--text-secondary)] mb-1">
        Régimen laboral
      </legend>
      <p className="text-xs text-[color:var(--text-tertiary)] -mt-1">
        ¿No sabes cuál es? Si tu empresa no está inscrita en el <Term id="remype">REMYPE</Term>, es el{' '}
        <Term id="regimen-general">régimen general</Term>.
      </p>

      {origenTrabajador ? (
        <p className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-inset)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--text-secondary)]">
          <UserCheck className="h-3.5 w-3.5" aria-hidden />
          Tomado de la ficha de {origenTrabajador}
        </p>
      ) : null}

      <div className="grid gap-2" role="radiogroup" aria-labelledby={`${groupId}-legend`}>
        {REGIMENES_PRINCIPALES.map((key) => {
          const r = REGIMENES[key]
          const checked = actual === key
          return (
            // El "?" del glosario va fuera del <label> para que tocarlo no
            // cambie la opción elegida.
            <div key={key} className="relative">
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors',
                  r.glosarioId && 'pr-10',
                  checked
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] hover:bg-[color:var(--bg-surface-hover)]',
                )}
              >
                <input
                  type="radio"
                  name={`${groupId}-regimen`}
                  value={key}
                  checked={checked}
                  onChange={() => onChange(key)}
                  className="mt-1 h-4 w-4 flex-shrink-0 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[color:var(--text-primary)]">{r.label}</span>
                  <span className="block text-xs leading-snug text-[color:var(--text-tertiary)]">{r.descripcion}</span>
                </span>
              </label>
              {r.glosarioId ? <TermHint id={r.glosarioId} className="absolute right-3.5 top-3.5" /> : null}
            </div>
          )
        })}
      </div>

      <div>
        <label htmlFor={`${groupId}-otro`} className="block text-xs font-medium text-[color:var(--text-tertiary)] mb-1">
          Otro régimen
        </label>
        <select
          id={`${groupId}-otro`}
          value={esOtro ? actual : ''}
          onChange={(e) => {
            if (e.target.value) onChange(normalizarRegimen(e.target.value))
          }}
          className={cn(
            'w-full rounded-xl border px-3 py-2.5 text-sm bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all',
            esOtro ? 'border-primary' : 'border-[color:var(--border-default)]',
          )}
        >
          <option value="">— Elige si es otro régimen —</option>
          {REGIMENES_OTROS.map((key) => (
            <option key={key} value={key}>
              {REGIMENES[key].label}
            </option>
          ))}
        </select>
        {esOtro ? (
          <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
            {info.descripcion}
            {info.glosarioId ? (
              <>
                {' '}
                <Term id={info.glosarioId} className="font-medium text-[color:var(--text-secondary)]">
                  ¿Qué es?
                </Term>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {info.tratamiento === 'especial' ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-semibold">{AVISO_REFERENCIAL}</p>
            {info.motivoEspecial ? <p className="text-xs text-amber-700">{info.motivoEspecial}</p> : null}
          </div>
        </div>
      ) : nota ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-blue-800">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">Qué cambia: </span>
            {nota}
          </p>
        </div>
      ) : null}
    </fieldset>
  )
}

/**
 * Aviso grande para el panel de resultados cuando el régimen es especial.
 * Se muestra junto al monto para que nadie lo lea como definitivo.
 */
export function AvisoRegimenEspecial({ regimen }: { regimen: string | undefined }) {
  const info = getRegimenInfo(regimen)
  if (info.tratamiento !== 'especial') return null
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
      <div>
        <p className="text-sm font-bold">Resultado referencial · {info.label}</p>
        <p className="mt-0.5 text-sm">{AVISO_REFERENCIAL}</p>
        {info.motivoEspecial ? <p className="mt-1 text-xs text-amber-700">{info.motivoEspecial}</p> : null}
      </div>
    </div>
  )
}
