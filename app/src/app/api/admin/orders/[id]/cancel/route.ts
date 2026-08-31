import { NextResponse } from 'next/server'
import { updateOrderStatus } from '@/lib/db'
import type { OrderStatus } from '@/lib/types'
import { auditAdminAction } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const order = updateOrderStatus((await params).id, 'cancelled' as OrderStatus, { type: 'admin' })
    if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    await auditAdminAction(_request, 'order.cancel', order.id)
    return NextResponse.json(order)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '取消失败' }, { status: 409 })
  }
}
