'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Order } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Card, Empty, Money, StatusBadge, cn } from '@/components/ui'

const FILTERS = [
  { key: '', label: '全部' }, { key: 'pending', label: '待接单' }, { key: 'assigned', label: '待服务' },
  { key: 'in_progress', label: '服务中' }, { key: 'completion_pending', label: '待确认' }, { key: 'completed', label: '已完成' }, { key: 'cancelled', label: '已取消' },
]

export default function OrdersView({ refreshKey, onOpenOrder, onNotice }: { refreshKey: number; onOpenOrder: (id: string) => void; onNotice: (msg: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('')
  const [loaded, setLoaded] = useState(false)
  const load = useCallback(() => { const params = new URLSearchParams({ pageSize: '50' }); if (filter) params.set('status', filter); api<Order[]>(`/api/orders?${params}`).then(setOrders).catch(() => setOrders([])).finally(() => setLoaded(true)) }, [filter])
  useEffect(() => { load() }, [load, refreshKey])
  async function cancel(id: string) { try { await api(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }); onNotice('订单已取消'); load() } catch (e: any) { onNotice(e.message) } }
  return <div><header className="sticky top-0 z-30 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur"><h1 className="text-base font-semibold text-ink">我的订单</h1></header><div className="no-scrollbar sticky top-[49px] z-20 flex gap-1.5 overflow-x-auto border-b border-line bg-bg/95 px-4 py-2 backdrop-blur">{FILTERS.map((item) => <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={cn('shrink-0 rounded-full border px-3 py-1 text-xs', filter === item.key ? 'border-primary bg-primary/15 text-primary' : 'border-line text-ink-dim')}>{item.label}</button>)}</div><div className="space-y-2 p-4">{!loaded ? <Card className="p-6 text-center text-sm text-ink-faint">加载中...</Card> : orders.length === 0 ? <Empty text="暂无订单" /> : orders.map((order) => <Card key={order.id} className="cursor-pointer p-4" onClick={() => onOpenOrder(order.id)}><div className="flex items-center justify-between"><span className="text-xs text-ink-faint">{order.orderNo}</span><StatusBadge status={order.status} /></div><div className="mt-2 flex items-center justify-between"><span className="text-sm font-medium text-ink">{order.companionName}<span className="ml-1 text-xs text-ink-faint">{order.serviceName}</span></span><span className="text-sm font-bold text-primary-bright"><Money value={order.amount} /></span></div><p className="mt-1 text-[11px] text-ink-faint">{order.isTrial ? '体验单' : '普通订单'} · {order.fighterName ? `当前打手：${order.fighterName}` : '等待打手接单'}</p>{order.status === 'pending' && <Btn size="sm" variant="danger" className="mt-2" onClick={(event) => { event.stopPropagation(); cancel(order.id) }}>取消订单</Btn>}</Card>)}</div></div>
}
