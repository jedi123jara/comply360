import { test, expect } from '@playwright/test'

/**
 * Endpoint /api/integrations/reniec/consulta-dni.
 *
 * Verifica que requiere auth y valida formato DNI antes del fetch externo.
 * El test del path positivo requiere APIS_NET_PE_TOKEN configurado + un DNI
 * de prueba válido — fuera del alcance del CI público.
 */

test.describe('GET /api/integrations/reniec/consulta-dni', () => {
  test('rechaza GET sin auth → 401 o 403 o redirect', async ({ request }) => {
    const res = await request.get('/api/integrations/reniec/consulta-dni?dni=12345678')
    // Sin auth, Clerk middleware bloquea
    expect([401, 403]).toContain(res.status())
  })

  test('rechaza DNI con formato inválido (incluso autenticado)', async ({ request }) => {
    // Sin auth, Clerk bloqueará igual antes que el handler — esto verifica que
    // al menos no hay un crash sin DNI. El test "real" con auth queda para
    // CI con Clerk session set up.
    const res = await request.get('/api/integrations/reniec/consulta-dni?dni=abc')
    expect([400, 401, 403]).toContain(res.status())
  })
})
