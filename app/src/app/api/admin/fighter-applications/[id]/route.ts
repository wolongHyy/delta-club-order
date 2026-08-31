import { NextResponse } from 'next/server'
import { reviewFighterApplication } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'
import type { FighterApplicationStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const status = body.status as FighterApplicationStatus
    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: '无效的审核状态' }, { status: 400 })
    }
    const app = reviewFighterApplication(id, status)
    if (!app) return NextResponse.json({ error: '申请不存在' }, { status: 404 })
    await auditAdminAction(request, 'fighter_application.review', app.id, { status })
    return NextResponse.json(app)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '审核失败' }, { status: 400 })
  }
}
