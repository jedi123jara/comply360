// =============================================
// In-memory cache with TTL
// Simple Map-based — no Redis dependency
// =============================================

interface CacheEntry {
  data: unknown
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

/**
 * Retrieve a cached value by key.
 * Returns null if the key does not exist or has expired.
 */
export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }

  return entry.data as T
}

/**
 * Store a value in the cache with a TTL in milliseconds.
 */
export function cacheSet(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  })
}

/**
 * Invalidate all cache keys whose key starts with the given pattern.
 * Useful for busting related entries (e.g. cacheInvalidate('org:abc') removes
 * 'org:abc:score', 'org:abc:workers', etc.).
 */
export function cacheInvalidate(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key)
    }
  }
}

/**
 * Remove every entry from the cache.
 */
export function cacheClear(): void {
  cache.clear()
}

/**
 * Return the number of live (non-expired) entries currently in the cache.
 * Lazily evicts expired entries encountered during the count.
 */
export function cacheSize(): number {
  const now = Date.now()
  let count = 0
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key)
    } else {
      count++
    }
  }
  return count
}
