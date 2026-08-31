import { NextResponse } from 'next/server'
import { listServiceTypes } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return NextResponse.json(listServiceTypes(false), {
    headers: { 'Cache-Control': 'public, max-age=60' },
  })
}
