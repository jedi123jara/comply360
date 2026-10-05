'use client'

import { TermHint } from '@/components/ui/term'
import { cn } from '@/lib/utils'
import { planAreaTermId } from '../_lib/plan-display'

/**
 * Nombre del área de un pendiente con un ícono "?" que abre la explicación del
 * glosario (SST, hostigamiento, T-Registro…). Si el área no tiene término, solo
 * muestra el nombre.
 *
 * Úsalo en el panel de detalle. NO dentro del botón de la fila de la lista: el
 * "?" es otro botón y no se puede anidar un botón dentro de otro.
 */
export function PlanAreaLabel({ label, className }: { label: string; className?: string }) {
  const termId = planAreaTermId(label)
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {label}
      {termId ? <TermHint id={termId} /> : null}
    </span>
  )
}
