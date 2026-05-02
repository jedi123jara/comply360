'use client'

/* -------------------------------------------------------------------------- */
/*  LiveValidationPanel — feedback legal en vivo (QW5)                        */
/* -------------------------------------------------------------------------- */
/*
 * Renderiza los hallazgos del motor de validacion legal mientras el usuario
 * llena el formulario. Cada hallazgo muestra su base legal verbatim y un
 * boton "ir al campo" que hace focus en el input culpable (si esta disponible
 * en el DOM via id).
 */

import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import type { LiveValidationResult } from '@/hooks/use-live-validation'

interface LiveValidationPanelProps {
  blockers: LiveValidationResult[]
  warnings: LiveValidationResult[]
  infos: LiveValidationResult[]
  passed: LiveValidationResult[]
  totalRules: number
  loading: boolean
  error: string | null
  className?: string
}

/**
 * Mapea un ruleCode a un input id del formulario para hacer focus al click.
 * Lista de mapeos basicos — extender cuando se agreguen mas reglas o
 * cambien los IDs.
 */
function getFieldIdForRule(code: string): string | null {
  if (code.startsWith('SAL') || code.includes('SALARY') || code.includes('REMUN'))
    return 'ai-trab-dni' // como fallback enfocamos seccion (TODO: id especifico de sueldo)
  if (code.startsWith('PLAZO') || code.includes('DURATION')) return 'ai-trab-dni'
  if (code.startsWith('CAUSA') || code.includes('CAUSE')) return 'ai-trab-dni'
  return null
}

function focusField(code: string) {
  const id = getFieldIdForRule(code)
  if (!id || typeof document === 'undefined') return
  const el = document.getElementById(id)
  if (el && 'focus' in el) {
    ;(el as HTMLElement).focus()
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

export function LiveValidationPanel({
  blockers,
  warnings,
  infos,
  passed,
  totalRules,
  loading,
  error,
  className = '',
}: LiveValidationPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  // Estado vacio (sin datos suficientes)
  if (totalRules === 0 && !loading && !error) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-slate-500">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs">
            Las verificaciones legales aparecerán aquí cuando completes los datos esenciales
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`rounded-2xl border border-amber-200 bg-amber-50 p-4 ${className}`}>
        <div className="flex items-start gap-2 text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs">
            <p className="font-semibold">No se pudieron cargar las verificaciones</p>
            <p className="text-amber-700 mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const hasIssues = blockers.length + warnings.length + infos.length > 0
  const headerColor = blockers.length > 0
    ? 'border-red-200 bg-gradient-to-br from-red-50 to-white'
    : warnings.length > 0
      ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white'
      : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'

  return (
    <section
      className={`rounded-2xl border ${headerColor} overflow-hidden ${className}`}
      aria-label="Verificaciones legales en vivo"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200/60">
        <div className="flex items-center gap-2 min-w-0">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-hidden="true" />
          ) : blockers.length > 0 ? (
            <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
          ) : warnings.length > 0 ? (
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Verificaciones legales
            </p>
            <p className="text-[11px] text-slate-500">
              {loading
                ? 'Validando...'
                : `${passed.length} pasadas · ${blockers.length} bloqueos · ${warnings.length} advertencias`}
            </p>
          </div>
        </div>
        {hasIssues && (
          <button
            type="button"
            onClick={() => setCollapsed(c => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Mostrar detalles' : 'Ocultar detalles'}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        )}
      </header>

      {!collapsed && hasIssues && (
        <ul className="divide-y divide-slate-100" role="list">
          {blockers.map(b => (
            <ValidationItem key={b.ruleId} item={b} variant="blocker" onFocusField={focusField} />
          ))}
          {warnings.map(w => (
            <ValidationItem key={w.ruleId} item={w} variant="warning" onFocusField={focusField} />
          ))}
          {infos.map(i => (
            <ValidationItem key={i.ruleId} item={i} variant="info" onFocusField={focusField} />
          ))}
        </ul>
      )}

      {!hasIssues && !loading && (
        <div className="px-4 py-3 flex items-center gap-2 text-emerald-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs font-medium">
            Todas las verificaciones pasaron ({totalRules}/{totalRules})
          </span>
        </div>
      )}
    </section>
  )
}

function ValidationItem({
  item,
  variant,
  onFocusField,
}: {
  item: LiveValidationResult
  variant: 'blocker' | 'warning' | 'info'
  onFocusField: (code: string) => void
}) {
  const config = {
    blocker: {
      Icon: AlertCircle,
      color: 'text-red-700',
      bg: 'bg-red-50',
      label: 'Bloqueo',
    },
    warning: {
      Icon: AlertTriangle,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      label: 'Advertencia',
    },
    info: {
      Icon: Info,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      label: 'Info',
    },
  }[variant]
  const Icon = config.Icon
  const fieldId = getFieldIdForRule(item.ruleCode)

  return (
    <li className={`px-4 py-3 ${config.bg}`}>
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${config.color}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${config.color}`}>
            <span className="uppercase tracking-wide">{config.label}</span> · {item.title}
          </p>
          <p className="text-xs text-slate-700 mt-0.5">{item.message}</p>
          {item.legalBasis && (
            <p className="text-[10px] italic text-slate-500 mt-1">Base: {item.legalBasis}</p>
          )}
          {fieldId && (
            <button
              type="button"
              onClick={() => onFocusField(item.ruleCode)}
              className={`mt-1 text-[11px] font-semibold underline ${config.color} hover:no-underline`}
            >
              Ir al campo
            </button>
          )}
        </div>
      </div>
    </li>
  )
}
