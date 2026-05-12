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

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
const TIMEOUT_MS = 10_000
const isHttps = BASE_URL.startsWith('https://')
const isProductionDomain = /^https:\/\/(www\.)?comply360\.pe$/i.test(BASE_URL)

const SECURITY_HEADER_EXPECTATIONS = [
  { key: 'x-content-type-options', value: 'nosniff' },
  { key: 'x-frame-options', value: 'DENY' },
  { key: 'referrer-policy', value: 'strict-origin-when-cross-origin' },
  { key: 'content-security-policy', includes: "default-src 'self'" },
  { key: 'content-security-policy', includes: "frame-ancestors 'none'" },
  ...(isHttps ? [{ key: 'strict-transport-security', includes: 'max-age=' }] : []),
]

// Cada check: { name, method, path/url, expectedStatus | expectedStatuses, description }
const CHECKS = [
  // ── Páginas públicas ────────────────────────────────────────────────
  {
    name: 'Landing',
    method: 'GET',
    path: '/',
    expectedStatus: 200,
    contentIncludes: ['Comply360', 'SUNAFIL'],
    expectSecurityHeaders: true,
  },
  { name: 'Hub Calculadoras', method: 'GET', path: '/calculadoras', expectedStatus: 200, contentIncludes: ['Calculadoras'] },
  { name: 'Calculadora CTS', method: 'GET', path: '/calculadoras/cts', expectedStatus: 200, contentIncludes: ['CTS'] },
  {
    name: 'Calculadora Gratificación',
    method: 'GET',
    path: '/calculadoras/gratificacion',
    expectedStatus: 200,
    contentIncludes: ['Gratificaci'],
  },
  { name: 'Calculadora Multa SUNAFIL', method: 'GET', path: '/calculadoras/multa-sunafil', expectedStatus: 200, contentIncludes: ['SUNAFIL'] },
  { name: 'Pricing', method: 'GET', path: '/planes', expectedStatus: 200, contentIncludes: ['Plan'] },
  { name: 'Diagnóstico gratis', method: 'GET', path: '/diagnostico-gratis', expectedStatus: 200, contentIncludes: ['SUNAFIL'] },
  { name: 'Recursos (blog)', method: 'GET', path: '/recursos', expectedStatus: 200, contentIncludes: ['Recursos'] },

  // ── Páginas legales (no-index pero deben responder 200) ────────────
  { name: 'Privacidad trabajador', method: 'GET', path: '/legal/privacidad-trabajador', expectedStatus: 200, contentIncludes: ['Privacidad'] },
  { name: 'AUP', method: 'GET', path: '/legal/aup', expectedStatus: 200, contentIncludes: ['uso aceptable'] },
  { name: 'DPA', method: 'GET', path: '/legal/dpa', expectedStatus: 200, contentIncludes: ['Tratamiento de Datos'] },

  // ── Rutas que requieren auth → redirect o 404 stealth de Clerk (no 500) ──
  { name: 'Dashboard sin auth → protegido', method: 'GET', path: '/dashboard', expectedStatuses: [200, 307, 308, 404] },
  { name: '/mi-portal sin auth → protegido', method: 'GET', path: '/mi-portal', expectedStatuses: [200, 307, 308, 404] },
  { name: '/admin sin auth → protegido', method: 'GET', path: '/admin', expectedStatuses: [200, 307, 308, 404] },

  // ── APIs públicas / health ──────────────────────────────────────────
  {
    name: 'Health endpoint',
    method: 'GET',
    path: '/api/health',
    expectedStatus: 200,
    expectedJson: { status: 'ok' },
    forbiddenJsonKeys: isHttps ? ['database'] : [],
  },

  // ── APIs protegidas → deben negar acceso o esconderse (no 500) ─────
  { name: 'API workers sin auth → protegido', method: 'GET', path: '/api/workers', expectedStatuses: [401, 403, 404, 307, 308] },
  { name: 'API attendance qr-token → protegido', method: 'GET', path: '/api/attendance/qr-token', expectedStatuses: [401, 403, 404, 307, 308] },
  { name: 'API ai-chat sin auth → protegido', method: 'POST', path: '/api/ai-chat', expectedStatuses: [401, 403, 404, 405, 307, 308] },
  { name: 'API integrations RENIEC sin auth → protegido', method: 'GET', path: '/api/integrations/reniec/consulta-dni?dni=12345678', expectedStatuses: [401, 403, 404, 307, 308] },
  { name: 'API feedback NPS sin auth → protegido', method: 'GET', path: '/api/feedback/nps', expectedStatuses: [401, 403, 404, 307, 308] },
  { name: 'API me/orgs sin auth → protegido', method: 'GET', path: '/api/me/orgs', expectedStatuses: [401, 403, 404, 307, 308] },

  // ── APIs públicas con validación de input ──────────────────────────
  {
    name: 'API clock-by-code valida DNI inválido → 400',
    method: 'POST',
    path: '/api/attendance/clock-by-code',
    body: { dni: '123', pin: '1234', shortCode: 'ABCDEF' },
    expectedStatus: 400,
  },

  // ── SEO: sitemap y robots ──────────────────────────────────────────
  { name: 'Sitemap', method: 'GET', path: '/sitemap.xml', expectedStatus: 200, contentIncludes: ['<urlset', 'https://comply360.pe'] },
  { name: 'robots.txt', method: 'GET', path: '/robots.txt', expectedStatus: 200, contentIncludes: ['User-Agent', 'Sitemap'] },
]

