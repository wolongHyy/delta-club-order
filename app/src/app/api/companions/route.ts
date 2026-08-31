import { NextResponse } from 'next/server'
import { listCompanions } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const serviceTypeId = searchParams.get('serviceTypeId') || undefined
  const keyword = searchParams.get('keyword') || undefined
  const sort = searchParams.get('sort') || 'default'
  return NextResponse.json(listCompanions({ serviceTypeId, keyword, sort, all: false }), {
    headers: { 'Cache-Control': 'public, max-age=30' },
  })
}
