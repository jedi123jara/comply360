import { afterEach, describe, expect, it } from 'vitest'
import { claimStimulus, getActiveStimulus, releaseStimulus } from '../stimulus'

afterEach(() => {
  releaseStimulus('trial-toast')
  releaseStimulus('tour')
  releaseStimulus('celebration')
})

describe('cola de estímulos', () => {
  it('solo un estímulo a la vez', () => {
    expect(claimStimulus('trial-toast')).toBe(true)
    expect(claimStimulus('tour')).toBe(false)
    expect(getActiveStimulus()).toBe('trial-toast')
  })

  it('liberar solo funciona para quien ocupa la cola', () => {
    claimStimulus('tour')
    releaseStimulus('celebration')
    expect(getActiveStimulus()).toBe('tour')
    releaseStimulus('tour')
    expect(getActiveStimulus()).toBeNull()
    expect(claimStimulus('celebration')).toBe(true)
  })

  it('volver a pedir el mismo estímulo no falla', () => {
    expect(claimStimulus('tour')).toBe(true)
    expect(claimStimulus('tour')).toBe(true)
  })
})
