import { NextResponse } from 'next/server'
import { assignOrder } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const b = await request.json(); const order = assignOrder((await params).id, String(b.fighterId || '')); if (!order) return NextResponse.json({ error: '订单当前状态不允许派单' }, { status: 409 }); await auditAdminAction(request, 'order.assign', order.id, { fighterId: order.fighterId }); return NextResponse.json(order) } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }) } }
