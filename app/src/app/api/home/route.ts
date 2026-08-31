import { NextResponse } from 'next/server'
import { listCompanions, listServiceTypes } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const serviceTypes = listServiceTypes(false).filter((s) => !s.reserved)
  const hot = listCompanions({ sort: 'sales' }).slice(0, 6)
  const banners = [
    { id: 'b1', title: '三角洲行动 · 专业陪玩', subtitle: '高分段陪玩 上分无忧' },
    { id: 'b2', title: '护航专线', subtitle: '全程护驾 稳拿物资' },
    { id: 'b3', title: '趣味单', subtitle: '欢乐对局 开心第一' },
  ]
  return NextResponse.json(
    { serviceTypes, hot, banners },
    { headers: { 'Cache-Control': 'public, max-age=30' } },
  )
}
