import { NextResponse } from 'next/server'
import { confirmOrderCompletion } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) { try { const id = (await params).id; const order = confirmOrderCompletion(id); await auditAdminAction(_request, 'order.complete', id); return NextResponse.json(order) } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 409 }) } }
