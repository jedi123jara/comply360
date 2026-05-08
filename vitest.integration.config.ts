/**
 * Configuración de Vitest para tests de integración con DB real (PostgreSQL).
 * Solo se corre en CI con un service container de Postgres + migrations
 * aplicadas. Los tests están en src/**\/__tests__\/**.integration.test.ts
 *
 * Para correr localmente:
 *   docker run -d --name pg-test -p 5432:5432 -e POSTGRES_PASSWORD=testpass postgres:16
 *   DATABASE_URL=postgresql://postgres:testpass@localhost:5432/postgres pnpm exec prisma migrate deploy
 *   DATABASE_URL=... INTEGRATION_TESTS=1 pnpm exec vitest run --config vitest.integration.config.ts
 */
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    // Tests de integración tienen timeouts más largos por queries SQL reales.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Cada test en serie para evitar conflictos de DB
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
