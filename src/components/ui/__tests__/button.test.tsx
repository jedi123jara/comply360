// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRef } from 'react'
import { render } from '@testing-library/react'
import { Button } from '../button'

function Icon() {
  return <svg aria-hidden="true" />
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Button: aviso de botón solo-ícono sin nombre', () => {
  it('avisa una sola vez por botón aunque se vuelva a renderizar', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = render(
      <Button size="icon">
        <Icon />
      </Button>
    )
    rerender(
      <Button size="icon" variant="ghost">
        <Icon />
      </Button>
    )
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('aria-label')
  })

  it('también avisa si no es size="icon" pero no tiene texto', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Button size="sm">
        <Icon />
      </Button>
    )
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['aria-label', <Button key="a" size="icon" aria-label="Cerrar"><Icon /></Button>],
    ['aria-labelledby', <Button key="b" size="icon" aria-labelledby="x"><Icon /></Button>],
    ['title', <Button key="c" size="icon-sm" title="Cerrar"><Icon /></Button>],
    ['texto sr-only', <Button key="d" size="icon"><Icon /><span className="sr-only">Cerrar</span></Button>],
    ['texto visible', <Button key="e">Guardar</Button>],
  ])('no avisa con %s', (_name, element) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(element)
    expect(warn).not.toHaveBeenCalled()
  })

  it('el texto bajo aria-hidden no cuenta como nombre', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Button size="icon">
        <span aria-hidden="true">×</span>
      </Button>
    )
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('sigue reenviando el ref al <button>', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Guardar</Button>)
    expect(ref.current?.tagName).toBe('BUTTON')
  })
})
