'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { placeCoachmark, type Box, type CoachmarkPlacement } from '@/components/cockpit/coachmark-position'
import { readStoredValue, useStoredValue, writeStoredValue } from '@/components/cockpit/local-store'
import { claimStimulus, releaseStimulus } from '@/components/cockpit/stimulus'

/**
 * WelcomeTour — recorrido de 3 marcas guía sobre la interfaz real.
 *
 * Señala, en orden:
 *  1. El botón «¿Qué quieres hacer?» del menú lateral.
 *  2. La cabecera del panel con las 3 preguntas (`[data-tour="panel-cabecera"]`).
 *  3. «Pendientes» en el menú lateral.
 *
 * El menú lateral no tiene atributos `data-tour` (es de otro equipo), así que
 * lo ubicamos dentro de `aside[data-dashboard-sidebar]`: «Pendientes» por su
 * enlace (`href="/dashboard/plan-accion"`) y «¿Qué quieres hacer?» por su texto
 * (es el único botón del menú con esa frase). Si el objetivo no está a la
 * vista —en el celular el menú está plegado— la tarjeta aparece abajo, sin
 * resaltar nada, y explica dónde encontrarlo.
 *
 * Se muestra una sola vez por navegador (localStorage) y no bloquea la
 * pantalla: se puede seguir usando el panel con el recorrido abierto.
 */

const STORAGE_KEY = 'comply360.tour.coachmarks.v1'
const START_DELAY_MS = 700
const CARD_WIDTH = 340
const SPOTLIGHT_PADDING = 6

interface TourStep {
  id: string
  title: string
  body: string
  /** Texto cuando el objetivo no está a la vista (menú lateral plegado en el celular). */
  fallbackBody: string
  findTarget: () => HTMLElement | null
}

function sidebar(): HTMLElement | null {
  return document.querySelector<HTMLElement>('aside[data-dashboard-sidebar]')
}

function findSidebarButtonByText(text: string): HTMLElement | null {
  const root = sidebar()
  if (!root) return null
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
  return buttons.find((button) => button.textContent?.includes(text)) ?? null
}

const STEPS: TourStep[] = [
  {
    id: 'que-quieres-hacer',
    title: '¿No sabes por dónde empezar?',
    body: 'Toca «¿Qué quieres hacer?» y elige lo que necesitas: contratar a alguien, renovar un contrato o prepararte para SUNAFIL. Te guiamos paso a paso.',
    fallbackBody:
      'Abre el menú (☰, arriba a la izquierda) y toca «¿Qué quieres hacer?». Eliges lo que necesitas —contratar a alguien, renovar un contrato, prepararte para SUNAFIL— y te guiamos paso a paso.',
    findTarget: () => findSidebarButtonByText('¿Qué quieres hacer?'),
  },
  {
    id: 'cabecera',
    title: 'Tu empresa en tres preguntas',
    body: 'Aquí ves cómo estás, cuánto te pueden multar y qué hacer hoy. Se actualiza cada vez que avanzas.',
    fallbackBody:
      'Al inicio del panel ves cómo estás, cuánto te pueden multar y qué hacer hoy. Se actualiza cada vez que avanzas.',
    findTarget: () => document.querySelector<HTMLElement>('[data-tour="panel-cabecera"]'),
  },
  {
    id: 'pendientes',
    title: 'Todo lo que falta, en un solo lugar',
    body: '«Pendientes», en el menú, reúne tus tareas y alertas ordenadas por urgencia. Cada una que resuelves baja lo que te podrían multar.',
    fallbackBody:
      'Abre el menú (☰, arriba a la izquierda) y entra a «Pendientes»: ahí están tus tareas y alertas, ordenadas por urgencia. Cada una que resuelves baja lo que te podrían multar.',
    findTarget: findPendientesTarget,
  },
]

/**
 * «Pendientes» en el menú lateral. Si su grupo está plegado (contenido
 * `inert`), señalamos el botón que despliega ese grupo.
 */
function findPendientesTarget(): HTMLElement | null {
  const root = sidebar()
  const link = root?.querySelector<HTMLElement>('a[href="/dashboard/plan-accion"]') ?? null
  if (!root || !link) return null
  const collapsedPanel = link.closest<HTMLElement>('[inert]')
  if (!collapsedPanel) return link
  if (!collapsedPanel.id) return null
  return root.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(collapsedPanel.id)}"]`)
}

