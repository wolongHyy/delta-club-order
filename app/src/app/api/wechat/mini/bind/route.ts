import { NextResponse } from 'next/server'
import { verifyMiniBindToken } from '@/lib/wechat'
import { customerCookie, ensureCustomerSession } from '@/lib/customer-auth'
import { requestIsSecure } from '@/lib/request'

export const dynamic = 'force-dynamic'

// 小程序登录页拿到 openid/手机号后，签发带签名的 bindToken；
// web-view 里的网页调用本接口完成顾客会话绑定（写入 Cookie）。
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const payload = verifyMiniBindToken(String(body.token || ''))
    if (!payload) return NextResponse.json({ error: '绑定凭证无效或已过期' }, { status: 401 })
    const session = await ensureCustomerSession(payload.openid, '', {
      nickname: payload.nickname || '',
      avatarUrl: payload.avatarUrl || '',
      phone: payload.phone || '',
    })
    const response = NextResponse.json({
      customerId: session.customerId,
      authenticated: true,
      openid: session.openid,
      nickname: session.nickname || '',
      phone: session.phone || '',
    })
    response.cookies.set(customerCookie(session, requestIsSecure(request)))
    return response
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '绑定失败' }, { status: 400 })
  }
}
