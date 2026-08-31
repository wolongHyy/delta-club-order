import { NextResponse, type NextRequest } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (pathname === '/api/admin/auth/login' || pathname === '/admin/login') return NextResponse.next()

  const authorized = await verifyAdminSession(request.cookies.get('admin_session')?.value)
  if (authorized) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: '请先登录管理后台' }, { status: 401 })
  }
  const loginUrl = new URL('/admin/login', request.url)
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
