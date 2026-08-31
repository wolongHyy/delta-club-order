'use client'

import { useEffect, useState } from 'react'
import type { Companion, ServiceType } from '@/lib/types'
import { apiCached } from '@/lib/client'
import { Empty, IconSearch, cn } from '@/components/ui'
import CompanionCard from './CompanionCard'

export default function CategoryView({
  initialServiceTypeId,
  onOpenCompanion,
}: {
  initialServiceTypeId?: string
  onOpenCompanion: (id: string) => void
}) {
  const [types, setTypes] = useState<ServiceType[]>([])
  const [activeId, setActiveId] = useState(initialServiceTypeId || '')
  const [list, setList] = useState<Companion[]>([])
  const [keyword, setKeyword] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    apiCached<ServiceType[]>('/api/service-types', 60_000)
      .then((t) => {
        setTypes(t)
        if (!initialServiceTypeId && t.length > 0) setActiveId(t[0].id)
      })
      .catch(() => setTypes([]))
  }, [initialServiceTypeId])

  useEffect(() => {
    const params = new URLSearchParams()
    if (activeId) params.set('serviceTypeId', activeId)
    if (keyword.trim()) params.set('keyword', keyword.trim())
    apiCached<Companion[]>(`/api/companions?${params.toString()}`, 20_000)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoaded(true))
  }, [activeId, keyword])

  const navItems = [{ id: '', name: '全部' }, ...types]

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-line bg-bg/95 px-4 pb-3 pt-4 backdrop-blur">
        <h1 className="mb-3 text-lg font-bold text-ink">分类</h1>
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2">
          <IconSearch size={16} className="shrink-0 text-ink-faint" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索陪玩"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="w-20 shrink-0 overflow-y-auto border-r border-line bg-surface/50 py-2">
          {navItems.map((t) => {
            const on = activeId === t.id
            return (
              <button
                key={t.id || 'all'}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={cn(
                  'block w-full border-l-2 px-2 py-3 text-center text-xs transition-colors',
                  on ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-ink-dim hover:text-ink',
                )}
              >
                {t.name}
              </button>
            )
          })}
          <div className="px-2 py-3 text-center text-xs text-ink-faint opacity-70">更多服务<br />敬请期待</div>
        </nav>
        <div className="min-w-0 flex-1 overflow-y-auto p-3 pb-24">
          {!loaded ? (
            <div className="py-10 text-center text-sm text-ink-faint">加载中…</div>
          ) : list.length === 0 ? (
            <Empty text="该分类暂无商品" />
          ) : (
            <div className="space-y-2">
              {list.map((c) => (
                <CompanionCard key={c.id} companion={c} onClick={() => onOpenCompanion(c.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
