export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data && typeof data.error === 'string' ? data.error : '请求失败，请重试'
    throw new Error(msg)
  }
  return data as T
}

// 简易内存缓存：短时间内重复请求同一个地址直接返回旧数据，
// 避免来回切换页面时反复请求、白屏等待。
const apiCache = new Map<string, { expire: number; data: unknown }>()

export async function apiCached<T>(path: string, ttlMs = 30_000): Promise<T> {
  const hit = apiCache.get(path)
  if (hit && hit.expire > Date.now()) return hit.data as T
  const data = await api<T>(path)
  apiCache.set(path, { expire: Date.now() + ttlMs, data })
  return data
}

export function getCustomerId(): string {
  if (typeof window === 'undefined') return ''
  const openid = getOpenid()
  if (openid) return openid
  let id = window.localStorage.getItem('delta_cid')
  if (!id) {
    id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    window.localStorage.setItem('delta_cid', id)
  }
  return id
}

export async function bootstrapCustomer(): Promise<{ customerId: string; authenticated: boolean }> {
  const legacyCustomerId = typeof window !== 'undefined' ? window.localStorage.getItem('delta_cid') || '' : ''
  const result = await api<{ customerId: string; authenticated: boolean }>('/api/customer/me', {
    method: 'POST',
    body: JSON.stringify({ legacyCustomerId }),
  })
  if (legacyCustomerId && legacyCustomerId !== result.customerId) {
    window.localStorage.setItem('delta_customer_migrated', legacyCustomerId)
    window.localStorage.removeItem('delta_cid')
  }
  return result
}

// 微信授权成功后，浏览器 cookie 里会有 wx_openid；没有就返回空字符串
export function getOpenid(): string {
  if (typeof window === 'undefined') return ''
  const m = document.cookie.match(/(?:^|;\s*)wx_openid=([^;]+)/)
  if (!m) return ''
  try {
    return decodeURIComponent(m[1])
  } catch {
    return m[1]
  }
}

export function fmtMoney(n: number): string {
  return '¥' + (Math.round(n * 100) / 100).toFixed(n % 1 === 0 ? 0 : 2)
}
