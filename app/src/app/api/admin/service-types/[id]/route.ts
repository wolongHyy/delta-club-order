import { NextResponse } from 'next/server'
import { updateServiceType } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const t = updateServiceType(id, {
      name: body.name,
      icon: body.icon,
      sort: body.sort !== undefined ? Number(body.sort) : undefined,
      enabled: body.enabled === undefined ? undefined : !!body.enabled,
    })
    if (!t) return NextResponse.json({ error: '服务类型不存在' }, { status: 404 })
    await auditAdminAction(request, 'service_type.update', t.id, { name: t.name, enabled: t.enabled })
    return NextResponse.json(t)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '更新失败' }, { status: 400 })
  }
}
