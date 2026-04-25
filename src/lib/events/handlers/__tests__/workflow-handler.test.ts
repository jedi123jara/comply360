/**
 * Tests de la lógica pura del workflow-handler.
 *
 * Los tests de DB (matching de workflows, idempotencia real via unique
 * constraint, retry behavior) viven en los integration tests — se corren
 * contra una DB efímera de test. Acá solo probamos `computeIdempotencyKey`.
 */

import { describe, expect, it } from 'vitest'
import { computeIdempotencyKey } from '../workflow-handler'

describe('computeIdempotencyKey', () => {
  it('misma entrada → mismo hash (determinístico)', () => {
    const at = new Date('2026-04-23T15:30:42Z')
    const a = computeIdempotencyKey({
      workflowId: 'wf1',
      eventName: 'worker.created',
      entityId: 'worker1',
      emittedAt: at,
    })
    const b = computeIdempotencyKey({
      workflowId: 'wf1',
      eventName: 'worker.created',
      entityId: 'worker1',
      emittedAt: at,
    })
    expect(a).toBe(b)
  })

  it('distintos workflows → distintos hashes', () => {
    const at = new Date('2026-04-23T15:30:42Z')
    const a = computeIdempotencyKey({
      workflowId: 'wf1',
      eventName: 'worker.created',
      entityId: 'worker1',
      emittedAt: at,
    })
    const b = computeIdempotencyKey({
      workflowId: 'wf2',
      eventName: 'worker.created',
      entityId: 'worker1',
      emittedAt: at,
    })
    expect(a).not.toBe(b)
  })

  it('distintas entidades → distintos hashes', () => {
    const at = new Date('2026-04-23T15:30:42Z')
    const a = computeIdempotencyKey({
      workflowId: 'wf1',
      eventName: 'worker.created',
      entityId: 'worker1',
      emittedAt: at,
    })
    const b = computeIdempotencyKey({
      workflowId: 'wf1',
      eventName: 'worker.created',
      entityId: 'worker2',
      emittedAt: at,
    })
    expect(a).not.toBe(b)
  })

  it('dentro del mismo minuto → mismo hash (idempotencia de retries)', () => {
    const t1 = new Date('2026-04-23T15:30:05Z')
    const t2 = new Date('2026-04-23T15:30:55Z')
    const a = computeIdempotencyKey({
      workflowId: 'wf1',
      eventName: 'worker.created',
      entityId: 'worker1',
      emittedAt: t1,
    })
    const b = computeIdempotencyKey({
      workflowId: 'wf1',
      eventName: 'worker.created',
      entityId: 'worker1',
      emittedAt: t2,
    })
    expect(a).toBe(b)
  })

  it('cruzando la frontera de minuto → distinto hash', () => {
    const t1 = new Date('2026-04-23T15:30:59Z')
    const t2 = new Date('2026-04-23T15:31:01Z')
    const a = computeIdempotencyKey({
      workflowId: 'wf1',
      eventName: 'worker.created',
      entityId: 'worker1',
      emittedAt: t1,
    })
    const b = computeIdempotencyKey({
      workflowId: 'wf1',
      eventName: 'worker.created',
      entityId: 'worker1',
      emittedAt: t2,
    })
    expect(a).not.toBe(b)
  })

  it('output tiene longitud fija de 32 caracteres hex', () => {
    const key = computeIdempotencyKey({
      workflowId: 'wf1',
      eventName: 'worker.created',
      entityId: 'w1',
      emittedAt: new Date(),
    })
    expect(key).toHaveLength(32)
    expect(key).toMatch(/^[0-9a-f]{32}$/)
  })
})
