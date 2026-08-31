import { NextResponse } from 'next/server'
import { createFighterApplication, listFighterApplications } from '@/lib/db'
import { hashPassword } from '@/lib/fighter-auth'
import { readCustomerSession } from '@/lib/customer-auth'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { wechatEnabled } from '@/lib/wechat'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const customer = await readCustomerSession()
  if (!customer) return NextResponse.json({ error: '请刷新页面获取顾客身份' }, { status: 401 })
  return NextResponse.json(listFighterApplications({ customerId: customer.customerId }))
}

export async function POST(request: Request) {
  if (!rateLimit(`fighter-apply:${clientIp(request)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: '提交太频繁，请稍后再试' }, { status: 429 })
  }
  try {
    const customer = await readCustomerSession()
    if (!customer) return NextResponse.json({ error: '请刷新页面获取顾客身份' }, { status: 401 })
    if (wechatEnabled() && !customer.openid) {
      return NextResponse.json(
        { error: '请先微信授权，再提交打手入驻申请（审核通过后可一键微信登录打手端）' },
        { status: 400 },
      )
    }
    const body = await request.json()
    const gameName = String(body.gameName || '').trim()
    const contact = String(body.contact || '').trim()
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    if (!gameName || !contact || !username || password.length < 6) {
      return NextResponse.json({ error: '请填写游戏昵称和联系方式' }, { status: 400 })
    }
    if (listFighterApplications().some((a) => a.username === username)) return NextResponse.json({ error: '登录账号已被使用' }, { status: 409 })
    const app = createFighterApplication({
      customerId: customer.customerId,
      openid: customer.openid,
      nickname: customer.nickname || '',
      avatarUrl: customer.avatarUrl || '',
      gameName,
      contact,
      rank: String(body.rank || '').trim(),
      tier: String(body.tier || '').trim(),
      modes: Array.isArray(body.modes) ? body.modes.map(String) : [],
      intro: String(body.intro || '').trim(),
      username,
      passwordHash: hashPassword(password),
    })
    return NextResponse.json(app, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '提交失败' }, { status: 400 })
  }
}
