import { getDb } from './db.ts'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000
let lastBucketCleanupAt = 0

function inMemoryRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > MAX_BUCKETS) {
      for (const [bucketKey, item] of buckets) {
        if (item.resetAt <= now) buckets.delete(bucketKey)
      }
    }
    if (buckets.size > MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value
      if (oldestKey !== undefined) buckets.delete(oldestKey)
    }
    return true
  }
  bucket.count += 1
  return bucket.count <= limit
}

function databaseRateLimit(key: string, limit: number, windowMs: number): boolean | null {
  try {
    const d = getDb()
    const now = Date.now()
    if (now - lastBucketCleanupAt > 60_000) {
      d.prepare('DELETE FROM RateLimitBucket WHERE resetAt <= ?').run(now)
      lastBucketCleanupAt = now
    }
    d.exec('BEGIN IMMEDIATE')
    try {
      const row = d.prepare('SELECT count, resetAt FROM RateLimitBucket WHERE key = ?').get(key) as any
      let allowed = true
      if (!row || row.resetAt <= now) {
        d.prepare(
          `INSERT INTO RateLimitBucket (key, count, resetAt) VALUES (?, 1, ?)
           ON CONFLICT(key) DO UPDATE SET count = 1, resetAt = excluded.resetAt`,
        ).run(key, now + windowMs)
      } else {
        const count = Number(row.count) + 1
        d.prepare('UPDATE RateLimitBucket SET count = ? WHERE key = ?').run(count, key)
        allowed = count <= limit
      }
      d.exec('COMMIT')
      return allowed
    } catch (error) {
      d.exec('ROLLBACK')
      throw error
    }
  } catch {
    return null
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  if (process.env.RATE_LIMIT_SHARED !== 'db') return inMemoryRateLimit(key, limit, windowMs)

  const sharedResult = databaseRateLimit(key, limit, windowMs)
  return sharedResult ?? inMemoryRateLimit(key, limit, windowMs)
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return (forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip')) || 'local'
}
