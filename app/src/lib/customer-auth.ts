import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'customer_session'
const SESSION_DAYS = 30

export type CustomerSession = {
  customerId: string
  openid: string
  authenticated: boolean
  nickname?: string
  avatarUrl?: string
  phone?: string
}

function secret(): string {
  const value = process.env.CUSTOMER_SESSION_SECRET
  if (value) return value
  if (process.env.NODE_ENV !== 'production') return 'delta-customer-local-development'
  throw new Error('生产环境必须设置 CUSTOMER_SESSION_SECRET')
}

function signature(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function parseSession(value: string | undefined): CustomerSession | null {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 4) return null
  const [customerId, openid, expiresAt, received] = parts
  const profile = decodeProfile(openid)
  const payload = `${customerId}.${openid}.${expiresAt}`
  if (!customerId || !/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return null
  if (!safeEqual(received, signature(payload))) return null
  return {
    customerId,
    openid: profile.openid,
    authenticated: Boolean(profile.openid),
    nickname: profile.nickname || '',
    avatarUrl: profile.avatarUrl || '',
    phone: profile.phone || '',
  }
}

function encodeSession(session: CustomerSession): string {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  const openid = Buffer.from(
    JSON.stringify({
      openid: session.openid,
      nickname: session.nickname || '',
      avatarUrl: session.avatarUrl || '',
      phone: session.phone || '',
    }),
    'utf8',
  ).toString('base64url')
  const payload = `${session.customerId}.${openid}.${expiresAt}`
  return `${payload}.${signature(payload)}`
}

function decodeProfile(raw: string): { openid: string; nickname: string; avatarUrl: string; phone: string } {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (parsed && typeof parsed === 'object' && typeof parsed.openid === 'string') {
      return {
        openid: parsed.openid,
        nickname: String(parsed.nickname || ''),
        avatarUrl: String(parsed.avatarUrl || ''),
        phone: String(parsed.phone || ''),
      }
    }
  } catch {}
  return { openid: raw, nickname: '', avatarUrl: '', phone: '' }
}

export function newCustomerId(): string {
  return `u${Date.now().toString(36)}${randomBytes(5).toString('hex')}`
}

export async function readCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies()
  return parseSession(cookieStore.get(COOKIE_NAME)?.value)
}

export async function requireCustomer(): Promise<CustomerSession> {
  const session = await readCustomerSession()
  if (!session) throw Object.assign(new Error('请刷新页面获取顾客身份'), { status: 401 })
  return session
}

export async function ensureCustomerSession(
  openid = '',
  legacyCustomerId = '',
  profile: { nickname?: string; avatarUrl?: string; phone?: string } = {},
): Promise<CustomerSession> {
  const existing = await readCustomerSession()
  if (existing) {
    return {
      customerId: existing.customerId,
      openid: openid || existing.openid,
      authenticated: Boolean(openid || existing.openid),
      nickname: profile.nickname || existing.nickname || '',
      avatarUrl: profile.avatarUrl || existing.avatarUrl || '',
      phone: profile.phone || existing.phone || '',
    }
  }
  return {
    customerId: legacyCustomerId || newCustomerId(),
    openid,
    authenticated: Boolean(openid),
    nickname: profile.nickname || '',
    avatarUrl: profile.avatarUrl || '',
    phone: profile.phone || '',
  }
}

export function customerCookie(session: CustomerSession, secure = true) {
  return {
    name: COOKIE_NAME,
    value: encodeSession(session),
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: '/',
  }
}
