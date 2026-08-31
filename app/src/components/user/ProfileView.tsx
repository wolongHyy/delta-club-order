'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/client'
import { Avatar, Card, IconChevronRight, IconUser, IconUserPlus } from '@/components/ui'

export default function ProfileView({
  onOrders,
  onFighterApply,
}: {
  onOrders: () => void
  onFighterApply: () => void
}) {
  const [wechat, setWechat] = useState<{ enabled: boolean; authenticated: boolean; openid: string; nickname: string; avatarUrl: string; phone: string } | null>(null)

  useEffect(() => {
    api<{ enabled: boolean; authenticated: boolean; openid: string; nickname: string; avatarUrl: string; phone: string }>('/api/wechat/status')
      .then(setWechat)
      .catch(() => setWechat({ enabled: false, authenticated: false, openid: '', nickname: '', avatarUrl: '', phone: '' }))
  }, [])

  return (
    <div>
      <header className="border-b border-line bg-bg/95 px-4 pb-3 pt-4 backdrop-blur">
        <h1 className="text-lg font-bold text-ink">我的</h1>
      </header>
      <div className="space-y-3 p-4">
        <Card className="flex items-center gap-3 p-4">
          {wechat?.avatarUrl ? (
            <Avatar name={wechat.nickname || '我'} src={wechat.avatarUrl} size={56} />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface2 text-ink-faint">
              <IconUser size={26} />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">{wechat?.nickname || (wechat?.openid ? '微信已授权' : '未登录')}</p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {wechat?.openid
                ? `微信身份：…${wechat.openid.slice(-6)}${wechat.phone ? ` · 手机 ${wechat.phone}` : ''}`
                : wechat?.enabled
                  ? '微信授权登录后自动识别身份'
                  : '登录功能占位 · 后续迭代'}
            </p>
          </div>
          {wechat?.enabled && (
            <button
              type="button"
              onClick={() => { window.location.href = '/api/wechat/oauth?state=/' }}
              className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary"
            >
              {wechat.openid ? '重新授权' : '微信一键登录'}
            </button>
          )}
        </Card>

        <Card>
          <button
            type="button"
            onClick={onOrders}
            className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-primary/5"
          >
            <span className="text-sm font-medium text-ink">我的订单</span>
            <IconChevronRight size={18} className="text-ink-faint" />
          </button>
        </Card>

        <Card className="border-primary/25 bg-gradient-to-br from-sky-50 to-white">
          <button
            type="button"
            onClick={onFighterApply}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-primary/5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <IconUserPlus size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">打手入驻</p>
              <p className="mt-0.5 text-[11px] text-ink-faint">申请成为俱乐部打手，审核通过后可接单</p>
            </div>
            <IconChevronRight size={18} className="shrink-0 text-ink-faint" />
          </button>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '储值余额', value: '¥0.00' },
            { label: '优惠券', value: '0 张' },
            { label: '礼物币', value: '0' },
          ].map((a) => (
            <Card key={a.label} className="p-3 text-center">
              <p className="text-base font-bold text-primary-bright">{a.value}</p>
              <p className="mt-0.5 text-[11px] text-ink-faint">{a.label} · 占位</p>
            </Card>
          ))}
        </div>

        <Card className="divide-y divide-line">
          {['会员权益', 'VIP 专属客服', '联系客服', '设置'].map((row) => (
            <button
              key={row}
              type="button"
              className="flex w-full items-center justify-between p-4 text-left text-sm text-ink-dim transition-colors hover:bg-primary/5"
            >
              <span>{row}</span>
              <IconChevronRight size={16} className="text-ink-faint" />
            </button>
          ))}
        </Card>
      </div>
    </div>
  )
}
