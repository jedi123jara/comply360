import dns from 'node:dns'
import { AsyncLocalStorage } from 'node:async_hooks'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '@/generated/prisma/client'

// CRITICAL: force IPv4 resolution on Vercel serverless.
// Supabase pgbouncer hostname resolves to IPv6 by default; Vercel's functions
// hang on IPv6 and we get "Connection terminated due to connection timeout".
// Must run BEFORE pg.Pool is created.
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first')
}

type PrismaRuntimeClient = PrismaClient | Prisma.TransactionClient

const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient
  prismaAdmin?: PrismaClient
  prismaContext?: AsyncLocalStorage<PrismaRuntimeClient>
}

const prismaContext =
  globalForPrisma.prismaContext ?? new AsyncLocalStorage<PrismaRuntimeClient>()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaContext = prismaContext
}

function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  const pool = new pg.Pool({
    connectionString,
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

export const prismaBase = globalForPrisma.prismaBase ?? createPrismaClient()

export const prismaAdmin =
  globalForPrisma.prismaAdmin ??
  createPrismaClient(process.env.DIRECT_URL ?? process.env.DATABASE_URL)

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaBase = prismaBase
  globalForPrisma.prismaAdmin = prismaAdmin
}

function currentPrisma(): PrismaRuntimeClient {
  return prismaContext.getStore() ?? prismaBase
}

export function runWithPrismaClient<T>(
  client: PrismaRuntimeClient,
  fn: () => Promise<T>,
): Promise<T> {
  return prismaContext.run(client, fn)
}

export function getCurrentPrismaClient(): PrismaRuntimeClient {
  return currentPrisma()
}

export const prisma = new Proxy(prismaBase, {
  get(target, prop, receiver) {
    const client = currentPrisma()

    if (prop === '$transaction' && client !== target) {
      return async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: PrismaRuntimeClient) => unknown)(client)
        }
        if (Array.isArray(arg)) {
          return Promise.all(arg)
        }
        return undefined
      }
    }

    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
}) as PrismaClient
