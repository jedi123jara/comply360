import { test, expect, vi, afterEach } from 'vitest'

/**
 * Regresión: importar `@/lib/prisma` NO debe requerir `DATABASE_URL`.
 *
 * El `next build` ("Collecting page data") evalúa los módulos de ruta sin un
 * DATABASE_URL en los entornos Preview de Vercel. Si el PrismaClient se construye
 * al importar el módulo, el build revienta con "Failed to collect page data for
 * /api/backup". La inicialización perezosa mantiene el import libre de efectos
 * secundarios; el error claro recién aparece al USAR el cliente sin DATABASE_URL.
 */

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

test('importar @/lib/prisma sin DATABASE_URL no lanza', async () => {
  vi.stubEnv('DATABASE_URL', '')
  vi.stubEnv('DIRECT_URL', '')
  vi.resetModules()

  const mod = await import('@/lib/prisma')

  expect(mod.prisma).toBeDefined()
  expect(mod.prismaBase).toBeDefined()
  expect(mod.prismaAdmin).toBeDefined()
})

test('usar el cliente sin DATABASE_URL sí lanza el error claro (guard preservado)', async () => {
  vi.stubEnv('DATABASE_URL', '')
  vi.stubEnv('DIRECT_URL', '')
  vi.resetModules()

  const mod = await import('@/lib/prisma')

  // Acceder a cualquier propiedad fuerza la construcción perezosa → debe lanzar.
  expect(() => (mod.prismaBase as unknown as { $connect: unknown }).$connect).toThrow(
    /DATABASE_URL is required/,
  )
})
