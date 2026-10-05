import { describe, it, expect } from 'vitest'
import { DEFAULT_PROFILE_TAB, PROFILE_TABS, resolveProfileTab } from '../profile/profile-tabs'

describe('resolveProfileTab', () => {
  it('sin parámetro abre la pestaña por defecto', () => {
    expect(resolveProfileTab(null)).toBe(DEFAULT_PROFILE_TAB)
    expect(resolveProfileTab('')).toBe(DEFAULT_PROFILE_TAB)
  })

  it('acepta todas las pestañas reales', () => {
    for (const tab of PROFILE_TABS) expect(resolveProfileTab(tab)).toBe(tab)
  })

  it('redirige "alertas" a Información (donde se muestran las alertas activas)', () => {
    expect(resolveProfileTab('alertas')).toBe('info')
  })

  it('ignora mayúsculas y espacios', () => {
    expect(resolveProfileTab(' Legajo ')).toBe('legajo')
  })

  it('un valor desconocido cae en la pestaña por defecto', () => {
    expect(resolveProfileTab('no-existe')).toBe(DEFAULT_PROFILE_TAB)
  })
})
