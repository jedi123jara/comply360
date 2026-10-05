'use client'

import { forwardRef, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTerm, glossaryHref, type GlossaryEntry } from '@/lib/glossary'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

/**
 * Glosario vivo.
 *
 *   <Term id="cts">CTS</Term>
 *     Texto con subrayado punteado. Al pasar el mouse, enfocarlo con el
 *     teclado o tocarlo en el celular, abre una tarjeta con: Qué es · Por qué
 *     importa · Ejemplo · Cuándo · Base legal, y el enlace "Ver en el glosario".
 *
 *   <TermHint id="sctr" />
 *     La misma tarjeta, pero con un ícono "?" (para poner junto a un label).
 *
 *   <HelpHint help="cts" />  ó  <HelpHint help="Texto libre" />
 *     Ícono "?" que acepta un id del glosario o un texto simple.
 *
 * Interacción:
 *  - Mouse: se abre al pasar por encima y se cierra al salir (con una pequeña
 *    pausa para poder entrar a la tarjeta y hacer clic en el enlace).
 *  - Teclado: al enfocar se muestra (sin robar el foco). Enter/Espacio la
 *    "fija" y mueve el foco a la tarjeta para llegar al enlace. Escape cierra.
 *  - Toque: un toque la abre fijada; tocar fuera la cierra.
 *
 * Si el id no existe en el glosario, se muestra solo el texto (y se avisa en
 * la consola en desarrollo).
 */

const OPEN_DELAY_MS = 120
const CLOSE_DELAY_MS = 180
/** Tras cerrar, Radix devuelve el foco al disparador: no lo reabrimos por eso. */
const REFOCUS_GUARD_MS = 400

type Mode = 'closed' | 'peek' | 'pinned'

function useHoverPopover() {
  const [mode, setMode] = useState<Mode>('closed')
  const lastModeRef = useRef<Mode>('closed')
  const openTimer = useRef<number | undefined>(undefined)
  const closeTimer = useRef<number | undefined>(undefined)
  const closedAt = useRef(0)
  const contentRef = useRef<HTMLDivElement>(null)

  const open = mode !== 'closed'

  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current)
      window.clearTimeout(closeTimer.current)
    },
    [],
  )

  // Al fijarla (clic, Enter o toque), el foco pasa a la tarjeta para que el
  // enlace "Ver en el glosario" sea alcanzable con Tab.
  useEffect(() => {
    if (mode === 'pinned') contentRef.current?.focus()
  }, [mode])

  function show(next: 'peek' | 'pinned') {
    window.clearTimeout(openTimer.current)
    window.clearTimeout(closeTimer.current)
    lastModeRef.current = next
    setMode(next)
  }

  function hide() {
    window.clearTimeout(openTimer.current)
    window.clearTimeout(closeTimer.current)
    closedAt.current = Date.now()
    setMode('closed')
  }

  function scheduleOpen() {
    window.clearTimeout(closeTimer.current)
    if (open) return
    openTimer.current = window.setTimeout(() => show('peek'), OPEN_DELAY_MS)
  }

  function scheduleClose() {
    window.clearTimeout(openTimer.current)
    if (mode === 'pinned') return
    closeTimer.current = window.setTimeout(hide, CLOSE_DELAY_MS)
  }

  const triggerProps = {
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') scheduleOpen()
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') scheduleClose()
    },
    onFocus: (e: React.FocusEvent<HTMLButtonElement>) => {
      if (open || Date.now() - closedAt.current < REFOCUS_GUARD_MS) return
      // Solo con teclado: el foco que deja un clic de mouse lo maneja onClick.
      let viaKeyboard = true
      try {
        viaKeyboard = e.currentTarget.matches(':focus-visible')
      } catch {
        viaKeyboard = true
      }
      if (viaKeyboard) show('peek')
    },
    onClick: (e: React.MouseEvent) => {
      // Manejamos nosotros el abrir/cerrar (evita el toggle propio de Radix)
      // y evitamos que el clic llegue a tarjetas o filas clicables.
      e.preventDefault()
      e.stopPropagation()
      if (mode === 'pinned') hide()
      else show('pinned')
    },
  }

  const contentProps = {
    ref: contentRef,
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') window.clearTimeout(closeTimer.current)
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') scheduleClose()
    },
    // En modo "vistazo" no se roba el foco al abrir ni al cerrar.
    onOpenAutoFocus: (e: Event) => {
      if (lastModeRef.current !== 'pinned') e.preventDefault()
    },
    onCloseAutoFocus: (e: Event) => {
      if (lastModeRef.current !== 'pinned') e.preventDefault()
    },
  }

  function onOpenChange(next: boolean) {
    // Radix solo nos pide cerrar (Escape, clic o foco fuera). Abrir lo
    // controlan los manejadores de arriba.
    if (!next) hide()
  }

  return { open, onOpenChange, triggerProps, contentProps }
}

function useMissingTermWarning(id: string, entry: GlossaryEntry | undefined) {
  useEffect(() => {
    if (!entry && process.env.NODE_ENV !== 'production') {
      console.warn(`[Term] "${id}" no existe en el glosario (src/lib/glossary.ts). Se muestra solo el texto.`)
    }
  }, [id, entry])
}

// ── Contenido de la tarjeta ──────────────────────────────────────────────────

type DetailField = 'queEs' | 'porQueImporta' | 'ejemplo' | 'cuando' | 'baseLegal'

const FIELD_LABELS: Record<DetailField, string> = {
  queEs: 'Qué es',
  porQueImporta: 'Por qué importa',
  ejemplo: 'Ejemplo',
  cuando: 'Cuándo',
  baseLegal: 'Base legal',
}

