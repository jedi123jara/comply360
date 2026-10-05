'use client'

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useId,
  useMemo,
  type AriaAttributes,
  type ReactElement,
  type ReactNode,
} from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Field — envoltorio accesible para un control de formulario.
 *
 * Conecta solo, sin que tengas que inventar ids:
 *  - `<label htmlFor>` ↔ `id` del control
 *  - `aria-describedby` → mensaje de error y texto de ayuda
 *  - `aria-invalid` cuando hay `error`
 *  - `aria-required` cuando es `required` (no agrega el `required` nativo para
 *    no activar la validación del navegador en formularios que validan por su cuenta)
 *
 * Funciona con:
 *  - `Input`, `Textarea` y `SelectTrigger` de `@/components/ui` (leen el contexto)
 *  - `<input>`, `<select>` y `<textarea>` nativos como hijo directo (cloneElement)
 *  - cualquier otro control con la forma render-prop o con `useFieldControl()`
 *
 *   <Field label="DNI" hint="8 dígitos, sin puntos" error={errors.dni} required>
 *     <Input value={dni} onChange={…} />
 *   </Field>
 *
 *   <Field label="Régimen laboral" error={errors.regimen}>
 *     <Select value={regimen} onValueChange={setRegimen}>
 *       <SelectTrigger><SelectValue placeholder="Elige…" /></SelectTrigger>
 *       <SelectContent>…</SelectContent>
 *     </Select>
 *   </Field>
 *
 *   <Field label="Fecha de ingreso">
 *     {(control) => <MiDatePicker {...control} />}
 *   </Field>
 */

// ─── Estilos compartidos de controles ───────────────────────────────────

/**
 * Base visual común de Input, Textarea y SelectTrigger: mismo radio, borde,
 * fondo y anillo de foco. La altura la pone cada control (h-10 en los de una línea).
 *
 * Borde: `--text-tertiary` al 75 % → ≥ 3:1 contra blanco y contra el canvas
 * claro (WCAG 1.4.11: el contorno identifica el campo); `--border-default`
 * solo daba 1,3:1. En el tema oscuro queda en ~4,3:1.
 *
 * Los colores de borde de foco/error llevan `!` para ganarle siempre al
 * `border-color` que dashboard-light.css pone a los inputs dentro de `main`.
 */
export const fieldControlClassName = cn(
  'w-full rounded-lg border px-3 text-sm',
  'bg-[color:var(--bg-surface)] text-[color:var(--text-primary)]',
  'border-[color:color-mix(in_oklab,var(--text-tertiary)_75%,transparent)]',
  'placeholder:text-[color:var(--text-tertiary)]',
  'transition-[border-color,box-shadow] duration-[var(--motion-micro)] ease-[var(--ease-standard)]',
  'outline-none focus-visible:!border-emerald-500 focus-visible:ring-[3px] focus-visible:ring-emerald-500/25',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-[invalid=true]:!border-[color:var(--status-danger-fg,#9f1239)]',
  'aria-[invalid=true]:focus-visible:!border-[color:var(--status-danger-fg,#9f1239)]',
  'aria-[invalid=true]:focus-visible:ring-[color:var(--status-danger-fg,#9f1239)]/25'
)

/** Tinta de error (`--status-danger-fg`, ≥ 4,5:1 en cada tema). */
const DANGER_TEXT = 'text-[color:var(--status-danger-fg,#9f1239)]'

// ─── Contexto ───────────────────────────────────────────────────────────

export interface FieldContextValue {
  controlId: string
  hintId?: string
  errorId?: string
  invalid: boolean
  required: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

/** Datos del `Field` más cercano, o `null` si el control no está dentro de uno. */
export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext)
}

/** Props de accesibilidad que un control debe recibir para quedar conectado al Field. */
export interface FieldControlProps {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
  'aria-required'?: AriaAttributes['aria-required']
}

/** Props propias del control que se combinan con las del Field (las explícitas ganan). */
export interface FieldControlOwnProps extends FieldControlProps {
  invalid?: boolean
  required?: boolean
}

function mergeIdRefs(...lists: Array<string | undefined>): string | undefined {
  const ids = new Set<string>()
  for (const list of lists) {
    if (!list) continue
    for (const token of list.split(/\s+/)) if (token) ids.add(token)
  }
  return ids.size > 0 ? Array.from(ids).join(' ') : undefined
}

function isAriaTrue(value: unknown): boolean {
  return value === true || value === 'true'
}

/**
 * Combina las props del control con las del Field. Solo devuelve claves con
 * valor, para no pisar con `undefined` lo que ponga una librería (p. ej. Radix).
 */
export function resolveFieldControl(
  ctx: FieldContextValue | null,
  own: FieldControlOwnProps = {}
): { controlProps: FieldControlProps; invalid: boolean } {
  const invalid = Boolean(own.invalid) || isAriaTrue(own['aria-invalid']) || Boolean(ctx?.invalid)
  const required = Boolean(own.required) || isAriaTrue(own['aria-required']) || Boolean(ctx?.required)

  const controlProps: FieldControlProps = {}
  const id = own.id ?? ctx?.controlId
  if (id) controlProps.id = id
  const describedBy = mergeIdRefs(own['aria-describedby'], ctx?.errorId, ctx?.hintId)
  if (describedBy) controlProps['aria-describedby'] = describedBy
  if (invalid) controlProps['aria-invalid'] = true
  else if (own['aria-invalid'] !== undefined) controlProps['aria-invalid'] = own['aria-invalid']
  if (required) controlProps['aria-required'] = true

  return { controlProps, invalid }
}

/**
 * Hook para controles propios: devuelve las props a esparcir en el elemento
 * focusable (`controlProps`), si está en error (`invalid`, útil para estilos)
 * y si está dentro de un Field (`inField`).
 */
export function useFieldControl(own: FieldControlOwnProps = {}) {
  const ctx = useContext(FieldContext)
  const { controlProps, invalid } = resolveFieldControl(ctx, own)
  return { controlProps, invalid, inField: ctx !== null }
}

// ─── Textos de ayuda y error ────────────────────────────────────────────

export function FieldHint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs leading-relaxed text-[color:var(--text-tertiary)]', className)} {...props} />
  )
}

