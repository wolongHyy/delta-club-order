import { NextResponse } from 'next/server'
import { buildWechatAuthorizeUrl, safeReturnPath, wechatEnabled } from '@/lib/wechat'

// 入口：跳转到微信授权页，用户同意后微信会回跳到 /api/wechat/callback
export async function GET(request: Request) {
  if (!wechatEnabled()) {
    return NextResponse.json(
      { error: '微信服务号尚未配置（缺少 WECHAT_APPID / WECHAT_SECRET）' },
      { status: 503 },
    )
  }
  const { searchParams } = new URL(request.url)
  const state = safeReturnPath(searchParams.get('state'))
  return NextResponse.redirect(buildWechatAuthorizeUrl(state))
}
