'use client'

import { Lock, Sparkles } from 'lucide-react'
import { useUpgradeGate } from '@/providers/upgrade-gate-provider'
import type { PlanKey } from '@/lib/constants'
import type { PlanFeature } from '@/lib/plan-features'
import { FEATURE_MIN_PLAN } from '@/lib/plan-features'

/**
 * FeatureLock — badge pequeño con candado para items gated en navegación.
 *
 * Al hacer clic dispara el UpgradeModal vía el provider global, preservando
 * el evento para que el click NO navegue a la página bloqueada.
 *
 * Uso típico: al costado de items del sidebar o en cards del dashboard.
 */
export interface FeatureLockProps {
  feature: PlanFeature
  currentPlan?: PlanKey | 'FREE'
  featureName?: string
  variant?: 'badge' | 'pill'
  className?: string
}

export function FeatureLock({
  feature,
  currentPlan = 'FREE',
  featureName,
  variant = 'badge',
  className,
}: FeatureLockProps) {
  const { openUpgrade } = useUpgradeGate()
  const requiredPlan = (FEATURE_MIN_PLAN[feature] ?? 'EMPRESA') as PlanKey

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    openUpgrade({ requiredPlan, currentPlan, feature, featureName })
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 7px',
          borderRadius: 9999,
          background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
          border: '0.5px solid rgba(16,185,129,0.35)',
          color: 'var(--emerald-800)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1,
          cursor: 'pointer',
          transition: 'all 200ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
        }}
        aria-label={`Requiere plan ${requiredPlan} — click para ver detalles`}
      >
        <Sparkles style={{ width: 9, height: 9 }} />
        {requiredPlan}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16,
        borderRadius: 4,
        background: 'var(--neutral-100)',
        color: 'var(--text-tertiary)',
        cursor: 'pointer',
        border: 'none',
        transition: 'all 200ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--emerald-50)'
        e.currentTarget.style.color = 'var(--emerald-700)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--neutral-100)'
        e.currentTarget.style.color = 'var(--text-tertiary)'
      }}
      title={`Requiere plan ${requiredPlan}`}
      aria-label={`Requiere plan ${requiredPlan}`}
    >
      <Lock style={{ width: 10, height: 10 }} strokeWidth={2.4} />
    </button>
  )
}
