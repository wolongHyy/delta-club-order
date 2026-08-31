type CacheEntry<T> = { value: T; expiresAt: number }

const cache = new Map<string, CacheEntry<unknown>>()
const MAX_ENTRIES = 1000

export function cacheWrap<T>(key: string, ttlMs: number, loader: () => T): T {
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && hit.expiresAt > now) return hit.value as T

  const value = loader()
  cache.set(key, { value, expiresAt: now + ttlMs })

  if (cache.size > MAX_ENTRIES) {
    for (const [entryKey, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(entryKey)
    }
  }
  if (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) cache.delete(oldestKey)
  }
  return value
}

export function invalidateCache(prefix = ''): void {
  if (!prefix) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}
