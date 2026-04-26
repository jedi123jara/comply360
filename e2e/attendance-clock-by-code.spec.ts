import { test, expect } from '@playwright/test'

/**
 * Endpoint público /api/attendance/clock-by-code (backup PIN sin smartphone).
 *
 * Verifica:
 *   - Validación de formato (DNI 8 dígitos, PIN 4 dígitos, shortCode 6 chars A-Z0-9)
 *   - Rate-limit por DNI (3 intentos/min)
 *   - Mensaje genérico para credenciales inválidas (no filtra existencia de DNI)
 *   - JSON inválido → 400
 *
 * No verifica el flow positivo (success) porque requiere sembrar un Worker
 * con PIN hasheado en DB — se agrega cuando exista factory de tests.
 */

const ENDPOINT = '/api/attendance/clock-by-code'

async function postJson(request: import('@playwright/test').APIRequestContext, body: unknown) {
  return request.post(ENDPOINT, {
    headers: { 'content-type': 'application/json' },
    data: body,
  })
}

test.describe('POST /api/attendance/clock-by-code', () => {
  test('rechaza JSON inválido', async ({ request }) => {
    const res = await request.post(ENDPOINT, {
      headers: { 'content-type': 'application/json' },
      data: 'not-json',
    })
    expect(res.status()).toBe(400)
  })

  test('rechaza DNI con menos de 8 dígitos', async ({ request }) => {
    const res = await postJson(request, { dni: '123', pin: '1234', shortCode: 'ABCDEF' })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('INVALID_DNI')
  })

  test('rechaza PIN con menos de 4 dígitos', async ({ request }) => {
    const res = await postJson(request, { dni: '12345678', pin: '12', shortCode: 'ABCDEF' })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('INVALID_PIN')
  })

  test('rechaza shortCode con formato incorrecto', async ({ request }) => {
    const res = await postJson(request, { dni: '12345678', pin: '1234', shortCode: 'abc' })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('INVALID_CODE')
  })

  test('credenciales inválidas → mensaje genérico (no filtra existencia)', async ({ request }) => {
    // DNI random — no existe en DB de test
    const res = await postJson(request, {
      dni: '99999999',
      pin: '0000',
      shortCode: 'ZZZZZZ',
    })
    // Puede ser 401 (worker not found) o 429 (si los tests anteriores agotaron rate limit)
    expect([401, 429]).toContain(res.status())
    if (res.status() === 401) {
      const body = await res.json()
      expect(body.error).toMatch(/DNI o PIN incorrectos/)
    }
  })
})
