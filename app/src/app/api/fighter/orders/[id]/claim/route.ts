import { NextResponse } from 'next/server'
import { currentFighter } from '@/lib/fighter-auth'
import { claimOrder } from '@/lib/db'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const fighter = await currentFighter()
  if (!fighter) return NextResponse.json({ error: '请先登录打手端' }, { status: 401 })
  // 防快速抢单脚本：同一打手限流（30 秒最多 6 次抢单请求）
  if (!rateLimit(`fighter-claim:${fighter.id}`, 6, 30 * 1000)) {
    return NextResponse.json({ error: '抢单太频繁，疑似脚本，请稍后再试' }, { status: 429 })
  }
  if (!rateLimit(`fighter-claim-ip:${clientIp(request)}`, 20, 30 * 1000)) {
    return NextResponse.json({ error: '当前网络抢单太频繁，请稍后再试' }, { status: 429 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    return NextResponse.json(claimOrder((await params).id, fighter.id, String(body.claimToken || '')))
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '抢单失败' }, { status: 409 })
  }
}
