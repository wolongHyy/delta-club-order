'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Analytics, AnalyticsBreakdownRow, Companion, FighterAccount, ServiceType } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Card, Empty, Money, Select, StatusBadge, TextInput, cn } from '@/components/ui'

type RangePreset = 'today' | '7d' | '30d' | '90d' | 'custom' | 'all'

const PRESETS: { key: Exclude<RangePreset, 'custom'>; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' },
  { key: '90d', label: '近 90 天' },
  { key: 'all', label: '全部' },
]

const STATUS_OPTIONS = [
  { key: '', label: '全部状态' },
  { key: 'pending', label: '待抢单' },
  { key: 'assigned', label: '待服务' },
  { key: 'in_progress', label: '服务中' },
  { key: 'completion_pending', label: '待确认' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
]

const STATUS_LABELS: Record<string, string> = {
  pending: '待抢单',
  assigned: '待服务',
  in_progress: '服务中',
  completion_pending: '待确认',
  completed: '已完成',
  cancelled: '已取消',
}

const SOURCE_OPTIONS = [
  { key: '', label: '全部来源' },
  { key: 'unassigned', label: '公共抢单池' },
  { key: 'fighter', label: '打手抢单' },
  { key: 'admin', label: '管理员派单' },
  { key: 'customer', label: '顾客指定' },
]

const SOURCE_LABELS: Record<string, string> = {
  unassigned: '公共抢单池',
  fighter: '打手抢单',
  admin: '管理员派单',
  customer: '顾客指定',
}

function localDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function rangeFor(preset: Exclude<RangePreset, 'custom'>): { start: string; end: string } {
  const today = new Date()
  const end = localDate(today)
  if (preset === 'today') return { start: end, end }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : preset === '90d' ? 90 : 0
  if (!days) return { start: '', end: '' }
  const start = new Date(today)
  start.setDate(start.getDate() - days + 1)
  return { start: localDate(start), end }
}

export default function AdminAnalyticsWorkbench() {
  const [preset, setPreset] = useState<RangePreset>('30d')
  const [start, setStart] = useState(() => rangeFor('30d').start)
  const [end, setEnd] = useState(() => rangeFor('30d').end)
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [fighterId, setFighterId] = useState('')
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [companionId, setCompanionId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [fighters, setFighters] = useState<FighterAccount[]>([])
  const [services, setServices] = useState<ServiceType[]>([])
  const [companions, setCompanions] = useState<Companion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    if (status) params.set('status', status)
    if (source) params.set('source', source)
    if (fighterId) params.set('fighterId', fighterId)
    if (serviceTypeId) params.set('serviceTypeId', serviceTypeId)
    if (companionId) params.set('companionId', companionId)
    if (keyword) params.set('keyword', keyword)
    return params.toString()
  }, [start, end, status, source, fighterId, serviceTypeId, companionId, keyword])

  const load = useCallback(async (withLoading = false) => {
    if (withLoading) setLoading(true)
    try {
      const [data, fighterList, serviceList, companionList] = await Promise.all([
        api<Analytics>(`/api/admin/analytics?${query}`),
        api<FighterAccount[]>('/api/fighters/available'),
        api<ServiceType[]>('/api/service-types'),
        api<Companion[]>('/api/admin/companions'),
      ])
      setAnalytics(data)
      setFighters(fighterList)
      setServices(serviceList)
      setCompanions(companionList)
      setError('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => { load(true) }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(() => load(false), 30_000)
    return () => clearInterval(timer)
  }, [autoRefresh, load])

  function choosePreset(next: Exclude<RangePreset, 'custom'>) {
    setPreset(next)
    const range = rangeFor(next)
    setStart(range.start)
    setEnd(range.end)
  }

  const totals = analytics?.totals
  const metricCards = [
    { label: '订单总数', value: totals ? String(totals.orders) : '--', note: totals ? `有效 ${totals.validOrders}` : '' },
    { label: '完成营收', value: totals ? <Money value={totals.completedRevenue} /> : '--', note: totals ? `毛利率 ${totals.orders ? Math.round((totals.platformRevenue / (totals.completedRevenue || 1)) * 1000) / 10 : 0}%` : '' },
    { label: '平台分账', value: totals ? <Money value={totals.platformRevenue} /> : '--', note: totals ? '仅已完成订单' : '' },
    { label: '打手分账', value: totals ? <Money value={totals.fighterIncome} /> : '--', note: totals ? '仅已完成订单' : '' },
    { label: '客单价', value: totals ? <Money value={totals.avgOrderValue} /> : '--', note: '有效订单均价' },
    { label: '完成率', value: totals ? `${totals.completionRate}%` : '--', note: totals ? `完成 ${totals.completed}` : '' },
    { label: '取消率', value: totals ? `${totals.cancellationRate}%` : '--', note: totals ? `取消 ${totals.cancelled}` : '' },
    { label: '待抢单', value: totals ? String(totals.unassignedPending) : '--', note: totals ? `总待接 ${totals.pending}` : '' },
  ]

  const maxTrendOrders = Math.max(1, ...(analytics?.trend || []).map((row) => row.orders))
  const maxTrendRevenue = Math.max(1, ...(analytics?.trend || []).map((row) => row.completedRevenue))
  const statusCounts = analytics?.statusBreakdown || []
  const sourceRows = analytics?.sourceBreakdown || []
  const maxStatus = Math.max(1, ...statusCounts.map((row) => row.orders))
  const maxSource = Math.max(1, ...sourceRows.map((row) => row.orders))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">数据分析工作台</h1>
          <p className="mt-0.5 text-xs text-ink-faint">
            {analytics ? `更新于 ${analytics.generatedAt}` : '数据加载中'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-dim">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="h-3.5 w-3.5 accent-blue-600" />
            30 秒自动刷新
          </label>
          <Btn size="sm" variant="soft" onClick={() => load(true)} disabled={loading}>立即刷新</Btn>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => choosePreset(item.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs transition-colors',
                preset === item.key ? 'border-primary bg-primary/15 text-primary' : 'border-line text-ink-dim hover:text-ink',
              )}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPreset('custom')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs transition-colors',
              preset === 'custom' ? 'border-primary bg-primary/15 text-primary' : 'border-line text-ink-dim hover:text-ink',
            )}
          >
            自定义
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block"><span className="mb-1.5 block text-xs text-ink-dim">开始日期</span><TextInput type="date" value={start} onChange={(e) => { setStart(e.target.value); setPreset('custom') }} /></label>
          <label className="block"><span className="mb-1.5 block text-xs text-ink-dim">结束日期</span><TextInput type="date" value={end} onChange={(e) => { setEnd(e.target.value); setPreset('custom') }} /></label>
          <label className="block"><span className="mb-1.5 block text-xs text-ink-dim">订单状态</span><Select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS_OPTIONS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</Select></label>
          <label className="block"><span className="mb-1.5 block text-xs text-ink-dim">派单来源</span><Select value={source} onChange={(e) => setSource(e.target.value)}>{SOURCE_OPTIONS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</Select></label>
          <label className="block"><span className="mb-1.5 block text-xs text-ink-dim">打手</span><Select value={fighterId} onChange={(e) => setFighterId(e.target.value)}><option value="">全部打手</option>{fighters.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</Select></label>
          <label className="block"><span className="mb-1.5 block text-xs text-ink-dim">服务类型</span><Select value={serviceTypeId} onChange={(e) => { setServiceTypeId(e.target.value); setCompanionId('') }}><option value="">全部类型</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs text-ink-dim">服务项目</span><Select value={companionId} onChange={(e) => setCompanionId(e.target.value)}><option value="">全部项目</option>{companions.filter((item) => !serviceTypeId || item.serviceTypeId === serviceTypeId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs text-ink-dim">关键词</span><TextInput value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="订单号 / 顾客 / 服务" /></label>
        </div>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metricCards.map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-xs text-ink-faint">{item.label}</p>
            <p className="mt-1.5 text-xl font-bold text-primary-bright">{item.value}</p>
            <p className="mt-1.5 text-[11px] text-ink-faint">{item.note}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">订单与营收趋势</h2>
            <p className="mt-0.5 text-xs text-ink-faint">蓝色为订单数，绿色为完成营收</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-ink-dim">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-primary/70" />订单数</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-ok/70" />完成营收</span>
          </div>
        </div>
        {!analytics || analytics.trend.length === 0 ? (
          <Empty text="当前筛选暂无趋势数据" />
        ) : (
          <div className="flex h-44 items-end gap-2 overflow-x-auto pb-1">
            {analytics.trend.map((row) => (
              <div key={row.date} className="group relative flex min-w-8 flex-1 flex-col items-center gap-1.5">
                <div className="flex h-36 w-full items-end justify-center gap-1">
                  <div className="w-3 rounded-t-md bg-primary/70 transition-colors group-hover:bg-primary" style={{ height: `${Math.max(4, (row.orders / maxTrendOrders) * 100)}%` }} />
                  <div className="w-3 rounded-t-md bg-ok/70 transition-colors group-hover:bg-ok" style={{ height: `${Math.max(4, (row.completedRevenue / maxTrendRevenue) * 100)}%` }} />
                </div>
                <span className="whitespace-nowrap text-[10px] text-ink-faint">{row.date.slice(5)}</span>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-ink px-2.5 py-1.5 text-[11px] leading-4 text-white shadow-lg group-hover:block">
                  <p>{row.date}</p>
                  <p>订单 {row.orders} · 有效 {row.validOrders}</p>
                  <p>完成营收 <Money value={row.completedRevenue} /></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-ink">订单状态分布</h2>
          <div className="mt-3 space-y-2.5">
            {statusCounts.length === 0 && <Empty text="暂无状态数据" />}
            {statusCounts.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-ink-dim">{STATUS_LABELS[row.label] || row.label}</span>
                  <span className="font-semibold text-ink">{row.orders}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${(row.orders / maxStatus) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-ink">派单来源分析</h2>
          <div className="mt-3 space-y-2.5">
            {sourceRows.length === 0 && <Empty text="暂无来源数据" />}
            {sourceRows.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-ink-dim">{SOURCE_LABELS[row.label] || row.label}</span>
                  <span className="font-semibold text-ink">{row.orders} 单 · 完成率 {row.completionRate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                  <div className="h-full rounded-full bg-ok/70" style={{ width: `${(row.orders / maxSource) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <BreakdownCard title="服务项目排行" rows={analytics?.companionBreakdown || []} />
        <BreakdownCard title="打手接单排行" rows={analytics?.fighterBreakdown || []} />
        <BreakdownCard title="服务类型分析" rows={analytics?.serviceBreakdown || []} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">筛选结果订单明细</h2>
        </div>
        {!analytics || analytics.recentOrders.length === 0 ? (
          <Empty text="当前筛选暂无订单" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint">
                  <th className="px-4 py-2 font-normal">订单号</th>
                  <th className="px-4 py-2 font-normal">项目 / 服务</th>
                  <th className="px-4 py-2 font-normal">打手</th>
                  <th className="px-4 py-2 font-normal">来源</th>
                  <th className="px-4 py-2 font-normal">状态</th>
                  <th className="px-4 py-2 text-right font-normal">金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {analytics.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-2 text-xs text-ink-faint">{order.orderNo}</td>
                    <td className="px-4 py-2 text-ink">{order.companionName}<span className="ml-1 text-xs text-ink-faint">{order.serviceName}</span></td>
                    <td className="px-4 py-2 text-ink">{order.fighterName || '未分配'}</td>
                    <td className="px-4 py-2 text-ink-dim">{SOURCE_LABELS[order.assignedBy || 'unassigned'] || '公共抢单池'}</td>
                    <td className="px-4 py-2"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-2 text-right font-semibold text-primary-bright"><Money value={order.amount} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function BreakdownCard({ title, rows }: { title: string; rows: AnalyticsBreakdownRow[] }) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {!rows.length ? (
        <Empty text="暂无数据" />
      ) : (
        <ol className="mt-2 divide-y divide-line">
          {rows.map((row, index) => (
            <li key={`${row.label}-${index}`} className="py-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{index + 1}</span>
                  <span className="truncate">{row.label}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-faint">{row.orders} 单</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 pl-7 text-[11px] text-ink-faint">
                <span>完成营收 <Money value={row.completedRevenue} /></span>
                <span>完成率 {row.completionRate}%</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
