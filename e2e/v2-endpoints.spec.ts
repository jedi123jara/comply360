/**
 * E2E — Endpoints protegidos de v2.0 (marketplace, white-label, teletrabajo,
 * casilla SUNAFIL, asistencia, exports). Todos deben devolver 401/403/307 sin
 * auth. Los flujos autenticados (Clerk) requieren credenciales de prueba y
 * se cubrirán en una suite aparte.
 */

import { test, expect } from '@playwright/test'

test.describe('v2.0 endpoints requieren auth', () => {
  const protectedEndpoints = [
    { method: 'GET' as const, url: '/api/integrations/catalog' },
    { method: 'GET' as const, url: '/api/tenancy/white-label' },
    { method: 'GET' as const, url: '/api/tenancy/consultor' },
    { method: 'GET' as const, url: '/api/teletrabajo/summary' },
    { method: 'GET' as const, url: '/api/teletrabajo/policy' },
    { method: 'GET' as const, url: '/api/teletrabajo/logs' },
    { method: 'GET' as const, url: '/api/casilla/notifications' },
    { method: 'GET' as const, url: '/api/attendance/fences' },
    { method: 'GET' as const, url: '/api/compliance/pay-equity' },
    { method: 'GET' as const, url: '/api/agents/templates' },
    { method: 'POST' as const, url: '/api/attendance/check-in' },
    { method: 'POST' as const, url: '/api/notifications/send' },
    { method: 'POST' as const, url: '/api/agents/risk-monitor/run' },
  ]

  for (const ep of protectedEndpoints) {
    test(`${ep.method} ${ep.url} devuelve 401/403/307`, async ({ request }) => {
      const res =
        ep.method === 'GET'
          ? await request.get(ep.url)
          : await request.post(ep.url, { data: {} })
      expect([401, 403, 307]).toContain(res.status())
    })
  }
})

test.describe('Webhook casilla SUNAFIL rechaza sin secret', () => {
  test('POST sin Authorization devuelve 401', async ({ request }) => {
    const res = await request.post('/api/webhooks/casilla', {
      data: {
        orgId: 'test',
        numeroOficial: 'SF-001',
        fechaNotificacion: '2026-04-08',
        asunto: 'test',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('POST con Authorization inválido devuelve 401', async ({ request }) => {
    const res = await request.post('/api/webhooks/casilla', {
      headers: { authorization: 'Bearer wrong' },
      data: {},
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('Verificación pública de firma PKI', () => {
  test('GET /api/signatures/pki/verify/[id] devuelve JSON aunque la firma no exista', async ({
    request,
  }) => {
    const res = await request.get('/api/signatures/pki/verify/sig_nonexistent')
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.valid).toBe(false)
    expect(Array.isArray(json.invalidReasons)).toBe(true)
  })
})
