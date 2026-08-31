import { NextResponse } from 'next/server'
import { getSettings, setSetting } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getSettings())
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const keys = ['shopName', 'customerServiceWechat', 'notice']
    for (const k of keys) {
      if (body[k] !== undefined) setSetting(k, String(body[k]))
    }
    await auditAdminAction(request, 'settings.update', '', { keys: keys.filter((k) => body[k] !== undefined) })
    return NextResponse.json(getSettings())
  } catch {
    return NextResponse.json({ error: '保存失败' }, { status: 400 })
  }
}
