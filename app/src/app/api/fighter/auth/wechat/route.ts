import { NextResponse } from 'next/server'
import { getFighterByOpenid, setFighterOnline } from '@/lib/db'
import { sessionId } from '@/lib/fighter-auth'
import { readCustomerSession } from '@/lib/customer-auth'
import { requestIsSecure } from '@/lib/request'

export const dynamic = 'force-dynamic'

// 打手微信一键登录：读 cookie 里的 openid，找到已审核并绑定该微信的打手账号
export async function POST(request: Request) {
  const customer = await readCustomerSession()
  const openid = customer?.openid || ''
  if (!openid) {
    return NextResponse.json({ error: '未获取到微信身份，请先微信授权' }, { status: 401 })
  }

  const account = getFighterByOpenid(openid)
  if (!account || !account.enabled) {
    return NextResponse.json(
      { error: '该微信尚未绑定打手账号，请先在「我的 → 打手入驻」申请，审核通过后即可微信登录' },
      { status: 404 },
    )
  }

  setFighterOnline(account.id, true)
  const response = NextResponse.json({ id: account.id, displayName: account.displayName })
  response.cookies.set('fighter_session', sessionId(account.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: requestIsSecure(request),
    maxAge: 60 * 60 * 24 * 14,
    path: '/',
  })
  return response
}
