import { NextResponse } from 'next/server'
import { deleteCompanion, updateCompanion } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const c = updateCompanion(id, {
      serviceTypeId: body.serviceTypeId,
      name: body.name,
      gender: body.gender,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      price: body.price !== undefined ? Number(body.price) : undefined,
      unit: body.unit,
      rank: body.rank,
      description: body.description,
      sort: body.sort !== undefined ? Number(body.sort) : undefined,
      status: body.status !== undefined ? Number(body.status) : undefined,
    })
    if (!c) return NextResponse.json({ error: '陪玩不存在' }, { status: 404 })
    await auditAdminAction(request, 'companion.update', c.id, { name: c.name, status: c.status })
    return NextResponse.json(c)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '更新失败' }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!deleteCompanion(id)) return NextResponse.json({ error: '陪玩不存在' }, { status: 404 })
  await auditAdminAction(_request, 'companion.delete', id)
  return NextResponse.json({ ok: true })
}
