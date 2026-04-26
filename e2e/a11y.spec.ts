import { test, expect } from '@playwright/test'

/**
 * Accessibility (a11y) audit con axe-core via @axe-core/playwright.
 *
 * Cubre las páginas públicas TOP del producto. Cualquier violación con
 * impact >= 'serious' (serious + critical) bloquea el CI.
 *
 * Para correr localmente:
 *   npm run test:e2e -- e2e/a11y.spec.ts
 *
 * Setup: requiere `@axe-core/playwright` instalado. Si no está disponible
 * en el sistema, los tests se skipean con `test.skip()` en lugar de fallar.
 *
 * En Sprint 7+ podemos:
 *   - Expandir a TOP 30 rutas autenticadas (con setup de Clerk session)
 *   - Bloquear también `moderate` cuando el producto madure
 *   - Integrar con GitHub Actions
 */

const PUBLIC_ROUTES = [
  { path: '/', name: 'Landing' },
  { path: '/calculadoras', name: 'Hub Calculadoras' },
  { path: '/calculadoras/cts', name: 'Calculadora CTS' },
  { path: '/calculadoras/gratificacion', name: 'Calculadora Gratificación' },
  { path: '/calculadoras/multa-sunafil', name: 'Calculadora Multa SUNAFIL' },
  { path: '/planes', name: 'Planes y precios' },
  { path: '/diagnostico-gratis', name: 'Diagnóstico gratis' },
  { path: '/sign-in', name: 'Sign in (Clerk)' },
]

test.describe('Accessibility audit (axe-core)', () => {
  for (const { path, name } of PUBLIC_ROUTES) {
    test(`${name} (${path}) — sin violaciones serias/críticas`, async ({ page }, testInfo) => {
      // Cargar @axe-core/playwright dinámicamente — si no está instalado,
      // skipeamos el test con mensaje informativo en lugar de romper el CI.
      let AxeBuilder
      try {
        const mod = await import('@axe-core/playwright')
        AxeBuilder = mod.default ?? mod.AxeBuilder
      } catch {
        testInfo.skip(true, '@axe-core/playwright no instalado. Instala con: npm i -D @axe-core/playwright')
        return
      }

      const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
      expect(response?.status()).toBeLessThan(400)

      const results = await new AxeBuilder({ page })
        // Tags WCAG 2.1 AA + best practices
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      // Solo bloqueamos por serious + critical (moderate queda como warning)
      const blocking = results.violations.filter(
        (v: { impact?: string }) => v.impact === 'serious' || v.impact === 'critical',
      )

      if (blocking.length > 0) {
        const summary = blocking
          .map((v: { id: string; help: string; nodes: { length: number }[] }) =>
            `[${v.id}] ${v.help} (${v.nodes.length} nodes)`,
          )
          .join('\n')
        throw new Error(`${blocking.length} violaciones a11y serias/críticas en ${path}:\n${summary}`)
      }

      // Loggear moderate como warning para tracking
      const moderate = results.violations.filter((v: { impact?: string }) => v.impact === 'moderate')
      if (moderate.length > 0) {
        console.warn(`[a11y] ${path}: ${moderate.length} warnings moderate`)
      }
    })
  }
})
