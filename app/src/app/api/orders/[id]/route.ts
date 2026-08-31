import { NextResponse } from 'next/server'
import { getOrder, updateOrderStatus } from '@/lib/db'
import { readCustomerSession } from '@/lib/customer-auth'
import type { OrderStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const customer = await readCustomerSession()
  if (!customer) return NextResponse.json({ error: '请刷新页面获取顾客身份' }, { status: 401 })
  const { id } = await params
  const order = getOrder(id)
  if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  if (order.customerId !== customer.customerId) return NextResponse.json({ error: '无权查看该订单' }, { status: 403 })
  return NextResponse.json(order)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const customer = await readCustomerSession()
    if (!customer) return NextResponse.json({ error: '请刷新页面获取顾客身份' }, { status: 401 })
    const { id } = await params
    const current = getOrder(id)
    if (!current) return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    if (current.customerId !== customer.customerId) return NextResponse.json({ error: '无权操作该订单' }, { status: 403 })
    const body = await request.json()
    const status = body.status as OrderStatus
    const order = updateOrderStatus(id, status)
    if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    return NextResponse.json(order)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '操作失败' }, { status: 400 })
  }
}
