import { NextResponse } from 'next/server'
import { currentFighter } from '@/lib/fighter-auth'
import { getOrder, issueClaimToken, verifySliderChallenge } from '@/lib/db'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// 滑块验证：打手把滑块拖到目标百分比附近后，服务端校验并发放一次性抢单令牌
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const fighter = await currentFighter()
  if (!fighter) return NextResponse.json({ error: '请先登录打手端' }, { status: 401 })
  if (!rateLimit(`fighter-slider:${fighter.id}`, 15, 60 * 1000)) {
    return NextResponse.json({ error: '滑块验证太频繁，请稍后再试' }, { status: 429 })
  }
  if (!rateLimit(`fighter-slider-ip:${clientIp(request)}`, 40, 60 * 1000)) {
    return NextResponse.json({ error: '当前网络操作太频繁，请稍后再试' }, { status: 429 })
  }
  try {
    const body = await request.json()
    const orderId = (await params).id
    const sliderId = String(body.sliderId || '')
    const position = Number(body.position)
    const order = getOrder(orderId)
    if (!order || order.status !== 'pending' || !order.paid || order.fighterId) {
      return NextResponse.json({ error: '订单已不可抢，请刷新抢单大厅' }, { status: 409 })
    }
    if (!verifySliderChallenge(sliderId, orderId, position)) {
      return NextResponse.json({ error: '请把滑块拖到最右侧完成验证' }, { status: 400 })
    }
    const claimToken = issueClaimToken(orderId, fighter.id)
    return NextResponse.json({ claimToken })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '验证失败' }, { status: 400 })
  }
}
