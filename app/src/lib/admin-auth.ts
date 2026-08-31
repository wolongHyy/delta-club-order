import { cookies } from 'next/headers'
import { recordAuditLog } from '@/lib/db'

const COOKIE_NAME = 'admin_session'
const SESSION_HOURS = 8
const encoder = new TextEncoder()

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD
  if (value) return value
  if (process.env.NODE_ENV !== 'production') return 'delta-admin-local-development'
  throw new Error('生产环境必须设置 ADMIN_SESSION_SECRET')
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(signatureBuffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD)
}

export function adminUsername(): string {
  return process.env.ADMIN_USERNAME || 'admin'
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  const expectedUsername = adminUsername()
  const expectedPassword = process.env.ADMIN_PASSWORD
  if (!expectedPassword) {
    if (process.env.NODE_ENV !== 'production') return username === expectedUsername && password === 'admin123'
    return false
  }
  const userOk = safeEqual(username, expectedUsername)
  const passwordOk = safeEqual(password, expectedPassword)
  return userOk && passwordOk
}

export async function createAdminSession(): Promise<string> {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const payload = `admin.${expiresAt}.${nonce}`
  return `${payload}.${await hmac(payload)}`
}

export async function verifyAdminSession(value: string | undefined): Promise<boolean> {
  if (!value) return false
  const parts = value.split('.')
  if (parts.length !== 4) return false
  const [role, expiresAt, nonce, received] = parts
  const payload = `${role}.${expiresAt}.${nonce}`
  if (role !== 'admin' || !nonce || !/^\d+$/.test(expiresAt)) return false
  if (Number(expiresAt) < Date.now()) return false
  if (!safeEqual(received, await hmac(payload))) return false
  return true
}

export async function currentAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  return verifyAdminSession(cookieStore.get(COOKIE_NAME)?.value)
}

export async function requireAdmin(): Promise<boolean> {
  if (await currentAdmin()) return true
  throw Object.assign(new Error('请先登录管理后台'), { status: 401 })
}

export async function auditAdminAction(
  request: Request,
  action: string,
  targetId = '',
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await requireAdmin()
  const url = new URL(request.url)
  recordAuditLog({
    action,
    actorType: 'admin',
    actorName: 'admin',
    targetId,
    method: request.method,
    path: url.pathname,
    metadata,
  })
}

export const ADMIN_SESSION_COOKIE = COOKIE_NAME
export const ADMIN_SESSION_MAX_AGE = SESSION_HOURS * 60 * 60
