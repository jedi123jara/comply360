import dns from 'node:dns'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

// CRITICAL: force IPv4 resolution on Vercel serverless.
// Supabase pgbouncer hostname resolves to IPv6 by default; Vercel's functions
// hang on IPv6 and we get "Connection terminated due to connection timeout".
// Must run BEFORE pg.Pool is created.
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first')
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2, // serverless: keep pool small to avoid exhausting Supabase free-tier limits
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000, // allow longer cold-start connect time
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false } // Supabase pgbouncer requires SSL; cert is self-signed
        : false,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
