import { NextResponse } from 'next/server'
import { currentFighter } from '@/lib/fighter-auth'
import { setFighterOnline } from '@/lib/db'
export async function POST() {
  const fighter = await currentFighter()
  if (fighter) setFighterOnline(fighter.id, false)
  const response = NextResponse.json({ ok: true })
  response.cookies.set('fighter_session', '', { maxAge: 0, path: '/' })
  return response
}
