#!/usr/bin/env node
/**
 * Smoke test programático.
 *
 * Verifica rápidamente que la app está viva y los endpoints/rutas críticos
 * responden con el status correcto. Pensado para correr post-deploy contra
 * staging o producción.
 *
 * Uso:
 *   npm run smoke                                  # default contra http://localhost:3000
 *   BASE_URL=https://comply360.pe npm run smoke    # contra producción
 *
 * Output: tabla en stdout + exit code != 0 si alguna verificación falla.
 */

import process from 'node:process'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const TIMEOUT_MS = 10_000

// Cada check: { name, method, path, expectedStatus | expectedStatuses, description }
const CHECKS = [
  // ── Páginas públicas ────────────────────────────────────────────────
  { name: 'Landing', method: 'GET', path: '/', expectedStatus: 200 },
  { name: 'Hub Calculadoras', method: 'GET', path: '/calculadoras', expectedStatus: 200 },
  { name: 'Calculadora CTS', method: 'GET', path: '/calculadoras/cts', expectedStatus: 200 },
  { name: 'Calculadora Gratificación', method: 'GET', path: '/calculadoras/gratificacion', expectedStatus: 200 },
  { name: 'Calculadora Multa SUNAFIL', method: 'GET', path: '/calculadoras/multa-sunafil', expectedStatus: 200 },
  { name: 'Pricing', method: 'GET', path: '/planes', expectedStatus: 200 },
  { name: 'Diagnóstico gratis', method: 'GET', path: '/diagnostico-gratis', expectedStatus: 200 },
  { name: 'Recursos (blog)', method: 'GET', path: '/recursos', expectedStatus: 200 },

  // ── Páginas legales (no-index pero deben responder 200) ────────────
  { name: 'Privacidad trabajador', method: 'GET', path: '/legal/privacidad-trabajador', expectedStatus: 200 },
  { name: 'AUP', method: 'GET', path: '/legal/aup', expectedStatus: 200 },
  { name: 'DPA', method: 'GET', path: '/legal/dpa', expectedStatus: 200 },

  // ── Rutas que requieren auth → deben redirigir a sign-in (no 500) ──
  { name: 'Dashboard sin auth → redirect', method: 'GET', path: '/dashboard', expectedStatuses: [200, 307, 308] },
  { name: '/mi-portal sin auth → redirect', method: 'GET', path: '/mi-portal', expectedStatuses: [200, 307, 308] },
  { name: '/admin sin auth → redirect', method: 'GET', path: '/admin', expectedStatuses: [200, 307, 308] },

  // ── APIs públicas / health ──────────────────────────────────────────
  { name: 'Health endpoint', method: 'GET', path: '/api/health', expectedStatus: 200 },

  // ── APIs protegidas → deben retornar 401/403 (no 500) ──────────────
  { name: 'API workers sin auth → 401', method: 'GET', path: '/api/workers', expectedStatuses: [401, 403, 307, 308] },
  { name: 'API attendance qr-token → 401', method: 'GET', path: '/api/attendance/qr-token', expectedStatuses: [401, 403, 307, 308] },
  { name: 'API ai-chat sin auth → 401', method: 'POST', path: '/api/ai-chat', expectedStatuses: [401, 403, 405, 307, 308] },
  { name: 'API integrations RENIEC sin auth → 401', method: 'GET', path: '/api/integrations/reniec/consulta-dni?dni=12345678', expectedStatuses: [401, 403, 307, 308] },
  { name: 'API feedback NPS sin auth → 401', method: 'GET', path: '/api/feedback/nps', expectedStatuses: [401, 403, 307, 308] },
  { name: 'API me/orgs sin auth → 401', method: 'GET', path: '/api/me/orgs', expectedStatuses: [401, 403, 307, 308] },

  // ── APIs públicas con validación de input ──────────────────────────
  {
    name: 'API clock-by-code valida DNI inválido → 400',
    method: 'POST',
    path: '/api/attendance/clock-by-code',
    body: { dni: '123', pin: '1234', shortCode: 'ABCDEF' },
    expectedStatus: 400,
  },

  // ── SEO: sitemap y robots ──────────────────────────────────────────
  { name: 'Sitemap', method: 'GET', path: '/sitemap.xml', expectedStatus: 200 },
  { name: 'robots.txt', method: 'GET', path: '/robots.txt', expectedStatus: 200 },
]

async function checkOne(check) {
  const url = `${BASE_URL}${check.path}`
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const init = {
      method: check.method,
      headers: { 'content-type': 'application/json' },
      redirect: 'manual', // queremos ver redirects sin seguirlos
      signal: controller.signal,
    }
    if (check.body) init.body = JSON.stringify(check.body)
    const res = await fetch(url, init)
    clearTimeout(timer)
    const elapsed = Date.now() - start
    const expected = check.expectedStatuses
      ? check.expectedStatuses
      : [check.expectedStatus]
    const ok = expected.includes(res.status)
    return {
      ...check,
      url,
      status: res.status,
      ok,
      elapsedMs: elapsed,
      expected: expected.join('/'),
    }
  } catch (err) {
    return {
      ...check,
      url,
      status: 0,
      ok: false,
      elapsedMs: Date.now() - start,
      expected: check.expectedStatuses?.join('/') ?? String(check.expectedStatus),
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function pad(s, len) {
  s = String(s)
  return s.length >= len ? s.slice(0, len - 1) + '…' : s.padEnd(len)
}

async function main() {
  console.log(`\nSmoke test contra: ${BASE_URL}\n`)
  console.log(`${pad('Status', 8)}  ${pad('Method', 6)}  ${pad('Path', 50)}  ${pad('Got', 5)}  ${pad('Want', 10)}  Time`)
  console.log('─'.repeat(98))

  const results = []
  for (const check of CHECKS) {
    const r = await checkOne(check)
    results.push(r)
    const icon = r.ok ? '✓' : '✗'
    const color = r.ok ? '\x1b[32m' : '\x1b[31m'
    const reset = '\x1b[0m'
    console.log(
      `${color}${icon}${reset} ${pad(r.method, 6)}  ${pad(r.path, 50)}  ${pad(r.status, 5)}  ${pad(r.expected, 10)}  ${r.elapsedMs}ms${r.error ? ` (${r.error})` : ''}`,
    )
  }

  const failed = results.filter(r => !r.ok)
  console.log('─'.repeat(98))
  console.log(`Total: ${results.length} · OK: ${results.length - failed.length} · FAIL: ${failed.length}`)

  if (failed.length > 0) {
    console.log('\nFailed:')
    for (const f of failed) {
      console.log(`  ✗ ${f.method} ${f.path} → got ${f.status}, wanted ${f.expected}`)
    }
    process.exit(1)
  }
  console.log('\n✓ All smoke checks passed')
}

main().catch(err => {
  console.error('Smoke test crashed:', err)
  process.exit(2)
})
