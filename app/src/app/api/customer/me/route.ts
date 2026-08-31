import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { customerCookie, ensureCustomerSession, readCustomerSession } from '@/lib/customer-auth'
import { requestIsSecure } from '@/lib/request'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await readCustomerSession()
  if (!session) return NextResponse.json({ customerId: '', authenticated: false }, { status: 401 })
  return NextResponse.json({ customerId: session.customerId, authenticated: session.authenticated })
}

export async function POST(request: Request) {
  if (!rateLimit(`customer-session:${clientIp(request)}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: '请求过于频繁' }, { status: 429 })
  }
  try {
    const body = await request.json().catch(() => ({}) as any)
    const session = await ensureCustomerSession('', String(body?.legacyCustomerId || ''))
    const response = NextResponse.json({ customerId: session.customerId, authenticated: session.authenticated })
    response.cookies.set(customerCookie(session, requestIsSecure(request)))
    return response
  } catch {
    return NextResponse.json({ error: '顾客身份初始化失败' }, { status: 500 })
  }
}
