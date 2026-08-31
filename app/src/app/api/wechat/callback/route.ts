import { NextResponse } from 'next/server'
import {
  exchangeCodeForWechatUser,
  safeReturnPath,
  wechatEnabled,
} from '@/lib/wechat'
import { customerCookie, ensureCustomerSession } from '@/lib/customer-auth'
import { requestIsSecure } from '@/lib/request'

export const dynamic = 'force-dynamic'

// 微信回跳地址：用 code 换 openid → 写入浏览器 cookie → 跳回原页面
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = safeReturnPath(searchParams.get('state'))

  const failRedirect = () => {
    const fail = new URL('/?wechat_error=1', request.url)
    return NextResponse.redirect(fail)
  }

  if (!wechatEnabled() || !code) return failRedirect()

  try {
    const profile = await exchangeCodeForWechatUser(code)
    const target = new URL(state, request.url)
    const response = NextResponse.redirect(target)
    const session = await ensureCustomerSession(profile.openid, '', {
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl,
    })
    response.cookies.set(customerCookie(session, requestIsSecure(request)))
    response.cookies.set('wx_openid', '', { maxAge: 0, path: '/' })
    return response
  } catch {
    return failRedirect()
  }
}
