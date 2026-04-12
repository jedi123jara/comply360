/**
 * E2E — Features de COMPLY360 v2.0
 *
 * Validan que los assets PWA, OpenAPI y endpoints de health responden.
 * Los flujos autenticados (subir acta SUNAFIL, ejecutar agentes) requieren
 * credenciales Clerk de prueba — se cubrirán en una suite dedicada.
 */

import { test, expect } from '@playwright/test'

test.describe('v2.0 Public assets', () => {
  test('OpenAPI v1 responde JSON 3.x con paths esperados', async ({ request }) => {
    const res = await request.get('/api/v1/openapi')
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.openapi).toMatch(/^3\./)
    expect(json.info.title).toContain('COMPLY360')
    expect(json.paths['/api/v1/workers']).toBeTruthy()
    expect(json.paths['/api/agents/{slug}/run']).toBeTruthy()
  })

  test('PWA manifest accesible y válido', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest')
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.name).toContain('COMPLY360')
    expect(Array.isArray(json.icons)).toBe(true)
    expect(json.start_url).toBe('/dashboard')
  })

  test('Service worker accesible', async ({ request }) => {
    const res = await request.get('/sw.js')
    expect(res.status()).toBe(200)
    const text = await res.text()
    expect(text).toContain('CACHE_NAME')
    expect(text).toContain('comply360')
  })
})

test.describe('v2.0 Auth-protected endpoints', () => {
  test('agentes requiere auth', async ({ request }) => {
    const res = await request.post('/api/agents/risk-monitor/run', {
      data: { type: 'json' },
    })
    expect([401, 403, 307]).toContain(res.status())
  })

  test('export PLAME requiere auth', async ({ request }) => {
    const res = await request.get('/api/exports/plame?periodo=202604')
    expect([401, 403, 307]).toContain(res.status())
  })

  test('export T-REGISTRO requiere auth', async ({ request }) => {
    const res = await request.get('/api/exports/tregistro?periodo=202604')
    expect([401, 403, 307]).toContain(res.status())
  })
})
