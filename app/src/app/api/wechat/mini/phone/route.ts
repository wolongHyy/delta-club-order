import { NextResponse } from 'next/server'
import { miniGetPhoneNumber } from '@/lib/wechat'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// 小程序端：getPhoneNumber 按钮返回的 code 换手机号
export async function POST(request: Request) {
  if (!rateLimit(`mini-phone:${clientIp(request)}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: '操作太频繁，请稍后再试' }, { status: 429 })
  }
  try {
    const body = await request.json()
    const openid = String(body.openid || '')
    const code = String(body.code || '')
    if (!openid || !code) return NextResponse.json({ error: '缺少 openid 或 code' }, { status: 400 })
    const phone = await miniGetPhoneNumber(openid, code)
    return NextResponse.json({ phone })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '获取手机号失败' }, { status: 400 })
  }
}
