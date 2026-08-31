import { NextResponse } from 'next/server'
import { currentFighter } from '@/lib/fighter-auth'
import { listFighterOrders, listOpenOrders, issueSliderChallenge } from '@/lib/db'
export async function GET(request: Request) {
  const fighter = await currentFighter()
  if (!fighter) return NextResponse.json({ error: '请先登录打手端' }, { status: 401 })
  const params = new URL(request.url).searchParams
  if (params.get('pool') === '1') {
    // 抢单大厅：给每个订单附带滑块验证（随机目标位置），防止一键脚本直接抢单
    const pool = listOpenOrders(params.get('keyword') || undefined)
    const withSlider = pool.map((order) => ({ ...order, slider: issueSliderChallenge(order.id) }))
    return NextResponse.json(withSlider, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
  return NextResponse.json(listFighterOrders(fighter.id, params.get('status') || undefined))
}
