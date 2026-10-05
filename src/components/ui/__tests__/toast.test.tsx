// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const sonner = vi.hoisted(() => {
  const fn = vi.fn() as ReturnType<typeof vi.fn> & Record<string, ReturnType<typeof vi.fn>>
  fn.success = vi.fn()
  fn.error = vi.fn()
  fn.warning = vi.fn()
  fn.info = vi.fn()
  fn.dismiss = vi.fn()
  return fn
})

vi.mock('sonner', () => ({ toast: sonner }))

import { ToastProvider, useToast } from '../toast'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useToast (adaptador sobre sonner)', () => {
  it('toast({ type }) llama al método de sonner del mismo tipo', () => {
    const { result } = renderHook(() => useToast())
    const id = result.current.toast({
      title: 'Cálculo guardado',
      description: 'Puedes verlo en tu historial',
      type: 'success',
    })

    expect(typeof id).toBe('string')
    expect(sonner.success).toHaveBeenCalledTimes(1)
    expect(sonner.success).toHaveBeenCalledWith('Cálculo guardado', {
      id,
      description: 'Puedes verlo en tu historial',
      duration: 5000,
    })
  })

  it('usa info por defecto y respeta la duración', () => {
    const { result } = renderHook(() => useToast())
    result.current.toast({ title: 'Hola', duration: 1200 })
    expect(sonner.info).toHaveBeenCalledWith('Hola', expect.objectContaining({ duration: 1200 }))

    result.current.toast({ title: 'Error', type: 'error' })
    result.current.toast({ title: 'Ojo', type: 'warning' })
    expect(sonner.error).toHaveBeenCalledTimes(1)
    expect(sonner.warning).toHaveBeenCalledTimes(1)
  })

  it('dismiss(id) cierra el mismo aviso en sonner', () => {
    const { result } = renderHook(() => useToast())
    const id = result.current.toast({ title: 'Guardando…' })
    result.current.dismiss(id)
    expect(sonner.dismiss).toHaveBeenCalledWith(id)
  })

  it('genera ids distintos para cada aviso', () => {
    const { result } = renderHook(() => useToast())
    const a = result.current.toast({ title: 'A' })
    const b = result.current.toast({ title: 'B' })
    expect(a).not.toBe(b)
  })

  it('devuelve el mismo objeto entre renders (seguro en deps de useCallback/useEffect)', () => {
    const { result, rerender } = renderHook(() => useToast())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
    expect(result.current.toast).toBe(first.toast)
  })

  it('ToastProvider solo renderiza a sus hijos', () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    })
    result.current.toast({ title: 'Dentro del provider', type: 'success' })
    expect(sonner.success).toHaveBeenCalledTimes(1)
  })
})
