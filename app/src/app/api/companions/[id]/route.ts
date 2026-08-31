import { NextResponse } from 'next/server'
import { getCompanion } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = getCompanion(id)
  if (!c) return NextResponse.json({ error: '陪玩不存在或已下架' }, { status: 404 })
  return NextResponse.json(c, { headers: { 'Cache-Control': 'public, max-age=30' } })
}
