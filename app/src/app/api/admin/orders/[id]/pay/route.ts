import { NextResponse } from 'next/server'
import { payOrder } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'

// 管理端“线下已收款”：顾客线下转账/收款后，管理员把待付款订单标记为已付款进入派单/抢单池
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id
    const order = payOrder(id, { type: 'admin', name: 'admin' }, 'offline')
    if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    await auditAdminAction(_request, 'order.pay', id, { method: 'offline' })
    return NextResponse.json(order)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 409 })
  }
}
