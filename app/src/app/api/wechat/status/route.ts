import { NextResponse } from 'next/server'
import { wechatEnabled } from '@/lib/wechat'
import { readCustomerSession } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

// 前端用来判断：微信是否已配置、当前浏览器里是否已有微信身份
export async function GET(request: Request) {
  const session = await readCustomerSession()
  return NextResponse.json({
    enabled: wechatEnabled(),
    authenticated: Boolean(session?.openid),
    openid: session?.openid || '',
    nickname: session?.nickname || '',
    avatarUrl: session?.avatarUrl || '',
    phone: session?.phone || '',
  })
}
