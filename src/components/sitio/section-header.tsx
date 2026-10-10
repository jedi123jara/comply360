import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { pub } from '@/components/marketing/public-theme'

/** Encabezado de sección sobre fondo claro: antetítulo + h2 + bajada. */
export function SectionHeader({
  kicker,
  titulo,
  bajada,
  id,
  align = 'left',
  className,
}: {
  kicker?: string
  titulo: ReactNode
  bajada?: ReactNode
  id?: string
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <div className={cn(align === 'center' && 'mx-auto max-w-3xl text-center', className)}>
      {kicker ? <p className={cn(pub.kicker, 'mb-3')}>{kicker}</p> : null}
      <h2 id={id} className={pub.h2}>
        {titulo}
      </h2>
      {bajada ? <p className={cn(pub.lead, 'mt-3', align === 'left' && 'max-w-3xl')}>{bajada}</p> : null}
    </div>
  )
}