if (isProductionDomain) {
  CHECKS.push({
    name: 'www.comply360.pe alias',
    method: 'HEAD',
    url: 'https://www.comply360.pe/',
    expectedStatus: 200,
    followRedirects: true,
    expectSecurityHeaders: true,
  })
}

function checkHeaders(res, check) {
  const errors = []
  if (!check.expectSecurityHeaders) return errors

  for (const expectation of SECURITY_HEADER_EXPECTATIONS) {
    const value = res.headers.get(expectation.key)
    if (!value) {
      errors.push(`missing header ${expectation.key}`)
      continue
    }
    if (expectation.value && value !== expectation.value) {
      errors.push(`header ${expectation.key}=${value}, expected ${expectation.value}`)
    }
    if (expectation.includes && !value.includes(expectation.includes)) {
      errors.push(`header ${expectation.key} missing "${expectation.includes}"`)
    }
  }
  return errors
}

function checkJson(body, check) {
  const errors = []
  if (check.expectedJson) {
    for (const [key, expectedValue] of Object.entries(check.expectedJson)) {
      if (body?.[key] !== expectedValue) {
        errors.push(`json.${key}=${String(body?.[key])}, expected ${String(expectedValue)}`)
      }
    }
  }
  for (const key of check.forbiddenJsonKeys ?? []) {
    if (Object.hasOwn(body ?? {}, key)) {
      errors.push(`json.${key} must not be exposed`)
    }
  }
  return errors
}

async function checkOne(check) {
  const url = check.url ?? new URL(check.path, `${BASE_URL}/`).toString()
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const init = {
      method: check.method,
      headers: { 'content-type': 'application/json' },
      redirect: check.followRedirects ? 'follow' : 'manual', // queremos ver redirects sin seguirlos salvo checks canonicos
      signal: controller.signal,
    }
    if (check.body) init.body = JSON.stringify(check.body)
    const res = await fetch(url, init)
    clearTimeout(timer)
    const elapsed = Date.now() - start
    const expected = check.expectedStatuses
      ? check.expectedStatuses
      : [check.expectedStatus]
    const errors = []
    if (!expected.includes(res.status)) {
      errors.push(`got ${res.status}, wanted ${expected.join('/')}`)
    }
    errors.push(...checkHeaders(res, check))

    if (check.expectedJson) {
      try {
        const body = await res.json()
        errors.push(...checkJson(body, check))
      } catch {
        errors.push('response is not valid JSON')
      }
    } else if (check.contentIncludes?.length) {
      const body = await res.text()
      for (const needle of check.contentIncludes) {
        if (!body.includes(needle)) errors.push(`body missing "${needle}"`)
      }
    }

    return {
      ...check,
      url,
      status: res.status,
      ok: errors.length === 0,
      elapsedMs: elapsed,
      expected: expected.join('/'),
      error: errors.join('; '),
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
    const target = r.path ?? r.url.replace(BASE_URL, '')
    console.log(
      `${color}${icon}${reset} ${pad(r.method, 6)}  ${pad(target, 50)}  ${pad(r.status, 5)}  ${pad(r.expected, 10)}  ${r.elapsedMs}ms${r.error ? ` (${r.error})` : ''}`,
    )
  }

  const failed = results.filter(r => !r.ok)
  console.log('─'.repeat(98))
  console.log(`Total: ${results.length} · OK: ${results.length - failed.length} · FAIL: ${failed.length}`)

  if (failed.length > 0) {
    console.log('\nFailed:')
    for (const f of failed) {
      console.log(`  ✗ ${f.method} ${f.path ?? f.url} → ${f.error || `got ${f.status}, wanted ${f.expected}`}`)
    }
    process.exit(1)
  }
  console.log('\n✓ All smoke checks passed')
}

main().catch(err => {
  console.error('Smoke test crashed:', err)
  process.exit(2)
})
