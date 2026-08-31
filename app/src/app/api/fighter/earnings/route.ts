import { NextResponse } from 'next/server'
import { currentFighter } from '@/lib/fighter-auth'
import { getFighterEarnings } from '@/lib/db'
export async function GET() { const f = await currentFighter(); return f ? NextResponse.json(getFighterEarnings(f.id)) : NextResponse.json({ error: '请先登录打手端' }, { status: 401 }) }
