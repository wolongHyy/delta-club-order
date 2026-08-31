import { NextResponse } from 'next/server'
import { listFighterApplications } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  return NextResponse.json(listFighterApplications({ status }))
}
