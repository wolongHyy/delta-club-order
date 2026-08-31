import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE, adminConfigured, createAdminSession, verifyAdminCredentials } from '@/lib/admin-auth'
import { requestIsSecure } from '@/lib/request'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!rateLimit(`admin-login:${clientIp(request)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: '登录尝试次数过多，请 15 分钟后再试（或重启服务立即恢复）' }, { status: 429 })
  }
  try {
    const body = await request.json()
    const ok = await verifyAdminCredentials(String(body.username || ''), String(body.password || ''))
    if (!ok) return NextResponse.json({ error: '管理员账号或密码错误' }, { status: 401 })
    const token = await createAdminSession()
    const response = NextResponse.json({ ok: true })
    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: requestIsSecure(request),
      maxAge: ADMIN_SESSION_MAX_AGE,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('admin login failed', error)
    return NextResponse.json({ error: adminConfigured() ? '登录失败' : '生产环境必须先设置 ADMIN_PASSWORD' }, { status: 400 })
  }
}