const FIELD_ORDER: DetailField[] = ['queEs', 'porQueImporta', 'ejemplo', 'cuando', 'baseLegal']

/**
 * Lista con los campos de una entrada del glosario. Se usa en el popover y en
 * la página de Ayuda, para que la explicación sea la misma en todos lados.
 */
export function TermDetails({
  entry,
  omit = [],
  className,
}: {
  entry: GlossaryEntry
  omit?: DetailField[]
  className?: string
}) {
  const fields = FIELD_ORDER.filter((f) => !omit.includes(f) && entry[f])
  return (
    <dl className={cn('space-y-2', className)}>
      {fields.map((f) => (
        <div key={f}>
          <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
            {FIELD_LABELS[f]}
          </dt>
          <dd
            className={cn(
              'mt-0.5 text-[13px] leading-snug',
              f === 'baseLegal' ? 'text-[color:var(--text-secondary)]' : 'text-[color:var(--text-primary)]',
            )}
          >
            {entry[f]}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function GlossaryCardContent({ entry }: { entry: GlossaryEntry }) {
  return (
    <div className="space-y-3 text-left">
      <p className="text-sm font-semibold leading-snug text-[color:var(--text-primary)]">{entry.term}</p>
      <TermDetails entry={entry} />
      <Link
        href={glossaryHref(entry.id)}
        className="inline-flex items-center gap-1 rounded-md text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        Ver en el glosario
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  )
}

const CONTENT_CLASS = 'w-80 max-w-[calc(100vw-2rem)] p-4 focus:outline-none'

// ── <Term> ───────────────────────────────────────────────────────────────────

export interface TermProps {
  /** Id o alias del glosario (ej. "cts", "SCTR"). */
  id: string
  /** Texto visible. Si se omite, se usa el nombre del término. */
  children?: React.ReactNode
  className?: string
}

export function Term({ id, children, className }: TermProps) {
  const entry = getTerm(id)
  useMissingTermWarning(id, entry)
  const { open, onOpenChange, triggerProps, contentProps } = useHoverPopover()

  if (!entry) return <>{children ?? id}</>

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          {...triggerProps}
          className={cn(
            'inline cursor-help rounded-sm border-0 bg-transparent p-0 text-left [font:inherit] [color:inherit]',
            'underline decoration-dotted decoration-[1.5px] underline-offset-[3px] decoration-[color:var(--text-tertiary)]',
            'hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            open && 'decoration-primary',
            className,
          )}
        >
          {children ?? entry.term}
          <span className="sr-only"> (ver qué significa)</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        {...contentProps}
        side="top"
        collisionPadding={16}
        aria-label={`Qué significa ${entry.term}`}
        className={CONTENT_CLASS}
      >
        <GlossaryCardContent entry={entry} />
      </PopoverContent>
    </Popover>
  )
}

// ── Ícono "?" ────────────────────────────────────────────────────────────────

interface HintButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  open: boolean
}

/**
 * Botón del ícono "?". Reenvía ref y props: `PopoverTrigger asChild` le pasa
 * su ref (para posicionar la tarjeta) y los atributos aria.
 */
const HintButton = forwardRef<HTMLButtonElement, HintButtonProps>(function HintButton(
  { open, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        // El "after" amplía el área táctil sin agrandar el ícono.
        'relative inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full align-middle',
        'text-[color:var(--text-tertiary)] transition-colors hover:text-primary',
        "after:absolute after:-inset-2 after:content-['']",
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        open && 'text-primary',
        className,
      )}
    >
      <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
    </button>
  )
})

export interface TermHintProps {
  /** Id o alias del glosario. */
  id: string
  className?: string
}

/** Ícono "?" que abre la tarjeta del glosario. Útil junto a un label o un título. */
export function TermHint({ id, className }: TermHintProps) {
  const entry = getTerm(id)
  useMissingTermWarning(id, entry)
  const { open, onOpenChange, triggerProps, contentProps } = useHoverPopover()

  if (!entry) return null

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <HintButton aria-label={`Qué es ${entry.term}`} className={className} open={open} {...triggerProps} />
      </PopoverTrigger>
      <PopoverContent
        {...contentProps}
        side="top"
        collisionPadding={16}
        aria-label={`Qué significa ${entry.term}`}
        className={CONTENT_CLASS}
      >
        <GlossaryCardContent entry={entry} />
      </PopoverContent>
    </Popover>
  )
}

export interface HelpHintProps {
  /** Id del glosario (muestra la tarjeta completa) o un texto libre. */
  help: string
  /** Para el nombre accesible: "Ayuda sobre {label}". */
  label?: string
  className?: string
}

/** Ícono "?" que acepta un id del glosario o una explicación en texto simple. */
export function HelpHint({ help, label, className }: HelpHintProps) {
  const entry = getTerm(help)
  const { open, onOpenChange, triggerProps, contentProps } = useHoverPopover()

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <HintButton
          aria-label={label ? `Ayuda sobre ${label}` : entry ? `Qué es ${entry.term}` : 'Ayuda'}
          className={className}
          open={open}
          {...triggerProps}
        />
      </PopoverTrigger>
      <PopoverContent
        {...contentProps}
        side="top"
        collisionPadding={16}
        aria-label={label ? `Ayuda sobre ${label}` : 'Ayuda'}
        className={entry ? CONTENT_CLASS : 'w-72 max-w-[calc(100vw-2rem)] p-3 focus:outline-none'}
      >
        {entry ? (
          <GlossaryCardContent entry={entry} />
        ) : (
          <p className="text-[13px] leading-snug text-[color:var(--text-primary)]">{help}</p>
        )}
      </PopoverContent>
    </Popover>
  )
}
