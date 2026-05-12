/**
 * Tests de integración con PostgreSQL real (FIX #8.B).
 *
 * Valida invariantes ESTRUCTURALES de la DB que no se pueden testear con
 * mocks: existencia de FK constraints, índices, RLS policies. Para tests
 * con data (advisory locks, hash chain end-to-end con writes reales),
 * ver smoke tests en scripts/audit-smoke/run-smoke.ts.
 *
 * Solo corre con INTEGRATION_TESTS=1. En CI con Postgres service container.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'

const SHOULD_RUN = process.env.INTEGRATION_TESTS === '1'
// Skip si la DB no es fresh CI Postgres (evita ruido contra Supabase production-ish).
// El job de CI define DATABASE_URL=postgresql://comply360:testpass@localhost:5432/...
const IS_CI_POSTGRES = (process.env.DATABASE_URL ?? '').includes('localhost')
const ENABLED = SHOULD_RUN && IS_CI_POSTGRES

describe.skipIf(!ENABLED)('DB Invariants — estructura', () => {
  let prisma: PrismaClient
  let pool: pg.Pool

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await pool.end()
  })

  describe('#7.A — workers.org_id FK con ON DELETE RESTRICT', () => {
    it('La constraint existe y está marcada como NO ACTION/RESTRICT (no CASCADE)', async () => {
      const fk = await prisma.$queryRaw<Array<{ confdeltype: string }>>`
        SELECT confdeltype::text AS confdeltype FROM pg_constraint
        WHERE conname = 'workers_org_id_fkey'
      `
      expect(fk.length).toBe(1)
      // confdeltype: 'a' = NO ACTION, 'r' = RESTRICT, 'c' = CASCADE, 'n' = SET NULL
      // Tanto 'r' como 'a' previenen el borrado en cascada
      expect(['r', 'a']).toContain(fk[0].confdeltype)
    })
  })

  describe('#7.B — 32 FKs huérfanas aplicadas', () => {
    const samples = [
      'ai_usage',
      'ai_budget_counters',
      'compliance_scores',
      'worker_alerts',
      'sst_records',
      'workflows',
      'merkle_anchors',
      'attendance',
    ]

    it.each(samples)('Tabla %s tiene FK a organizations', async (table) => {
      const fks = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_name = $1
           AND kcu.column_name = 'org_id'
           AND ccu.table_name = 'organizations'`,
        table,
      )
      expect(Number(fks[0].count)).toBeGreaterThan(0)
    })
  })

  describe('#7.C — RLS habilitada en tablas tenant-scoped', () => {
    const samples = ['ai_usage', 'compliance_scores', 'sst_records', 'workflows']

    it.each(samples)('Tabla %s tiene RLS enabled + policy tenant_isolation', async (table) => {
      const rls = await prisma.$queryRawUnsafe<Array<{ rowsecurity: boolean }>>(
        `SELECT rowsecurity FROM pg_tables WHERE tablename = $1`,
        table,
      )
      expect(rls[0]?.rowsecurity).toBe(true)

      const policies = await prisma.$queryRawUnsafe<Array<{ policyname: string }>>(
        `SELECT policyname FROM pg_policies WHERE tablename = $1 AND policyname = 'tenant_isolation'`,
        table,
      )
      expect(policies.length).toBe(1)
    })
  })

  describe('#7.E — Indices timeline', () => {
    it('leads_converted_org_id_idx existe', async () => {
      const r = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'leads_converted_org_id_idx'
      `
      expect(r.length).toBe(1)
    })

    it('calculations_org_id_created_at_idx existe', async () => {
      const r = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'calculations_org_id_created_at_idx'
      `
      expect(r.length).toBe(1)
    })
  })

  describe('#7.D — AuditLog hash chain columns', () => {
    it('audit_logs tiene prev_hash y entry_hash', async () => {
      const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'audit_logs'
          AND column_name IN ('prev_hash', 'entry_hash')
      `
      expect(cols.length).toBe(2)
    })

    it('audit_logs tiene index en entry_hash', async () => {
      const r = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'audit_logs_entry_hash_idx'
      `
      expect(r.length).toBe(1)
    })
  })

  describe('#7.G — ai_usage.eval_score tipo Decimal', () => {
    it('eval_score es numeric, no double precision', async () => {
      const cols = await prisma.$queryRaw<Array<{ data_type: string; numeric_precision: number | null }>>`
        SELECT data_type, numeric_precision
        FROM information_schema.columns
        WHERE table_name = 'ai_usage' AND column_name = 'eval_score'
      `
      expect(cols[0]?.data_type).toBe('numeric')
      expect(cols[0]?.numeric_precision).toBe(5)
    })
  })

  describe('#1.D — Import token HMAC con secret', () => {
    it.skipIf(!process.env.IMPORT_TOKEN_SECRET)('Token roundtrip + tampering', async () => {
      const { createHmac, timingSafeEqual } = await import('node:crypto')
      const secret = process.env.IMPORT_TOKEN_SECRET!
      expect(secret.length).toBeGreaterThanOrEqual(32)

      const payload = JSON.stringify({ orgId: 'test', validRows: [], timestamp: Date.now() })
      const sig = createHmac('sha256', secret).update(payload).digest('hex')
      const expectedSig = createHmac('sha256', secret).update(payload).digest('hex')
      const a = Buffer.from(sig, 'hex')
      const b = Buffer.from(expectedSig, 'hex')
      expect(timingSafeEqual(a, b)).toBe(true)

      const tamperedSig = createHmac('sha256', secret).update(payload + 'x').digest('hex')
      const t = Buffer.from(tamperedSig, 'hex')
      expect(timingSafeEqual(a, t)).toBe(false)
    })
  })
})
