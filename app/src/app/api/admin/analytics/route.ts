import { NextResponse } from 'next/server'
import { getAnalytics } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import type { AnalyticsFilters } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const filters: AnalyticsFilters = {
      start: searchParams.get('start') || undefined,
      end: searchParams.get('end') || undefined,
      status: searchParams.get('status') || undefined,
      source: searchParams.get('source') || undefined,
      fighterId: searchParams.get('fighterId') || undefined,
      serviceTypeId: searchParams.get('serviceTypeId') || undefined,
      companionId: searchParams.get('companionId') || undefined,
      keyword: searchParams.get('keyword') || undefined,
    }
    return NextResponse.json(getAnalytics(filters), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '加载失败' }, { status: e?.status || 500 })
  }
}
