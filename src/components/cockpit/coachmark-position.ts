/**
 * Dónde poner la tarjeta de una marca guía (coachmark) respecto del elemento
 * que señala. Función pura: recibe medidas y devuelve coordenadas `fixed`.
 *
 * Preferencias, en orden:
 *  1. A la derecha, si el objetivo es angosto (p. ej. un botón del menú lateral).
 *  2. Debajo.
 *  3. Encima.
 *  4. Abajo de la pantalla, encima del objetivo (pantallas muy chicas).
 * Sin objetivo visible (p. ej. el menú lateral está oculto en el celular), la
 * tarjeta va centrada abajo, sin resaltar nada.
 */

export interface Box {
  top: number
  left: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export type CoachmarkSide = 'right' | 'bottom' | 'top' | 'overlay' | 'center'

export interface CoachmarkPlacement {
  top: number
  left: number
  side: CoachmarkSide
}

const MARGIN = 16
const GAP = 12

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

export function placeCoachmark(target: Box | null, card: Size, viewport: Size): CoachmarkPlacement {
  const maxLeft = viewport.width - card.width - MARGIN
  const maxTop = viewport.height - card.height - MARGIN

  if (!target) {
    return {
      top: clamp(viewport.height - card.height - MARGIN * 2, MARGIN, maxTop),
      left: clamp((viewport.width - card.width) / 2, MARGIN, maxLeft),
      side: 'center',
    }
  }

  const right = target.left + target.width
  const bottom = target.top + target.height
  const isNarrow = target.width <= viewport.width * 0.4

  if (isNarrow && right + GAP + card.width + MARGIN <= viewport.width) {
    return {
      top: clamp(target.top, MARGIN, maxTop),
      left: right + GAP,
      side: 'right',
    }
  }

  if (bottom + GAP + card.height + MARGIN <= viewport.height) {
    return {
      top: bottom + GAP,
      left: clamp(target.left, MARGIN, maxLeft),
      side: 'bottom',
    }
  }

  if (target.top - GAP - card.height >= MARGIN) {
    return {
      top: target.top - GAP - card.height,
      left: clamp(target.left, MARGIN, maxLeft),
      side: 'top',
    }
  }

  return {
    top: clamp(maxTop, MARGIN, maxTop),
    left: clamp(target.left, MARGIN, maxLeft),
    side: 'overlay',
  }
}
