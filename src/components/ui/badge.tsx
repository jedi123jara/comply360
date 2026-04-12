import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-white/[0.04] text-gray-300 bg-white/[0.04]',
}

const sizes = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2.5 py-1',
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export function Badge({ className, variant = 'default', size = 'md', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}
