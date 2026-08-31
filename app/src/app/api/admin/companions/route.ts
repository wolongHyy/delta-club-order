import { NextResponse } from 'next/server'
import { createCompanion, listCompanions } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const serviceTypeId = searchParams.get('serviceTypeId') || undefined
  const keyword = searchParams.get('keyword') || undefined
  return NextResponse.json(listCompanions({ serviceTypeId, keyword, all: true, kind: 'all' }))
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body.name || '').trim()
    const serviceTypeId = String(body.serviceTypeId || '')
    const price = Number(body.price)
    if (!name || !serviceTypeId || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: '昵称、服务类型、价格不能为空' }, { status: 400 })
    }
    const c = createCompanion({
      serviceTypeId,
      name,
      gender: String(body.gender || ''),
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      price,
      unit: String(body.unit || '小时'),
      rank: String(body.rank || ''),
      description: String(body.description || ''),
      sort: Number(body.sort) || 0,
    })
    await auditAdminAction(request, 'companion.create', c.id, { name: c.name, price: c.price })
    return NextResponse.json(c, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '新增失败' }, { status: 400 })
  }
}
