/**
 * Tests del event bus.
 *
 * Cubre:
 *  - emit retorna antes de que los handlers corran (no bloqueante)
 *  - un handler que tira error NO cancela a los otros
 *  - handlers filtrados por `only` reciben solo eventos de esa lista
 *  - feature flag OFF → no-op pero emit sigue retornando un id
 *  - payload inválido según Zod → handlers no se disparan, log de error
 *  - emit con 0 handlers no explota
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  emit,
  registerHandler,
  listHandlers,
  _resetHandlersForTesting,
  _flushHandlersForTesting,
} from '../bus'

const ORIG_FLAG = process.env.ENABLE_EVENT_BUS

beforeEach(() => {
  _resetHandlersForTesting()
  process.env.ENABLE_EVENT_BUS = 'true'
  vi.restoreAllMocks()
})

afterEach(() => {
  if (ORIG_FLAG === undefined) delete process.env.ENABLE_EVENT_BUS
  else process.env.ENABLE_EVENT_BUS = ORIG_FLAG
})

describe('emit — fan-out básico', () => {
  it('retorna un UUID y permite no tener handlers', () => {
    const id = emit('worker.created', { orgId: 'org1', workerId: 'w1' })
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('llama a los handlers registrados con el evento completo', async () => {
    const spy = vi.fn()
    registerHandler('test', spy)

    emit('worker.created', { orgId: 'org1', workerId: 'w1' })
    await _flushHandlersForTesting()

    expect(spy).toHaveBeenCalledTimes(1)
    const call = spy.mock.calls[0][0]
    expect(call.name).toBe('worker.created')
    expect(call.payload.workerId).toBe('w1')
    expect(call.id).toBeTruthy()
    expect(call.emittedAt).toBeTruthy()
  })

  it('dispara handlers en paralelo (microtasks) — emit retorna inmediato', async () => {
    let handlerStarted = false
    registerHandler('slow', async () => {
      handlerStarted = true
      await new Promise((r) => setTimeout(r, 20))
    })

    emit('worker.created', { orgId: 'org1', workerId: 'w1' })
    // Inmediatamente después de emit, el handler aún no corrió
    expect(handlerStarted).toBe(false)

    await _flushHandlersForTesting()
    expect(handlerStarted).toBe(true)
  })
})

describe('emit — aislamiento de errores', () => {
  it('un handler que tira error NO cancela a los otros', async () => {
    const ok1 = vi.fn()
    const bad = vi.fn(() => {
      throw new Error('boom')
    })
    const ok2 = vi.fn()

    registerHandler('ok1', ok1)
    registerHandler('bad', bad)
    registerHandler('ok2', ok2)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    emit('worker.created', { orgId: 'org1', workerId: 'w1' })
    await _flushHandlersForTesting()

    expect(ok1).toHaveBeenCalled()
    expect(ok2).toHaveBeenCalled()
    expect(bad).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalled()
    const logCall = consoleSpy.mock.calls.find(
      (args) => typeof args[0] === 'string' && args[0].includes('bad'),
    )
    expect(logCall).toBeDefined()
  })

  it('handler async que rechaza NO cancela a los otros', async () => {
    const ok = vi.fn()
    const rejecter = vi.fn(() => Promise.reject(new Error('async boom')))

    registerHandler('reject', rejecter)
    registerHandler('ok', ok)

    vi.spyOn(console, 'error').mockImplementation(() => {})

    emit('worker.created', { orgId: 'org1', workerId: 'w1' })
    await _flushHandlersForTesting()

    expect(rejecter).toHaveBeenCalled()
    expect(ok).toHaveBeenCalled()
  })
})

describe('emit — filtro `only`', () => {
  it('handler con only=["contract.signed"] no recibe worker.created', async () => {
    const spy = vi.fn()
    registerHandler('contracts', spy, ['contract.signed'])

    emit('worker.created', { orgId: 'org1', workerId: 'w1' })
    await _flushHandlersForTesting()
    expect(spy).not.toHaveBeenCalled()

    emit('contract.signed', {
      orgId: 'org1',
      contractId: 'c1',
      signedAt: new Date().toISOString(),
    })
    await _flushHandlersForTesting()
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('emit — feature flag', () => {
  it('con ENABLE_EVENT_BUS off, NO dispara handlers pero retorna id', async () => {
    process.env.ENABLE_EVENT_BUS = 'false'
    const spy = vi.fn()
    registerHandler('test', spy)

    const id = emit('worker.created', { orgId: 'org1', workerId: 'w1' })
    expect(id).toBeTruthy()

    await _flushHandlersForTesting()
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('emit — validación de payload', () => {
  it('paylod sin orgId (requerido por Zod) no dispara handlers', async () => {
    const spy = vi.fn()
    registerHandler('test', spy)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // @ts-expect-error intencional: payload inválido en runtime
    emit('worker.created', { workerId: 'w1' })
    await _flushHandlersForTesting()

    expect(spy).not.toHaveBeenCalled()
  })

  it('evento valido pasa Zod y se despacha', async () => {
    const spy = vi.fn()
    registerHandler('test', spy)

    emit('contract.signed', {
      orgId: 'org1',
      contractId: 'c1',
      signedAt: '2026-04-23T10:00:00Z',
    })
    await _flushHandlersForTesting()

    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('registerHandler / listHandlers', () => {
  it('lista los handlers registrados con su nombre', () => {
    registerHandler('a', () => {})
    registerHandler('b', () => {}, ['worker.created'])

    const list = listHandlers()
    expect(list).toHaveLength(2)
    expect(list[0].name).toBe('a')
    expect(list[0].only).toBeNull()
    expect(list[1].name).toBe('b')
    expect(list[1].only).toEqual(['worker.created'])
  })
})

