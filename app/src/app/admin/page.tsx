'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Analytics, Order } from '@/lib/types'
import { api } from '@/lib/client'
import { Card, Money, StatusBadge } from '@/components/ui'

const STATUS_ROWS = [
  { key: 'pending', label: '待抢单', tone: 'bg-warn' },
  { key: 'assigned', label: '待服务', tone: 'bg-primary' },
  { key: 'in_progress', label: '服务中', tone: 'bg-ok' },
  { key: 'completion_pending', label: '待确认', tone: 'bg-amber-500' },
  { key: 'completed', label: '已完成', tone: 'bg-emerald-600' },
  { key: 'cancelled', label: '已取消', tone: 'bg-ink-faint' },
]

function localDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<Analytics | null>(null)
  const [today, setToday] = useState<Analytics | null>(null)
  const [week, setWeek] = useState<Analytics | null>(null)
  const [pending, setPending] = useState<Order[]>([])

  const load = useCallback(async () => {
    const now = new Date()
    const day = localDate(now)
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 6)
    const range = new URLSearchParams({ start: localDate(weekStart), end: day })
    const dayQuery = new URLSearchParams({ start: day, end: day })
    try {
      const [overviewData, todayData, weekData, pendingData] = await Promise.all([
        api<Analytics>('/api/admin/analytics'),
        api<Analytics>(`/api/admin/analytics?${dayQuery}`),
        api<Analytics>(`/api/admin/analytics?${range}`),
        api<Order[]>('/api/admin/orders?status=pending&pageSize=100'),
      ])
      setOverview(overviewData)
      setToday(todayData)
      setWeek(weekData)
      setPending(pendingData)
    } catch {
      setOverview(null)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 15_000)
    return () => clearInterval(timer)
  }, [load])

  const cards: { label: string; value: ReactNode; note: string; href: string }[] = [
    { label: '今日订单', value: today ? String(today.totals.orders) : '--', note: `有效 ${today?.totals.validOrders ?? 0}`, href: '/admin/orders' },
    { label: '今日完成营收', value: today ? <Money value={today.totals.completedRevenue} /> : '--', note: '已完成订单，含平台分账', href: '/admin/orders?status=completed' },
    { label: '服务中订单', value: overview ? String(overview.totals.inProgress) : '--', note: `待确认 ${overview?.totals.completionPending ?? 0}`, href: '/admin/orders?status=in_progress' },
    { label: '待抢单', value: overview ? String(overview.totals.unassignedPending) : '--', note: `总待接 ${overview?.totals.pending ?? 0}`, href: '/admin/orders?status=pending' },
    { label: '近 7 天完成率', value: week ? `${week.totals.completionRate}%` : '--', note: `完成 ${week?.totals.completed ?? 0}`, href: '/admin/stats' },
  ]

  const statusCounts = overview?.statusBreakdown || []
  const statusTotals: Record<string, number | undefined> = overview ? {
    pending: overview.totals.pending,
    assigned: overview.totals.assigned,
    in_progress: overview.totals.inProgress,
    completion_pending: overview.totals.completionPending,
    completed: overview.totals.completed,
    cancelled: overview.totals.cancelled,
  } : {}
  const statusValues = STATUS_ROWS.map((row) => ({
    ...row,
    value: statusCounts.find((item) => item.label === row.key)?.orders || statusTotals[row.key] || 0,
  }))
  const maxStatus = Math.max(1, ...statusValues.map((row) => row.value))
  const maxWeekCount = Math.max(1, ...(week?.trend || []).map((row) => row.orders))
  const maxWeekRevenue = Math.max(1, ...(week?.trend || []).map((row) => row.completedRevenue))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink">管理仪表盘</h1>
          <p className="mt-0.5 text-xs text-ink-faint">
            {overview ? `每 15 秒同步 · 更新于 ${overview.generatedAt}` : '数据同步中'}
          </p>
        </div>
        <Link href="/admin/stats" className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-dim transition-colors hover:text-ink">
          进入数据分析工作台
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group block rounded-card border border-line bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
          >
            <p className="text-xs text-ink-faint">{card.label}</p>
            <p className="mt-1.5 text-xl font-bold text-primary-bright">{card.value}</p>
            <p className="mt-2 text-[11px] text-ink-faint">{card.note}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">近 7 日趋势</h2>
              <p className="mt-0.5 text-xs text-ink-faint">蓝色为订单数，绿色为完成营收</p>
            </div>
            <Link href="/admin/stats" className="text-xs text-primary hover:underline">筛选分析</Link>
          </div>
          {!week ? (
            <div className="flex h-40 items-center justify-center text-sm text-ink-faint">加载中...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {week.trend.map((row) => (
                <div key={row.date} className="group relative flex flex-col items-center gap-1.5 pt-3">
                  <div className="flex h-32 w-full items-end justify-center gap-1">
                    <div className="w-3 rounded-t-md bg-primary/70 transition-all group-hover:bg-primary" style={{ height: `${Math.max(5, (row.orders / maxWeekCount) * 100)}%` }} />
                    <div className="w-3 rounded-t-md bg-ok/70 transition-all group-hover:bg-ok" style={{ height: `${Math.max(5, (row.completedRevenue / maxWeekRevenue) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-ink-faint">{row.date.slice(5)}</span>
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-ink px-2.5 py-1.5 text-[11px] leading-4 text-white shadow-lg group-hover:block">
                    <p>{row.date}</p>
                    <p>订单 {row.orders} 单</p>
                    <p>完成营收 <Money value={row.completedRevenue} /></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-ink">订单状态分布</h2>
          <p className="mt-0.5 text-xs text-ink-faint">全量订单实时分布</p>
          <div className="mt-4 space-y-3">
            {statusValues.map((row) => (
              <Link
                key={row.key}
                href={`/admin/orders?status=${row.key}`}
                className="group block rounded-btn p-1 transition-colors hover:bg-primary/5"
              >
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-ink-dim">{row.label}</span>
                  <span className="font-semibold text-ink">{row.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                  <div className={`h-full rounded-full ${row.tone} transition-all group-hover:opacity-80`} style={{ width: `${(row.value / maxStatus) * 100}%` }} />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-ink">服务项目排行</h2>
          <p className="mt-0.5 text-xs text-ink-faint">按订单量排序</p>
          <div className="mt-3">
            {!overview || overview.companionBreakdown.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-faint">暂无订单数据</p>
            ) : (
              <ol className="divide-y divide-line">
                {overview.companionBreakdown.slice(0, 5).map((row, index) => (
                  <li key={row.label} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{index + 1}</span>
                      <span className="truncate">{row.label}</span>
                    </span>
                    <span className="shrink-0 text-xs text-ink-faint">{row.orders} 单</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">待派单 / 待抢单</h2>
            <Link href="/admin/orders?status=pending" className="text-xs text-primary hover:underline">查看全部</Link>
          </div>
          {pending.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink-faint">暂无待派单订单</p>
          ) : (
            <div className="divide-y divide-line">
              {pending.slice(0, 5).map((order) => (
                <Link key={order.id} href="/admin/orders?status=pending" className="flex flex-wrap items-center gap-2 px-4 py-3 transition-colors hover:bg-primary/5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-faint">{order.orderNo}</p>
                    <p className="truncate text-sm text-ink">{order.companionName} <span className="text-xs text-ink-faint">{order.serviceName}</span></p>
                  </div>
                  <StatusBadge status={order.status} />
                  <span className="text-sm font-bold text-primary-bright"><Money value={order.amount} /></span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
