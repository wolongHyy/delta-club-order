import { NextResponse } from 'next/server'
import { currentFighter } from '@/lib/fighter-auth'
import { updateFighterProfile } from '@/lib/db'

export async function PATCH(request: Request) {
  const fighter = await currentFighter()
  if (!fighter) return NextResponse.json({ error: '请先登录打手端' }, { status: 401 })
  try {
    const body = await request.json()
    const result = updateFighterProfile(fighter.id, {
      displayName: body.displayName === undefined ? undefined : String(body.displayName),
      online: body.online === true,
    })
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '资料更新失败' }, { status: 400 })
  }
}
