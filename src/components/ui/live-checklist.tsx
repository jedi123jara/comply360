'use client'

import { useState } from 'react'
import {
  CheckCircle2, XCircle, MinusCircle, HelpCircle,
  Upload, Camera, ChevronDown, ChevronUp, FileText,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

export type ChecklistItemStatus = 'CUMPLE' | 'PARCIAL' | 'NO_CUMPLE' | 'NO_APLICA' | 'PENDING'

export interface ChecklistItem {
  id: string
  paso: number
  label: string
  description: string
  baseLegal: string
  gravedad: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  multaUIT: number
  multaPEN: number
  status: ChecklistItemStatus
  evidenceUrls?: string[]
  notes?: string
}

interface LiveChecklistProps {
  items: ChecklistItem[]
  onStatusChange: (id: string, status: ChecklistItemStatus) => void
  onEvidenceUpload: (id: string, file: File) => Promise<void>
  onNotesChange?: (id: string, notes: string) => void
  uploading?: Record<string, boolean>
  currentStep?: number
  disabled?: boolean
}

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  CUMPLE: {
    icon: CheckCircle2,
    label: 'Cumple',
    short: 'OK',
    color: 'text-emerald-300 bg-emerald-500/12 border-emerald-400/30',
    ring: 'ring-emerald-500',
  },
  PARCIAL: {
    icon: MinusCircle,
    label: 'Parcial',
    short: 'PARCIAL',
    color: 'text-amber-300 bg-amber-500/12 border-amber-400/30',
    ring: 'ring-amber-500',
  },
  NO_CUMPLE: {
    icon: XCircle,
    label: 'No cumple',
    short: 'FALTA',
    color: 'text-red-300 bg-red-500/12 border-red-400/30',
    ring: 'ring-red-500',
  },
  NO_APLICA: {
    icon: HelpCircle,
    label: 'N/A',
    short: 'N/A',
    color: 'text-gray-400 bg-[color:var(--bg-inset)] border-white/10',
    ring: 'ring-gray-400',
  },
  PENDING: {
    icon: HelpCircle,
    label: 'Pendiente',
    short: '...',
    color: 'text-gray-300 bg-[color:var(--bg-inset)] border-white/[0.08]',
    ring: 'ring-gray-300',
  },
} as const

const GRAVEDAD_COLORS = {
  LEVE: 'bg-amber-500/12 text-amber-300 border border-amber-400/25',
  GRAVE: 'bg-red-500/12 text-red-300 border border-red-400/25',
  MUY_GRAVE: 'bg-red-500/18 text-red-200 border border-red-400/30',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LiveChecklist({
  items,
  onStatusChange,
  onEvidenceUpload,
  onNotesChange,
  uploading = {},
  currentStep,
  disabled = false,
}: LiveChecklistProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const statusCfg = STATUS_CONFIG[item.status]
        const StatusIcon = statusCfg.icon
        const isExpanded = expandedId === item.id
        const isCurrent = currentStep === idx
        const isUploading = uploading[item.id] ?? false

        return (
          <div
            key={item.id}
            className={cn(
              'rounded-xl border transition-all',
              isCurrent && 'ring-2 ring-amber-400 shadow-md',
              item.status === 'CUMPLE' && 'bg-emerald-500/8 border-emerald-400/25',
              item.status === 'PARCIAL' && 'bg-amber-500/8 border-amber-400/25',
              item.status === 'NO_CUMPLE' && 'bg-red-500/8 border-red-400/25',
              item.status === 'PENDING' && 'bg-[color:var(--bg-inset)] border-white/[0.08]',
              item.status === 'NO_APLICA' && 'bg-[color:var(--bg-inset)] border-white/[0.08] opacity-60',
            )}
          >
            {/* Main row */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
            >
              {/* Step number */}
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--bg-surface)] text-xs font-bold text-[color:var(--text-secondary)]">
                {item.paso}
              </span>

              {/* Status icon */}
              <StatusIcon className={cn('h-5 w-5 shrink-0', statusCfg.color.split(' ')[0])} />

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {item.label}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {item.baseLegal}
                </p>
              </div>

              {/* Gravedad badge */}
              <span className={cn('hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold', GRAVEDAD_COLORS[item.gravedad])}>
                {item.gravedad.replace('_', ' ')}
              </span>

              {/* Multa */}
              {item.multaPEN > 0 && (
                <span className="text-xs font-bold text-red-600 tabular-nums shrink-0">
                  S/{item.multaPEN.toLocaleString()}
                </span>
              )}

              {/* Evidence indicator */}
              {(item.evidenceUrls?.length ?? 0) > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100">
                  <Camera className="h-3 w-3 text-blue-600" />
                </span>
              )}

              {/* Expand toggle */}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              )}
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="border-t border-white/[0.06] border-white/[0.08] px-4 py-3 space-y-3">
                {/* Description */}
                <p className="text-xs text-[color:var(--text-secondary)]">
                  {item.description}
                </p>

                {/* Status buttons */}
                <div className="flex flex-wrap gap-2">
                  {(['CUMPLE', 'PARCIAL', 'NO_CUMPLE', 'NO_APLICA'] as const).map(s => {
                    const cfg = STATUS_CONFIG[s]
                    const Icon = cfg.icon
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={disabled}
                        onClick={() => onStatusChange(item.id, s)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                          item.status === s
                            ? cn(cfg.color, 'ring-2', cfg.ring)
                            : 'border-white/[0.08] text-gray-400 hover:bg-[color:var(--bg-surface-hover)]',
                          disabled && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>

                {/* Upload evidence */}
                <div className="flex items-center gap-2">
                  <label className={cn(
                    'flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs text-gray-400 cursor-pointer hover:bg-[color:var(--bg-surface-hover)] transition-colors',
                    disabled && 'opacity-50 cursor-not-allowed',
                  )}>
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {isUploading ? 'Subiendo...' : 'Adjuntar evidencia'}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      capture="environment"
                      className="hidden"
                      disabled={disabled || isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) await onEvidenceUpload(item.id, file)
                        e.target.value = ''
                      }}
                    />
                  </label>

                  {/* Show uploaded evidence count */}
                  {(item.evidenceUrls?.length ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                      <FileText className="h-3.5 w-3.5" />
                      {item.evidenceUrls!.length} archivo(s)
                    </span>
                  )}
                </div>

                {/* Notes */}
                {onNotesChange && (
                  <textarea
                    value={item.notes ?? ''}
                    onChange={(e) => onNotesChange(item.id, e.target.value)}
                    placeholder="Notas adicionales..."
                    disabled={disabled}
                    rows={2}
                    className="w-full rounded-lg border border-white/[0.08] bg-[color:var(--bg-inset)] px-3 py-2 text-xs text-gray-300 placeholder-gray-400 resize-none focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
