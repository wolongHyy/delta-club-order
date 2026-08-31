import { NextResponse } from 'next/server'
import { currentFighter } from '@/lib/fighter-auth'
import { setFighterOnline } from '@/lib/db'
export async function GET() {
  const fighter = await currentFighter()
  if (!fighter) return NextResponse.json({ error: '请先登录打手端' }, { status: 401 })
  return NextResponse.json(fighter)
}

export async function PATCH(request: Request) {
  const fighter = await currentFighter()
  if (!fighter) return NextResponse.json({ error: '请先登录打手端' }, { status: 401 })
  try {
    const body = await request.json()
    return NextResponse.json(setFighterOnline(fighter.id, body.online === true))
  } catch {
    return NextResponse.json({ error: '在线状态更新失败' }, { status: 400 })
  }
}
