'use client'

import { useEffect, useState } from 'react'
import type { Companion, ServiceType } from '@/lib/types'
import { apiCached } from '@/lib/client'
import { Avatar, Btn, Card, IconBack, Money, Tag, cn } from '@/components/ui'

export type PlayMode = '单陪' | '双陪'
export type AddonKey = '教学单' | '甜蜜单'

export type OrderOptions = {
  mode?: PlayMode
  addons: AddonKey[]
  effectivePrice: number
  spec: string
}

const ADDON_PRICE = 20

export default function CompanionDetail({
  companionId,
  onBack,
  onCheckout,
}: {
  companionId: string
  onBack: () => void
  onCheckout: (companion: Companion, unitCount: number, opts: OrderOptions) => void
}) {
  const [companion, setCompanion] = useState<Companion | null>(null)
  const [types, setTypes] = useState<ServiceType[]>([])
  const [unitCount, setUnitCount] = useState(1)
  const [mode, setMode] = useState<PlayMode>('单陪')
  const [addons, setAddons] = useState<AddonKey[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiCached<Companion>(`/api/companions/${companionId}`, 30_000)
      .then(setCompanion)
      .catch((e) => setError(e.message))
    apiCached<ServiceType[]>('/api/service-types', 60_000)
      .then(setTypes)
      .catch(() => setTypes([]))
  }, [companionId])

  if (error) {
    return (
      <div className="p-4">
        <button type="button" onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-ink-dim">
          <IconBack size={18} /> 返回
        </button>
        <Card className="p-6 text-center text-sm text-danger">{error}</Card>
      </div>
    )
  }

  if (!companion) {
    return (
      <div className="p-4">
        <button type="button" onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-ink-dim">
          <IconBack size={18} /> 返回
        </button>
        <Card className="p-6 text-center text-sm text-ink-faint">加载中…</Card>
      </div>
    )
  }

  const serviceName = types.find((t) => t.id === companion.serviceTypeId)?.name || '陪玩'
  const isHourly = companion.unit === '小时'
  const isFixedUnit = !isHourly
  const modePrice = isHourly ? companion.price * (mode === '双陪' ? 2 : 1) : companion.price
  const effectivePrice = modePrice + addons.length * ADDON_PRICE
  const spec = isHourly ? [mode, ...addons].join(' · ') : ''
  const total = effectivePrice * unitCount

  function toggleAddon(key: AddonKey) {
    setAddons((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={onBack} className="rounded-full p-1 text-ink-dim hover:text-ink">
          <IconBack size={20} />
        </button>
        <h1 className="text-base font-semibold text-ink">服务详情</h1>
      </header>

      <div className="space-y-3 p-4">
        <Card className="flex items-center gap-4 p-4">
          <Avatar name={companion.name} size={72} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-ink">{companion.name}</span>
              {companion.gender && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary">{companion.gender}</span>}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <Tag className="border-primary/40 text-primary">{serviceName}</Tag>
              {companion.rank && <Tag>{companion.rank}</Tag>}
            </div>
            <p className="mt-2 text-xl font-bold text-primary">
              <Money value={effectivePrice} />
              <span className="ml-1 text-xs font-normal text-ink-faint">
                /{companion.unit}
                {isHourly && mode === '双陪' ? '（双陪）' : ''}
              </span>
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">标签</h2>
          <div className="flex flex-wrap gap-1.5">
            {companion.tags.length === 0 ? (
              <span className="text-xs text-ink-faint">暂无标签</span>
            ) : (
              companion.tags.map((t) => <Tag key={t}>{t}</Tag>)
            )}
          </div>
          <h2 className="mb-1 mt-4 text-sm font-semibold text-ink">服务介绍</h2>
          <p className="text-xs leading-5 text-ink-dim">{companion.description || '占位介绍，等待补充。'}</p>
        </Card>

        {isHourly && (
          <>
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">陪玩模式</h2>
                <span className="text-xs text-ink-faint">双陪按单价 ×2</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['单陪', '双陪'] as PlayMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      'rounded-btn border px-3 py-2.5 text-sm transition-colors',
                      mode === m
                        ? 'border-primary bg-primary/15 text-primary shadow-glow'
                        : 'border-line bg-surface2 text-ink-dim hover:text-ink',
                    )}
                  >
                    <span className="block font-medium">{m}</span>
                    <span className="mt-0.5 block text-[11px] opacity-80">
                      <Money value={companion.price * (m === '双陪' ? 2 : 1)} />
                      /小时
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">加购服务</h2>
                <span className="text-xs text-ink-faint">每项 +20 元/小时</span>
              </div>
              <div className="space-y-2">
                {(
                  [
                    { key: '教学单' as AddonKey, desc: '陪玩同时教学打法' },
                    { key: '甜蜜单' as AddonKey, desc: '甜蜜语音陪伴' },
                  ] as const
                ).map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => toggleAddon(a.key)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-btn border px-3 py-2.5 text-left text-sm transition-colors',
                      addons.includes(a.key)
                        ? 'border-primary bg-primary/10 text-ink'
                        : 'border-line bg-surface2 text-ink-dim hover:text-ink',
                    )}
                  >
                    <span>
                      {a.key}
                      <span className="ml-1.5 text-[11px] text-ink-faint">{a.desc}</span>
                    </span>
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full border text-xs',
                        addons.includes(a.key) ? 'border-primary bg-primary text-white' : 'border-line text-transparent',
                      )}
                    >
                      ✓
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </>
        )}

        {isFixedUnit ? (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">购买数量</h2>
              <span className="text-xs text-ink-faint">固定 1 单</span>
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">选择时长</h2>
              <span className="text-xs text-ink-faint">单位：{companion.unit}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 6, 8].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnitCount(u)}
                  className={cn(
                    'min-w-14 rounded-btn border px-3 py-2 text-sm transition-colors',
                    unitCount === u
                      ? 'border-primary bg-primary/15 text-primary shadow-glow'
                      : 'border-line bg-surface2 text-ink-dim hover:text-ink',
                  )}
                >
                  {u} 小时
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div>
            <p className="text-[11px] text-ink-faint">合计</p>
            <p className="text-lg font-bold text-primary">
              <Money value={total} />
            </p>
          </div>
          <Btn
            onClick={() =>
              onCheckout(companion, unitCount, {
                mode: isHourly ? mode : undefined,
                addons,
                effectivePrice,
                spec,
              })
            }
          >
            立即下单
          </Btn>
        </div>
      </div>
    </div>
  )
}
