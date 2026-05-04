/**
 * Tests del signing HMAC-SHA256 del dispatcher de webhooks.
 *
 * Garantiza que:
 *   1. Mismo body + secret → misma firma (determinismo).
 *   2. Body distinto → firma distinta.
 *   3. Secret distinto → firma distinta.
 *   4. Una receta de verificación documentada en el lado del consumidor
 *      produce el mismo resultado.
 */

import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { signPayload } from '../dispatcher'

const TEST_SECRET = 'whsec_test_abc123def456789012345678901234567890abcd'

describe('signPayload — HMAC-SHA256', () => {
  it('produce firma determinística', () => {
    const body = '{"foo":"bar"}'
    const a = signPayload(body, TEST_SECRET)
    const b = signPayload(body, TEST_SECRET)
    expect(a).toBe(b)
  })

  it('produce 64 caracteres hex', () => {
    const sig = signPayload('{"a":1}', TEST_SECRET)
    expect(sig).toMatch(/^[0-9a-f]{64}$/)
  })

  it('cambia con cuerpo distinto', () => {
    const a = signPayload('{"a":1}', TEST_SECRET)
    const b = signPayload('{"a":2}', TEST_SECRET)
    expect(a).not.toBe(b)
  })

  it('cambia con secret distinto', () => {
    const body = '{"a":1}'
    const a = signPayload(body, 'secret-1')
    const b = signPayload(body, 'secret-2')
    expect(a).not.toBe(b)
  })

  it('un consumidor puede verificar la firma con createHmac', () => {
    // Receta documentada (Node):
    //   const expected = createHmac('sha256', secret).update(body).digest('hex')
    //   if (req.headers['x-comply360-signature'] === `sha256=${expected}`) ...
    const body = '{"event":"worker.created","id":"evt_123"}'
    const ourSig = signPayload(body, TEST_SECRET)
    const expectedConsumer = createHmac('sha256', TEST_SECRET).update(body).digest('hex')
    expect(ourSig).toBe(expectedConsumer)
  })

  it('detecta tampering — body modificado tiene firma distinta', () => {
    const body = '{"event":"worker.created","amount":100}'
    const sig = signPayload(body, TEST_SECRET)
    // Atacante intenta cambiar el amount
    const tampered = '{"event":"worker.created","amount":999}'
    const tamperedSig = signPayload(tampered, TEST_SECRET)
    expect(sig).not.toBe(tamperedSig)
  })
})
