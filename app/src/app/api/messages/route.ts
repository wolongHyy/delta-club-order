import { NextResponse } from 'next/server'
import { listMessages } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(listMessages(), {
    headers: { 'Cache-Control': 'public, max-age=30' },
  })
}
