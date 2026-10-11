'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { fieldControlClassName, useFieldControl } from '@/components/ui/field'

/**
 * Textarea — campo de varias líneas con el mismo radio, borde y foco que
 * Input y Select. Dentro de un `Field` se conecta solo (label, ayuda, error).
 *
 *   <Field label="Observaciones" hint="Opcional. Máximo 500 caracteres.">
 *     <Textarea rows={4} maxLength={500} />
 *   </Field>
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Marca el campo con error (borde + `aria-invalid`). Dentro de un Field con `error` es automático. */
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref
) {
  const { controlProps } = useFieldControl({ ...props, invalid })

  return (
    <textarea
      ref={ref}
      {...props}
      {...controlProps}
      className={cn(fieldControlClassName, 'min-h-20 resize-y py-2 leading-relaxed', className)}
    />
  )
})

Textarea.displayName = 'Textarea'
