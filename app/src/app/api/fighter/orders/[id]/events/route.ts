import { NextResponse } from 'next/server'
import { currentFighter } from '@/lib/fighter-auth'
import { getOrder, listOrderEvents } from '@/lib/db'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const fighter = await currentFighter()
  if (!fighter) return NextResponse.json({ error: '请先登录打手端' }, { status: 401 })
  const { id } = await params
  const order = getOrder(id)
  if (!order || (order.fighterId !== fighter.id && order.status !== 'pending')) {
    return NextResponse.json({ error: '订单不存在或不属于当前打手' }, { status: 404 })
  }
  return NextResponse.json(listOrderEvents(id))
}
