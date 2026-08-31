import { NextResponse } from 'next/server'
import { getFighterByUsername, verifyPassword, sessionId } from '@/lib/fighter-auth'
import { setFighterOnline } from '@/lib/db'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { requestIsSecure } from '@/lib/request'

export async function POST(request: Request) {
  if (!rateLimit(`fighter-login:${clientIp(request)}`, 15, 15 * 60 * 1000)) {
    return NextResponse.json({ error: '登录尝试次数过多，请 15 分钟后再试（或重启服务立即恢复）' }, { status: 429 })
  }
  const body = await request.json()
  const account = getFighterByUsername(String(body.username || '').trim())
  if (!account || !account.enabled || !verifyPassword(String(body.password || ''), account.passwordHash)) {
    return NextResponse.json({ error: '账号、密码错误，或账号尚未审核通过' }, { status: 401 })
  }
  setFighterOnline(account.id, true)
  const response = NextResponse.json({ id: account.id, displayName: account.displayName })
  response.cookies.set('fighter_session', sessionId(account.id), { httpOnly: true, sameSite: 'lax', secure: requestIsSecure(request), maxAge: 60 * 60 * 24 * 14, path: '/' })
  return response
}