function isVisible(el: HTMLElement): boolean {
  // Un grupo plegado del menú es `inert`: su contenido existe pero no se ve.
  if (el.closest('[inert]')) return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

interface TourLayout {
  target: Box | null
  placement: CoachmarkPlacement
  width: number
}

export interface WelcomeTourProps {
  /** Se llama cuando el recorrido termina, se salta o no corresponde mostrarlo. */
  onDone?: () => void
}

export function WelcomeTour({ onDone }: WelcomeTourProps) {
  const seen = useStoredValue(STORAGE_KEY)
  const [stepIndex, setStepIndex] = useState<number | null>(null)
  const [settled, setSettled] = useState(false)
  const [layout, setLayout] = useState<TourLayout | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const onDoneRef = useRef(onDone)
  const titleId = useId()
  const bodyId = useId()

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  // ¿Corresponde mostrarlo? Se decide una sola vez, cuando ya se leyó la marca.
  useEffect(() => {
    if (settled || stepIndex !== null || seen === undefined) return
    const timer = window.setTimeout(
      () => {
        if (seen !== null || !claimStimulus('tour')) {
          // Ya lo vio, o hay otro aviso en pantalla: no insistimos ahora.
          setSettled(true)
          onDoneRef.current?.()
          return
        }
        // Se marca al empezar: aunque salga a otra pantalla a mitad del
        // recorrido, no se lo volvemos a mostrar.
        writeStoredValue(STORAGE_KEY, '1')
        if (readStoredValue(STORAGE_KEY) !== '1') {
          // Almacenamiento bloqueado: no podríamos recordar que ya lo vio y
          // saldría en cada visita. Mejor no mostrarlo.
          releaseStimulus('tour')
          setSettled(true)
          onDoneRef.current?.()
          return
        }
        returnFocusRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null
        setStepIndex(0)
      },
      seen !== null ? 0 : START_DELAY_MS,
    )
    return () => window.clearTimeout(timer)
  }, [seen, settled, stepIndex])

  // Si el panel se desmonta con el recorrido abierto, liberamos la cola.
  useEffect(() => () => releaseStimulus('tour'), [])

  const finish = useCallback(() => {
    setStepIndex(null)
    setLayout(null)
    setSettled(true)
    releaseStimulus('tour')
    const previous = returnFocusRef.current
    if (previous && previous.isConnected && previous !== document.body) {
      previous.focus({ preventScroll: true })
    }
    onDoneRef.current?.()
  }, [])

  const next = useCallback(() => {
    setStepIndex((current) => {
      if (current === null) return current
      return current < STEPS.length - 1 ? current + 1 : current
    })
  }, [])

  const compute = useCallback(() => {
    if (stepIndex === null) return
    const el = STEPS[stepIndex].findTarget()
    const rect = el && isVisible(el) ? el.getBoundingClientRect() : null
    const target: Box | null = rect
      ? {
          top: rect.top - SPOTLIGHT_PADDING,
          left: rect.left - SPOTLIGHT_PADDING,
          width: rect.width + SPOTLIGHT_PADDING * 2,
          height: rect.height + SPOTLIGHT_PADDING * 2,
        }
      : null
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const width = Math.min(CARD_WIDTH, viewport.width - 32)
    const height = cardRef.current?.offsetHeight || 220
    setLayout({ target, placement: placeCoachmark(target, { width, height }, viewport), width })
  }, [stepIndex])

  // Por paso: llevar el objetivo a la vista y seguirlo al hacer scroll o
  // cambiar el tamaño de la ventana.
  useEffect(() => {
    if (stepIndex === null) return
    const el = STEPS[stepIndex].findTarget()
    if (el && isVisible(el)) {
      el.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
    }

    let frame = window.requestAnimationFrame(compute)
    const schedule = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(compute)
    }
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
    if (observer && cardRef.current) observer.observe(cardRef.current)
    // Tras el scroll suave, una última medición.
    const settle = window.setTimeout(schedule, 400)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(settle)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
      observer?.disconnect()
    }
  }, [stepIndex, compute])

  // El foco va al título de cada paso cuando la tarjeta ya está ubicada
  // (antes es invisible y no puede recibir foco).
  const hasLayout = layout !== null
  useEffect(() => {
    if (stepIndex === null || !hasLayout) return
    titleRef.current?.focus({ preventScroll: true })
  }, [stepIndex, hasLayout])

  // Escape salta el recorrido.
  useEffect(() => {
    if (stepIndex === null) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented) finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stepIndex, finish])

  if (stepIndex === null) return null

  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1
  const target = layout?.target ?? null

  // En un portal al <body>: el contenedor de la página tiene transform/
  // will-change (animación de entrada), que encerraría a los `fixed` y los
  // dejaría debajo del menú lateral.
  return createPortal(
    <>
      {target ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[var(--z-modal)] rounded-2xl ring-2 ring-blue-500"
          style={{
            top: target.top,
            left: target.left,
            width: target.width,
            height: target.height,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.42)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[var(--z-modal)] bg-slate-900/25" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="c360-anim-scale-in fixed z-[var(--z-modal)] rounded-2xl border border-blue-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.22)]"
        style={{
          top: layout?.placement.top ?? 0,
          left: layout?.placement.left ?? 0,
          width: layout?.width ?? CARD_WIDTH,
          visibility: layout ? 'visible' : 'hidden',
        }}
      >
        <p className="text-xs font-semibold text-blue-700">
          Recorrido rápido · Paso {stepIndex + 1} de {STEPS.length}
        </p>
        <h2
          ref={titleRef}
          id={titleId}
          tabIndex={-1}
          className="mt-1.5 text-base font-bold text-[color:var(--text-primary)] focus:outline-none"
        >
          {step.title}
        </h2>
        <p id={bodyId} className="mt-1.5 text-sm leading-6 text-[color:var(--text-secondary)]">
          {target ? step.body : step.fallbackBody}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {STEPS.map((item, index) => (
              <span
                key={item.id}
                className={cn(
                  'h-1.5 rounded-full transition-[width,background-color] duration-200',
                  index === stepIndex ? 'w-6 bg-blue-600' : index < stepIndex ? 'w-1.5 bg-blue-300' : 'w-1.5 bg-slate-200'
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isLast ? (
              <button
                type="button"
                onClick={finish}
                className="rounded-lg px-2.5 py-2 text-sm font-medium text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Saltar
              </button>
            ) : null}
            <button
              type="button"
              onClick={isLast ? finish : next}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {isLast ? 'Entendido' : 'Siguiente'}
              {!isLast ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
