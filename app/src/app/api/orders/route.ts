import { NextResponse } from 'next/server'
import { createOrder, listOrders } from '@/lib/db'
import { readCustomerSession, requireCustomer } from '@/lib/customer-auth'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const customer = await readCustomerSession()
  if (!customer) return NextResponse.json({ error: '请刷新页面获取顾客身份' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const page = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('pageSize')) || 20
  return NextResponse.json(listOrders({ status, customerId: customer.customerId, page, pageSize }))
}

export async function POST(request: Request) {
  if (!rateLimit(`create-order:${clientIp(request)}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: '下单太频繁，请稍后再试' }, { status: 429 })
  }
  try {
    const customer = await requireCustomer()
    if (!rateLimit(`create-order:customer:${customer.customerId}`, 10, 60 * 1000)) {
      return NextResponse.json({ error: '下单太频繁，请稍后再试' }, { status: 429 })
    }
    const body = await request.json()
    const companionId = String(body.companionId || '')
    const unitCount = Number(body.unitCount)
    if (!companionId || !Number.isFinite(unitCount) || unitCount <= 0) {
      return NextResponse.json({ error: '参数不完整：请选择陪玩并填写时长/局数' }, { status: 400 })
    }
    const order = createOrder({
      companionId,
      unitCount,
      spec: String(body.spec || ''),
      gameField: body.gameField || '',
      gameMode: body.gameMode || '',
      mapName: body.mapName || '',
      inGameId: body.inGameId || '',
      rank: body.rank || '',
      remark: body.remark || '',
      customerId: customer.customerId,
      customerName: '',
      customerPhone: customer.phone || '',
      fighterId: body.fighterId || '',
      isTrial: body.isTrial === true,
      idempotencyKey: String(body.idempotencyKey || ''),
    })
    return NextResponse.json(order, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '下单失败' }, { status: 400 })
  }
}
