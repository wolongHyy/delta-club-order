import { NextResponse } from 'next/server'
import { cancelExpiredOrders, recordAuditLog } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const expected = process.env.MAINTENANCE_TOKEN
  const provided = request.headers.get('x-maintenance-token')
  if (!expected || provided !== expected) return NextResponse.json({ error: '未授权的维护请求' }, { status: 401 })
  const minutes = Number(new URL(request.url).searchParams.get('minutes')) || 30
  try {
    const cancelled = cancelExpiredOrders(minutes)
    recordAuditLog({ action: 'orders.cancel_expired', actorType: 'system', method: request.method, path: new URL(request.url).pathname, metadata: { minutes, cancelled } })
    return NextResponse.json({ cancelled })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '自动取消失败' }, { status: 500 })
  }
}
