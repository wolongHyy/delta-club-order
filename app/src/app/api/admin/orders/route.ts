import { NextResponse } from 'next/server'
import { listOrders } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const page = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('pageSize')) || 50
  return NextResponse.json(listOrders({ status, all: true, page, pageSize }))
}
