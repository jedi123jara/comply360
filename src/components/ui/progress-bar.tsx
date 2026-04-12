import { cn } from '@/lib/utils'

const colors = {
  primary: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

interface ProgressBarProps {
  value: number // 0-100
  label?: string
  showPercentage?: boolean
  color?: keyof typeof colors
  size?: 'sm' | 'md'
  className?: string
}

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  color = 'primary',
  size = 'md',
  className,
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('space-y-1', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-sm font-medium text-gray-300">{label}</span>}
          {showPercentage && (
            <span className="text-xs font-semibold text-gray-500">{clampedValue}%</span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-white/[0.04] rounded-full overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', colors[color])}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}
