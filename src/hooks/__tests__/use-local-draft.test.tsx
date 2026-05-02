// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLocalDraft } from '../use-local-draft'

interface TestDraft {
  step: string
  value: number
}

describe('useLocalDraft', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('no carga draft cuando no hay orgId', () => {
    const { result } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: null })
    )
    expect(result.current.draft).toBeNull()
    expect(result.current.restoredAt).toBeNull()
  })

  it('persiste y restaura un draft con TTL valido', () => {
    const { result, rerender } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: 'org_1', debounceMs: 100 })
    )

    act(() => {
      result.current.save({ step: 'form', value: 42 })
      vi.advanceTimersByTime(150)
    })

    // Re-mount: debe restaurar
    const { result: result2 } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: 'org_1' })
    )
    expect(result2.current.draft).toEqual({ step: 'form', value: 42 })
    expect(result2.current.restoredAt).toBeInstanceOf(Date)
  })

  it('clear borra el draft inmediatamente', () => {
    const { result } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: 'org_1', debounceMs: 100 })
    )
    act(() => {
      result.current.save({ step: 'form', value: 42 })
      vi.advanceTimersByTime(150)
    })

    act(() => {
      result.current.clear()
    })

    const { result: result2 } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: 'org_1' })
    )
    expect(result2.current.draft).toBeNull()
  })

  it('no comparte drafts entre orgIds distintos', () => {
    const { result: r1 } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: 'org_a', debounceMs: 100 })
    )
    act(() => {
      r1.current.save({ step: 'form', value: 1 })
      vi.advanceTimersByTime(150)
    })

    const { result: r2 } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: 'org_b' })
    )
    expect(r2.current.draft).toBeNull()
  })

  it('descarta drafts expirados (TTL)', () => {
    const { result } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: 'org_1', debounceMs: 100, ttlDays: 1 })
    )
    act(() => {
      result.current.save({ step: 'form', value: 99 })
      vi.advanceTimersByTime(150)
    })

    // Avanzar 2 dias
    act(() => {
      vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000)
    })

    const { result: result2 } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: 'org_1' })
    )
    expect(result2.current.draft).toBeNull()
  })

  it('descarta drafts con version de formato distinta', () => {
    // Simular un draft viejo con v=99
    window.localStorage.setItem(
      'comply360:test:v1:org_1',
      JSON.stringify({
        v: 99,
        savedAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        data: { step: 'old', value: 1 },
      })
    )
    const { result } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: 'org_1' })
    )
    expect(result.current.draft).toBeNull()
    expect(window.localStorage.getItem('comply360:test:v1:org_1')).toBeNull()
  })

  it('debounce: writes consecutivos solo persisten el ultimo', () => {
    const { result } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: 'org_1', debounceMs: 500 })
    )
    act(() => {
      result.current.save({ step: 'a', value: 1 })
      vi.advanceTimersByTime(100)
      result.current.save({ step: 'b', value: 2 })
      vi.advanceTimersByTime(100)
      result.current.save({ step: 'c', value: 3 })
      vi.advanceTimersByTime(600)
    })

    const { result: result2 } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: 'org_1' })
    )
    expect(result2.current.draft).toEqual({ step: 'c', value: 3 })
  })

  it('save(null) borra el draft tras el debounce', () => {
    const { result } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: 'org_1', debounceMs: 100 })
    )
    act(() => {
      result.current.save({ step: 'form', value: 7 })
      vi.advanceTimersByTime(150)
    })

    act(() => {
      result.current.save(null)
      vi.advanceTimersByTime(150)
    })

    const { result: result2 } = renderHook(() =>
      useLocalDraft<TestDraft>({ key: 'test', orgId: 'org_1' })
    )
    expect(result2.current.draft).toBeNull()
  })
})
