import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()
  try {
    getDb().prepare('SELECT 1').get()
    return Response.json({
      status: 'ok',
      database: 'ok',
      databaseLatencyMs: Date.now() - startedAt,
      uptimeSeconds: Math.round(process.uptime()),
    })
  } catch (error) {
    console.error('health check failed', error)
    return Response.json({ status: 'error', database: 'error' }, { status: 503 })
  }
}
