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

function readPoolMax(): number {
  const parsed = Number.parseInt(process.env.PRISMA_POOL_MAX ?? '', 10)

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  return process.env.NODE_ENV === 'production' ? 1 : 2
}

function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to initialize Prisma')
  }

  const pool = new pg.Pool({
    connectionString,
    max: readPoolMax(), // Vercel serverless + Supabase: keep one client per instance.
    idleTimeoutMillis: process.env.NODE_ENV === 'production' ? 10000 : 30000,
    connectionTimeoutMillis: 30000, // allow longer cold-start connect time
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false } // Supabase pgbouncer requires SSL; cert is self-signed
        : false,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Lazy singletons: el PrismaClient subyacente (y su pg.Pool) se construye en el
// PRIMER uso real, no al importar este módulo. Importar `@/lib/prisma` debe quedar
// libre de efectos secundarios para que el `next build` ("Collecting page data"),
// que evalúa los módulos de ruta SIN un DATABASE_URL en los entornos Preview de
// Vercel, no lance "DATABASE_URL is required to initialize Prisma". La conexión
// recién se materializa cuando corre una query (que nunca pasa en build-time).
let baseInstance: PrismaClient | undefined
let adminInstance: PrismaClient | undefined

function getPrismaBase(): PrismaClient {
  if (baseInstance) return baseInstance
  baseInstance = globalForPrisma.prismaBase ?? createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaBase = baseInstance
  }
  return baseInstance
}

function getPrismaAdmin(): PrismaClient {
  if (adminInstance) return adminInstance
  adminInstance =
    globalForPrisma.prismaAdmin ??
    createPrismaClient(process.env.DIRECT_URL ?? process.env.DATABASE_URL)
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaAdmin = adminInstance
  }
  return adminInstance
}

// Envuelve un cliente resuelto perezosamente en un Proxy: la referencia exportada
// es estable y usable, pero el cliente solo se construye en el primer acceso a una
// propiedad. Los consumidores (p. ej. prisma-rls.ts) solo hacen llamadas a métodos
// — `prismaBase.$transaction`, `prismaAdmin.auditLog`, queries — así que get/set/has
// cubren el uso real.
function lazyClientProxy(resolve: () => PrismaClient): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
      const client = resolve()
      const value = Reflect.get(client as object, prop, receiver)
      return typeof value === 'function' ? value.bind(client) : value
    },
    set(_target, prop, value) {
      return Reflect.set(resolve() as object, prop, value)
    },
    has(_target, prop) {
      return Reflect.has(resolve() as object, prop)
    },
  })
}

// Cliente sin scope (saltea el contexto RLS de AsyncLocalStorage). Lazy.
export const prismaBase: PrismaClient = lazyClientProxy(getPrismaBase)

// Conecta vía DIRECT_URL (sin pooler) para los caminos con RLS enforced. Lazy.
export const prismaAdmin: PrismaClient = lazyClientProxy(getPrismaAdmin)

function currentPrisma(): PrismaRuntimeClient {
  return prismaContext.getStore() ?? getPrismaBase()
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

// Cliente con scope de request. Si hay un scope RLS activo (se empujó un cliente
// vía runWithPrismaClient), las lecturas/escrituras pasan por él; si no, caen al
// cliente base. El override de $transaction preserva el comportamiento previo: bajo
// un scope activo, $transaction(fn) corre fn contra el cliente con scope (una tx
// anidada real escaparía del GUC de RLS) y $transaction([...]) solo espera.
// `if (store)` equivale al viejo `client !== target`: el store siempre es un cliente
// de tx con scope, nunca el cliente base.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const store = prismaContext.getStore()
    const client = store ?? getPrismaBase()

    if (prop === '$transaction' && store) {
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
