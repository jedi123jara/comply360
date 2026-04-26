import { test, expect } from '@playwright/test'

/**
 * Onboarding redirect flow.
 *
 * Verifica que rutas autenticadas del dashboard redirigen al sign-in
 * cuando el usuario no está logueado. El check de onboarding completo
 * (cuando el user SÍ está logueado pero no tiene org) requiere setup
 * de Clerk session en CI — pendiente para Sprint 5+ con MSW/Clerk dev mode.
 */

test.describe('Onboarding redirect', () => {
  test('GET /dashboard sin auth → redirect a sign-in', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/sign-in/, { timeout: 10_000 })
    expect(page.url()).toContain('sign-in')
  })

  test('GET /dashboard/asistencia sin auth → redirect a sign-in', async ({ page }) => {
    await page.goto('/dashboard/asistencia')
    await page.waitForURL(/sign-in/, { timeout: 10_000 })
    expect(page.url()).toContain('sign-in')
  })

  test('GET /dashboard/onboarding sin auth → redirect a sign-in', async ({ page }) => {
    await page.goto('/dashboard/onboarding')
    await page.waitForURL(/sign-in/, { timeout: 10_000 })
    expect(page.url()).toContain('sign-in')
  })

  test('GET /mi-portal sin auth → redirect a sign-in', async ({ page }) => {
    await page.goto('/mi-portal')
    await page.waitForURL(/sign-in/, { timeout: 10_000 })
    expect(page.url()).toContain('sign-in')
  })

  test('GET /admin sin auth → redirect a sign-in', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL(/sign-in/, { timeout: 10_000 })
    expect(page.url()).toContain('sign-in')
  })
})
