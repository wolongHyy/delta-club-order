// 微信服务号（网页授权）工具：构建授权链接、用 code 换 openid/昵称/头像
// 所有配置都走环境变量；未配置时相关功能自动隐藏，不影响账号密码登录。

export const WECHAT_OPENID_COOKIE = 'wx_openid'

export function wechatEnabled(): boolean {
  return Boolean(process.env.WECHAT_APPID && process.env.WECHAT_SECRET)
}

export function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

export function buildWechatAuthorizeUrl(state: string): string {
  const appid = process.env.WECHAT_APPID || ''
  const scope = process.env.WECHAT_SCOPE || 'snsapi_userinfo'
  const redirectUri = encodeURIComponent(`${appBaseUrl()}/api/wechat/callback`)
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appid}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${encodeURIComponent(state)}#wechat_redirect`
}

// 用授权回调里的 code 向微信换取 openid 和用户资料（不保存 access_token，仅用于当次识别身份）
export async function exchangeCodeForWechatUser(
  code: string,
): Promise<{ openid: string; scope: string; accessToken: string; nickname: string; avatarUrl: string }> {
  const appid = process.env.WECHAT_APPID || ''
  const secret = process.env.WECHAT_SECRET || ''
  const url =
    `https://api.weixin.qq.com/sns/oauth2/access_token` +
    `?appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}&code=${encodeURIComponent(code)}&grant_type=authorization_code`
  const res = await fetch(url)
  const data = (await res.json().catch(() => null)) as
    | { openid?: string; access_token?: string; scope?: string; errcode?: number; errmsg?: string }
    | null
  if (!data || data.errcode || !data.openid) {
    throw new Error(data?.errmsg || '微信授权失败，请重试')
  }
  const openid = String(data.openid)
  const scope = String(data.scope || '')
  const accessToken = String(data.access_token || '')
  let nickname = ''
  let avatarUrl = ''
  if (scope.includes('snsapi_userinfo') && accessToken) {
    const infoUrl =
      `https://api.weixin.qq.com/sns/userinfo` +
      `?access_token=${encodeURIComponent(accessToken)}&openid=${encodeURIComponent(openid)}&lang=zh_CN`
    const infoRes = await fetch(infoUrl)
    const info = (await infoRes.json().catch(() => null)) as
      | { nickname?: string; headimgurl?: string; errcode?: number; errmsg?: string }
      | null
    if (info && !info.errcode) {
      nickname = String(info.nickname || '')
      avatarUrl = String(info.headimgurl || '')
    }
  }
  return { openid, scope, accessToken, nickname, avatarUrl }
}

// 校验授权后的回跳地址，只允许站内相对路径，防止被用来做开放跳转
export function safeReturnPath(raw: string | null): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//') && raw.length <= 200) return raw
  return '/'
}

export function readOpenidFromCookie(cookieHeader: string | null): string {
  if (!cookieHeader) return ''
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === WECHAT_OPENID_COOKIE) return rest.join('=').trim()
  }
  return ''
}

import { createHmac, timingSafeEqual } from 'node:crypto'

// ===== 微信小程序端（原生登录 + 手机号快捷验证）=====
// 小程序壳不是 web-view 内能完成的：wx.login 拿 code → 后端换 openid；
// getPhoneNumber 按钮返回 code → 后端换手机号。配置与网页授权分开：
//   WECHAT_MINI_APPID / WECHAT_MINI_SECRET（小程序 AppID/Secret）
// 未配置时进入本地开发模拟模式，便于先跑通流程。

export function miniWechatEnabled(): boolean {
  return Boolean(process.env.WECHAT_MINI_APPID && process.env.WECHAT_MINI_SECRET)
}

export async function miniExchangeCode(
  code: string,
): Promise<{ openid: string; sessionKey: string }> {
  if (!miniWechatEnabled()) {
    // 本地模拟：根据 code 生成稳定的模拟 openid，方便联调
    const seed = createHmac('sha256', 'delta-mini-mock').update(code || 'dev').digest('hex').slice(0, 24)
    return { openid: `mini_dev_${seed}`, sessionKey: 'mock_session_key' }
  }
  const url =
    `https://api.weixin.qq.com/sns/jscode2session` +
    `?appid=${encodeURIComponent(process.env.WECHAT_MINI_APPID || '')}` +
    `&secret=${encodeURIComponent(process.env.WECHAT_MINI_SECRET || '')}` +
    `&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
  const res = await fetch(url)
  const data = (await res.json().catch(() => null)) as
    | { openid?: string; session_key?: string; errcode?: number; errmsg?: string }
    | null
  if (!data || data.errcode || !data.openid) throw new Error(data?.errmsg || '小程序登录失败，请重试')
  return { openid: String(data.openid), sessionKey: String(data.session_key || '') }
}

async function miniAccessToken(): Promise<string> {
  const url =
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential` +
    `&appid=${encodeURIComponent(process.env.WECHAT_MINI_APPID || '')}` +
    `&secret=${encodeURIComponent(process.env.WECHAT_MINI_SECRET || '')}`
  const res = await fetch(url)
  const data = (await res.json().catch(() => null)) as { access_token?: string; errcode?: number; errmsg?: string } | null
  if (!data || !data.access_token) throw new Error(data?.errmsg || '获取微信 access_token 失败')
  return String(data.access_token)
}

export async function miniGetPhoneNumber(openid: string, code: string): Promise<string> {
  if (!miniWechatEnabled()) {
    // 本地模拟：固定返回一个测试手机号，正式配置后返回真实号码
    return '13800000000'
  }
  const token = await miniAccessToken()
  const res = await fetch(
    `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    },
  )
  const data = (await res.json().catch(() => null)) as
    | { errcode?: number; errmsg?: string; phone_info?: { phoneNumber?: string; purePhoneNumber?: string } }
    | null
  if (!data || data.errcode || !data.phone_info?.purePhoneNumber) throw new Error(data?.errmsg || '获取手机号失败，请重试')
  return String(data.phone_info.purePhoneNumber)
}

// 小程序把登录结果带回 web-view 的“绑票”：签名防伪造
function miniBindSecret(): string {
  return process.env.MINI_BIND_SECRET || process.env.CUSTOMER_SESSION_SECRET || 'delta-mini-bind-local'
}

export function mintMiniBindToken(payload: { openid: string; phone?: string; nickname?: string; avatarUrl?: string }): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', miniBindSecret()).update(body).digest('hex')
  return `${body}.${sig}`
}

export function verifyMiniBindToken(token: string): { openid: string; phone?: string; nickname?: string; avatarUrl?: string } | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', miniBindSecret()).update(body).digest('hex')
  const received = Buffer.from(sig, 'hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  if (received.length !== expectedBuf.length || !timingSafeEqual(received, expectedBuf)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!parsed || typeof parsed.openid !== 'string') return null
    return {
      openid: parsed.openid,
      phone: String(parsed.phone || ''),
      nickname: String(parsed.nickname || ''),
      avatarUrl: String(parsed.avatarUrl || ''),
    }
  } catch {
    return null
  }
}

