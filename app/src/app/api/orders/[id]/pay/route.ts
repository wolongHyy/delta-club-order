import { NextResponse } from 'next/server'
import { getOrder, payOrder } from '@/lib/db'
import { readCustomerSession } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

// 顾客端付款（当前为模拟支付，正式上线时替换为微信支付/收款回调）
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const customer = await readCustomerSession()
  if (!customer) return NextResponse.json({ error: '请刷新页面获取顾客身份' }, { status: 401 })
  const order = getOrder((await params).id)
  if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  if (order.customerId && order.customerId !== customer.customerId) {
    return NextResponse.json({ error: '无权操作该订单' }, { status: 403 })
  }
  try {
    return NextResponse.json(payOrder(order.id, { type: 'customer', id: customer.customerId, name: customer.nickname || '' }, 'online_mock'))
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '支付失败' }, { status: 409 })
  }
}
