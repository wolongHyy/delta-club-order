import { NextResponse } from 'next/server'
import { miniExchangeCode } from '@/lib/wechat'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// 小程序端：wx.login 的 code 换 openid（并短暂保存 session_key，供换手机号使用）
export async function POST(request: Request) {
  if (!rateLimit(`mini-login:${clientIp(request)}`, 20, 60 * 1000)) {
    return NextResponse.json({ error: '登录太频繁，请稍后再试' }, { status: 429 })
  }
  try {
    const body = await request.json()
    const code = String(body.code || '')
    if (!code) return NextResponse.json({ error: '缺少 wx.login code' }, { status: 400 })
    const result = await miniExchangeCode(code)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '登录失败' }, { status: 400 })
  }
}
