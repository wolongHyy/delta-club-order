'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FighterApplication } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Card, Empty, FighterStatusBadge, Tag, cn } from '@/components/ui'

const FILTERS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已拒绝' },
]

export default function AdminFighterApplications() {
  const [list, setList] = useState<FighterApplication[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (filter) params.set('status', filter)
    api<FighterApplication[]>(`/api/admin/fighter-applications?${params.toString()}`)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  async function review(id: string, status: 'approved' | 'rejected') {
    await api(`/api/admin/fighter-applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
    load()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">打手申请</h1>
        <p className="mt-0.5 text-xs text-ink-faint">审核打手入驻申请，通过后自动登记为打手商品</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs transition-colors',
              filter === f.key ? 'border-primary bg-primary/15 text-primary' : 'border-line text-ink-dim hover:text-ink',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-6 text-center text-sm text-ink-faint">加载中…</Card>
      ) : list.length === 0 ? (
        <Card>
          <Empty text="暂无打手申请" />
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{a.gameName}</span>
                    <FighterStatusBadge status={a.status} />
                  </div>
                  <p className="mt-1 text-xs text-ink-dim">
                    联系方式：{a.contact} · 段位：{a.rank || '未填'}{a.tier ? ` · 档次：${a.tier}` : ''}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {a.modes.length === 0 ? (
                      <span className="text-[11px] text-ink-faint">未选擅长模式</span>
                    ) : (
                      a.modes.map((m) => (
                        <Tag key={m} className="border-primary/30 text-primary">
                          {m}
                        </Tag>
                      ))
                    )}
                  </div>
                  {a.intro && <p className="mt-1.5 text-xs text-ink-dim">自我介绍：{a.intro}</p>}
                  <p className="mt-1 text-[11px] text-ink-faint">申请时间：{a.createdAt}</p>
                </div>
                {a.status === 'pending' && (
                  <div className="flex shrink-0 gap-1.5">
                    <Btn size="sm" variant="soft" onClick={() => review(a.id, 'approved')}>
                      通过
                    </Btn>
                    <Btn size="sm" variant="danger" onClick={() => review(a.id, 'rejected')}>
                      拒绝
                    </Btn>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
