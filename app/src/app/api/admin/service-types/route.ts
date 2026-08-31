import { NextResponse } from 'next/server'
import { createServiceType, listServiceTypes } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(listServiceTypes(true))
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body.name || '').trim()
    if (!name) return NextResponse.json({ error: '名称不能为空' }, { status: 400 })
    const t = createServiceType({
      name,
      icon: String(body.icon || 'gamepad-2'),
      sort: Number(body.sort) || 0,
      reserved: !!body.reserved,
    })
    await auditAdminAction(request, 'service_type.create', t.id, { name: t.name })
    return NextResponse.json(t, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '新增失败' }, { status: 400 })
  }
}