/** Mensaje de error con ícono + texto (el color rojo nunca va solo). */
export function FieldError({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('flex items-start gap-1.5 text-xs font-medium', DANGER_TEXT, className)} {...props}>
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        <span className="sr-only">Error: </span>
        {children}
      </span>
    </p>
  )
}

// ─── Field ──────────────────────────────────────────────────────────────

export interface FieldProps {
  /** Texto de la etiqueta. Si lo dejas vacío, el control necesita su propio `aria-label`. */
  label: ReactNode
  /** Texto de ayuda bajo el control (formato esperado, ejemplo…). */
  hint?: ReactNode
  /** Mensaje de error. Si tiene contenido, el control queda marcado como inválido. */
  error?: ReactNode
  /** Muestra el asterisco y marca `aria-required` en el control. */
  required?: boolean
  /** id del control. Si no lo pasas, se usa el `id` del hijo o uno generado. */
  id?: string
  /** Oculta la etiqueta visualmente pero la deja para lectores de pantalla. */
  hideLabel?: boolean
  className?: string
  labelClassName?: string
  children: ReactNode | ((control: FieldControlProps) => ReactNode)
}

const NATIVE_CONTROLS = new Set(['input', 'select', 'textarea'])

function hasContent(node: ReactNode): boolean {
  return node !== null && node !== undefined && node !== false && node !== true && node !== ''
}

export function Field({
  label,
  hint,
  error,
  required = false,
  id,
  hideLabel = false,
  className,
  labelClassName,
  children,
}: FieldProps) {
  const autoId = useId()
  const childId =
    isValidElement<{ id?: unknown }>(children) && typeof children.props.id === 'string'
      ? children.props.id
      : undefined
  const controlId = id ?? childId ?? `field${autoId}`
  const showHint = hasContent(hint)
  const showError = hasContent(error)
  const hintId = showHint ? `${controlId}-hint` : undefined
  const errorId = showError ? `${controlId}-error` : undefined

  const ctx = useMemo<FieldContextValue>(
    () => ({ controlId, hintId, errorId, invalid: showError, required }),
    [controlId, hintId, errorId, showError, required]
  )

  let control: ReactNode
  if (typeof children === 'function') {
    control = children(resolveFieldControl(ctx).controlProps)
  } else if (
    isValidElement<FieldControlOwnProps>(children) &&
    typeof children.type === 'string' &&
    NATIVE_CONTROLS.has(children.type)
  ) {
    const native = children as ReactElement<FieldControlOwnProps>
    const { controlProps } = resolveFieldControl(ctx, {
      ...native.props,
      // `required` nativo no se toca: solo se refleja como aria-required.
      required: undefined,
    })
    control = cloneElement(native, controlProps)
  } else {
    control = children
  }

  return (
    <FieldContext.Provider value={ctx}>
      <div className={cn('space-y-1.5', className)} data-invalid={showError || undefined}>
        {hasContent(label) ? (
          <label
            htmlFor={controlId}
            className={cn(
              'block text-sm font-medium text-[color:var(--text-primary)]',
              hideLabel && 'sr-only',
              labelClassName
            )}
          >
            {label}
            {required ? (
              <span aria-hidden="true" className={cn('ml-0.5', DANGER_TEXT)}>
                *
              </span>
            ) : null}
          </label>
        ) : null}
        {control}
        {showHint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
        {showError ? <FieldError id={errorId}>{error}</FieldError> : null}
      </div>
    </FieldContext.Provider>
  )
}
