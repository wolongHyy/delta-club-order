import { NextResponse } from 'next/server'
import { createMessage } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const title = String(body.title || '').trim()
    const content = String(body.content || '').trim()
    if (!title || !content) return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 })
    const m = createMessage({ type: 'official', title, content })
    await auditAdminAction(request, 'message.create', m.id, { type: m.type })
    return NextResponse.json(m, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '发布失败' }, { status: 400 })
  }
}
