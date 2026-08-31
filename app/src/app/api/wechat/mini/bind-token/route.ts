import { NextResponse } from 'next/server'
import { mintMiniBindToken } from '@/lib/wechat'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// 小程序登录页在拿到 openid（和可选手机号）后调用本接口，换取带回 web-view 的签名绑票
export async function POST(request: Request) {
  if (!rateLimit(`mini-bind-token:${clientIp(request)}`, 20, 60 * 1000)) {
    return NextResponse.json({ error: '操作太频繁，请稍后再试' }, { status: 429 })
  }
  try {
    const body = await request.json()
    const openid = String(body.openid || '').trim()
    if (!openid) return NextResponse.json({ error: '缺少 openid' }, { status: 400 })
    const token = mintMiniBindToken({
      openid,
      phone: String(body.phone || '').trim(),
      nickname: String(body.nickname || '').trim(),
      avatarUrl: String(body.avatarUrl || '').trim(),
    })
    return NextResponse.json({ token })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '生成绑定凭证失败' }, { status: 400 })
  }
}
