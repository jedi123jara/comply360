/**
 * Tests del job de retención Ley 29733.
 *
 * Mockeamos el cliente Prisma para validar que:
 *   1. Workers cesados < 5 años NO son tocados
 *   2. Workers cesados >= 5 años SÍ son procesados
 *   3. EMOs ya redactadas (cifrado=null) son ignoradas
 *   4. ARCO con respuesta < 5 años NO son tocados
 *   5. dryRun=true cuenta pero no escribe
 *   6. AuditLog se crea por cada redacción
 */

import { describe, it, expect, vi } from 'vitest'
import { runRetentionJob } from '../retention'

// Helper: construye un mock de Prisma con tracking de calls
function makeMockPrisma(opts: {
  workersACesar?: Array<{ id: string; orgId: string }>
  emosRedactables?: Array<{ id: string; orgId: string }>
  consentsCount?: number
  arcosRedactables?: Array<{ id: string; orgId: string }>
}) {
  const calls = {
    emoUpdateMany: 0,
    consentDeleteMany: 0,
    arcoUpdateMany: 0,
    auditLogCreate: 0,
  }

  // Type-relaxed mock: en runtime los mocks toman cualquier shape
  const prisma = {
    worker: {
      findMany: vi.fn(async () => opts.workersACesar ?? []),
    },
    eMO: {
      findMany: vi.fn(async () => opts.emosRedactables ?? []),
      updateMany: vi.fn(async () => {
        calls.emoUpdateMany++
        return { count: opts.emosRedactables?.length ?? 0 }
      }),
    },
    consentimientoLey29733: {
      count: vi.fn(async () => opts.consentsCount ?? 0),
      deleteMany: vi.fn(async () => {
        calls.consentDeleteMany++
        return { count: opts.consentsCount ?? 0 }
      }),
    },
    solicitudARCO: {
      findMany: vi.fn(async () => opts.arcosRedactables ?? []),
      updateMany: vi.fn(async () => {
        calls.arcoUpdateMany++
        return { count: opts.arcosRedactables?.length ?? 0 }
      }),
    },
    auditLog: {
      create: vi.fn(async () => {
        calls.auditLogCreate++
        return { id: 'audit-' + calls.auditLogCreate }
      }),
    },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { prisma: prisma as any, calls }
}

describe('runRetentionJob', () => {
  it('cuando no hay workers cesados elegibles, no hace nada', async () => {
    const { prisma, calls } = makeMockPrisma({ workersACesar: [] })
    const result = await runRetentionJob(prisma)
    expect(result.workersEvaluados).toBe(0)
    expect(result.emosRedactadas).toBe(0)
    expect(result.consentimientosBorrados).toBe(0)
    expect(calls.emoUpdateMany).toBe(0)
    expect(calls.consentDeleteMany).toBe(0)
    expect(calls.auditLogCreate).toBe(0)
  })

  it('redacta EMOs y borra consentimientos para worker cesado > 5 años', async () => {
    const { prisma, calls } = makeMockPrisma({
      workersACesar: [{ id: 'w1', orgId: 'org1' }],
      emosRedactables: [
        { id: 'emo1', orgId: 'org1' },
        { id: 'emo2', orgId: 'org1' },
      ],
      consentsCount: 1,
    })
    const result = await runRetentionJob(prisma)
    expect(result.workersEvaluados).toBe(1)
    expect(result.emosRedactadas).toBe(2)
    expect(result.consentimientosBorrados).toBe(1)
    expect(calls.emoUpdateMany).toBe(1)
    expect(calls.consentDeleteMany).toBe(1)
    expect(calls.auditLogCreate).toBeGreaterThanOrEqual(2) // 1 por EMO redact + 1 por consent delete
  })

  it('en dryRun=true cuenta pero NO ejecuta updates/deletes', async () => {
    const { prisma, calls } = makeMockPrisma({
      workersACesar: [{ id: 'w1', orgId: 'org1' }],
      emosRedactables: [{ id: 'emo1', orgId: 'org1' }],
      consentsCount: 2,
    })
    const result = await runRetentionJob(prisma, { dryRun: true })
    expect(result.emosRedactadas).toBe(1)
    expect(result.consentimientosBorrados).toBe(2)
    // NO se llamaron las mutaciones en dry run
    expect(calls.emoUpdateMany).toBe(0)
    expect(calls.consentDeleteMany).toBe(0)
    expect(calls.auditLogCreate).toBe(0)
  })

  it('redacta ARCOs viejos y agrupa AuditLogs por orgId', async () => {
    const { prisma, calls } = makeMockPrisma({
      arcosRedactables: [
        { id: 'a1', orgId: 'orgA' },
        { id: 'a2', orgId: 'orgA' },
        { id: 'a3', orgId: 'orgB' },
      ],
    })
    const result = await runRetentionJob(prisma)
    expect(result.arcoRedactados).toBe(3)
    expect(calls.arcoUpdateMany).toBe(1)
    // 2 grupos de orgIds → 2 audit logs (uno por orgId)
    expect(calls.auditLogCreate).toBe(2)
  })

  it('respeta el cutoff con 5 años exactos', async () => {
    const { prisma } = makeMockPrisma({})
    const fixedNow = new Date('2026-05-04T00:00:00Z')
    await runRetentionJob(prisma, { now: fixedNow })

    // Verificamos que worker.findMany fue llamado con un cutoff de hace 5 años
    const findManyCalls = (prisma.worker.findMany as unknown as { mock: { calls: unknown[][] } }).mock.calls
    expect(findManyCalls.length).toBe(1)
    const args = findManyCalls[0][0] as { where: { fechaCese: { lt: Date } } }
    const cutoff = args.where.fechaCese.lt
    const expectedCutoff = new Date(fixedNow.getTime() - 5 * 365.25 * 86400_000)
    // Tolerancia de 1 día por aproximación de año
    const diffDays = Math.abs(cutoff.getTime() - expectedCutoff.getTime()) / 86400_000
    expect(diffDays).toBeLessThan(1)
  })

  it('continúa procesando si un worker individual falla', async () => {
    const { prisma } = makeMockPrisma({
      workersACesar: [
        { id: 'w-bueno', orgId: 'org1' },
        { id: 'w-malo', orgId: 'org1' },
      ],
    })
    // Hacemos que la segunda llamada a eMO.findMany falle
    let emoCallCount = 0
    prisma.eMO.findMany = vi.fn(async () => {
      emoCallCount++
      if (emoCallCount === 2) throw new Error('DB transient error')
      return []
    })
    const result = await runRetentionJob(prisma)
    expect(result.workersEvaluados).toBe(2)
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
    expect(result.errors[0]).toContain('w-malo')
  })

  it('respeta el límite maxWorkersPerRun', async () => {
    const { prisma } = makeMockPrisma({})
    await runRetentionJob(prisma, { maxWorkersPerRun: 50 })
    const findManyCalls = (prisma.worker.findMany as unknown as { mock: { calls: unknown[][] } }).mock.calls
    const args = findManyCalls[0][0] as { take: number }
    expect(args.take).toBe(50)
  })
})
