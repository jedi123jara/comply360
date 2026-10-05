import { describe, expect, it } from 'vitest'
import { placeCoachmark } from '../coachmark-position'

const desktop = { width: 1440, height: 900 }
const phone = { width: 375, height: 700 }
const card = { width: 340, height: 200 }

describe('placeCoachmark', () => {
  it('pone la tarjeta a la derecha de un botón angosto del menú lateral', () => {
    const placement = placeCoachmark({ top: 120, left: 12, width: 240, height: 52 }, card, desktop)
    expect(placement).toEqual({ top: 120, left: 264, side: 'right' })
  })

  it('pone la tarjeta debajo de un bloque ancho (la cabecera del panel)', () => {
    const placement = placeCoachmark({ top: 100, left: 300, width: 1100, height: 380 }, card, desktop)
    expect(placement).toEqual({ top: 492, left: 300, side: 'bottom' })
  })

  it('si no entra debajo, va encima', () => {
    const placement = placeCoachmark({ top: 600, left: 300, width: 1100, height: 200 }, card, desktop)
    expect(placement.side).toBe('top')
    expect(placement.top).toBe(600 - 12 - 200)
  })

  it('si no entra ni arriba ni abajo, se apoya abajo de la pantalla', () => {
    const placement = placeCoachmark({ top: 40, left: 0, width: 1440, height: 820 }, card, desktop)
    expect(placement.side).toBe('overlay')
    expect(placement.top).toBe(900 - 200 - 16)
  })

  it('sin objetivo visible (celular con el menú plegado) va centrada abajo', () => {
    const placement = placeCoachmark(null, { width: 343, height: 220 }, phone)
    expect(placement.side).toBe('center')
    expect(placement.left).toBe(16)
    expect(placement.top).toBe(700 - 220 - 32)
  })

  it('nunca se sale de la pantalla por los costados', () => {
    const placement = placeCoachmark({ top: 100, left: 1300, width: 900, height: 100 }, card, desktop)
    expect(placement.left).toBeLessThanOrEqual(desktop.width - card.width - 16)
    expect(placement.left).toBeGreaterThanOrEqual(16)
  })
})
