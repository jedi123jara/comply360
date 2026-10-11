'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Field, fieldControlClassName, useFieldControl, useFieldContext } from '@/components/ui/field'

/**
 * Input — campo de una línea (h-10), mismo radio, borde y foco que Select y Textarea.
 *
 * Uso recomendado, dentro de `Field` (conecta etiqueta, ayuda y error):
 *   <Field label="DNI" hint="8 dígitos" error={errors.dni} required>
 *     <Input inputMode="numeric" value={dni} onChange={…} />
 *   </Field>
 *
 * Uso suelto: `<Input aria-label="Buscar trabajador" invalid={!!error} />`.
 *
 * Compatibilidad: las props `label`, `error` y `helperText` siguen funcionando
 * fuera de un Field (internamente arman uno).
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** @deprecated Usa `<Field label>`. */
  label?: string
  /** @deprecated Usa `<Field error>`; para solo marcar el estado usa `invalid`. */
  error?: string
  /** @deprecated Usa `<Field hint>`. */
  helperText?: string
  /** Ícono decorativo a la izquierda (se oculta a lectores de pantalla). */
  icon?: React.ReactNode
  /** Marca el campo con error (borde + `aria-invalid`). Dentro de un Field con `error` es automático. */
  invalid?: boolean
}

type InputControlProps = Omit<InputProps, 'label' | 'error' | 'helperText'>

const InputControl = forwardRef<HTMLInputElement, InputControlProps>(function InputControl(
  { className, icon, invalid, ...props },
  ref
) {
  const { controlProps } = useFieldControl({ ...props, invalid })

  const input = (
    <input
      ref={ref}
      {...props}
      {...controlProps}
      className={cn(fieldControlClassName, 'h-10', Boolean(icon) && 'pl-10', className)}
    />
  )

  if (!icon) return input

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)] [&_svg]:h-4 [&_svg]:w-4"
        aria-hidden="true"
      >
        {icon}
      </span>
      {input}
    </div>
  )
})

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, invalid, ...props },
  ref
) {
  const inField = useFieldContext() !== null

  // API anterior: fuera de un Field, `label`/`error`/`helperText` arman uno.
  if (!inField && (label || error || helperText)) {
    return (
      <Field label={label} hint={helperText} error={error} id={props.id}>
        <InputControl ref={ref} invalid={invalid} {...props} />
      </Field>
    )
  }

  return <InputControl ref={ref} invalid={invalid || Boolean(error)} {...props} />
})

Input.displayName = 'Input'
