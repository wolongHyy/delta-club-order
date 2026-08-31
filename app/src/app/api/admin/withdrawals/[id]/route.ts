import { NextResponse } from 'next/server'
import { reviewWithdrawal } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const id = (await params).id; const b = await request.json(); const item = reviewWithdrawal(id, b.status); await auditAdminAction(request, 'withdrawal.review', id, { status: b.status }); return NextResponse.json(item) } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }) } }
