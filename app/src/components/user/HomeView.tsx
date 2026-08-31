'use client'

import { useEffect, useState } from 'react'
import type { Companion, HomeData } from '@/lib/types'
import { apiCached } from '@/lib/client'
import { Card, Empty, IconSearch, Tag, cn } from '@/components/ui'
import CompanionCard from './CompanionCard'

const SERVICE_ICONS: Record<string, string> = { 'gamepad-2': '🎮', shield: '🛡️', dices: '🎲', plus: '＋' }

const SORTS = [
  { key: 'default', label: '默认' },
  { key: 'sales', label: '销量' },
  { key: 'price', label: '价格' },
]

export default function HomeView({
  onOpenCompanion,
  onOpenCategory,
}: {
  onOpenCompanion: (id: string) => void
  onOpenCategory: (serviceTypeId?: string) => void
}) {
  const [data, setData] = useState<HomeData | null>(null)
  const [list, setList] = useState<Companion[]>([])
  const [sort, setSort] = useState('default')
  const [keyword, setKeyword] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    apiCached<HomeData>('/api/home', 30_000)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (sort !== 'default') params.set('sort', sort)
    if (keyword.trim()) params.set('keyword', keyword.trim())
    apiCached<Companion[]>(`/api/companions?${params.toString()}`, 20_000)
      .then(setList)
      .catch(() => setList([]))
  }, [sort, keyword])

  const banner = data?.banners?.[0] || { title: '三角洲行动 · 专业陪玩', subtitle: '高分段陪玩 上分无忧' }

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="px-4 pb-3 pt-4">
          <h1 className="mb-3 text-lg font-bold tracking-wide text-ink">
            三角洲游戏服务平台 <span className="ml-1 text-xs font-normal text-primary">DELTA GAME SERVICE</span>
          </h1>
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2">
            <IconSearch size={16} className="shrink-0 text-ink-faint" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索陪玩 / 护航 / 趣味单"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
        </div>
      </header>

      <div className="space-y-5 px-4 pt-4">
        <div className="relative overflow-hidden rounded-card border border-sky-200 bg-gradient-to-br from-sky-100 via-white to-white p-5 shadow-card">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <p className="text-lg font-bold text-ink">{banner.title}</p>
          <p className="mt-1 text-xs text-ink-dim">{banner.subtitle}</p>
          <span className="mt-4 inline-flex rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
            占位图 · 后续替换
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {data?.serviceTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpenCategory(t.id)}
              className="flex flex-col items-center gap-1.5 rounded-card border border-line bg-surface py-3 transition-colors hover:border-primary/40"
            >
              <span className="text-xl">{SERVICE_ICONS[t.icon] || '🎮'}</span>
              <span className="text-xs text-ink-dim">{t.name}</span>
            </button>
          ))}
          <button
            type="button"
            disabled
            className="flex flex-col items-center gap-1.5 rounded-card border border-dashed border-line bg-surface/40 py-3 opacity-60"
          >
            <span className="text-xl text-ink-faint">＋</span>
            <span className="text-xs text-ink-faint">更多</span>
          </button>
        </div>

        {data && data.hot.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">热门推荐</h2>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {data.hot.map((c) => (
                <div key={c.id} className="w-40 shrink-0">
                  <CompanionCard companion={c} onClick={() => onOpenCompanion(c.id)} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">全部陪玩</h2>
            <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-0.5">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs transition-colors',
                    sort === s.key ? 'bg-primary text-white' : 'text-ink-dim hover:text-ink',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {!loaded ? (
            <Card className="p-6 text-center text-sm text-ink-faint">加载中…</Card>
          ) : list.length === 0 ? (
            <Empty text={keyword ? '未找到相关陪玩' : '暂无在售陪玩'} />
          ) : (
            <div className="space-y-2">
              {list.map((c) => (
                <CompanionCard key={c.id} companion={c} onClick={() => onOpenCompanion(c.id)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
