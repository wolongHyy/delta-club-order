'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FighterAccount, Order } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Card, Empty, Money, StatusBadge, cn } from '@/components/ui'

const FILTERS = [
  { key: '', label: '全部' }, { key: 'unpaid', label: '待付款' }, { key: 'pending', label: '待接单' }, { key: 'assigned', label: '待服务' },
  { key: 'in_progress', label: '服务中' }, { key: 'completion_pending', label: '待确认' },
  { key: 'completed', label: '已完成' }, { key: 'cancelled', label: '已取消' },
]

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [fighters, setFighters] = useState<FighterAccount[]>([])
  const [filter, setFilter] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('status') || ''
  })
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const lastCount = useRef(0)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: '100' })
    if (filter) params.set('status', filter)
    try {
    const [orderList, fighterList] = await Promise.all([api<Order[]>(`/api/admin/orders?${params}`), api<FighterAccount[]>('/api/fighters/available')])
      if (lastCount.current > 0 && orderList.length > lastCount.current) setNotice(`有新订单，列表已刷新`)
      lastCount.current = orderList.length
      setOrders(orderList); setFighters(fighterList)
    } catch { setOrders([]) } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  // 后台自动刷新：第一时间看到新订单
  useEffect(() => {
    const timer = setInterval(() => { load() }, 15000)
    return () => clearInterval(timer)
  }, [load])

  async function markPaid(id: string) { try { await api(`/api/admin/orders/${id}/pay`, { method: 'PATCH' }); setNotice('已标记为线下已收款，订单进入待接单'); await load() } catch (e: any) { setNotice(e.message) } }
  async function assign(id: string, fighterId: string) { try { await api(`/api/admin/orders/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ fighterId }) }); setNotice('派单已更新'); await load() } catch (e: any) { setNotice(e.message) } }
  async function complete(id: string) { try { await api(`/api/admin/orders/${id}/complete`, { method: 'PATCH' }); setNotice('订单已确认完成，收益已结算给打手'); await load() } catch (e: any) { setNotice(e.message) } }
  async function cancel(id: string) { try { await api(`/api/admin/orders/${id}/cancel`, { method: 'PATCH' }); setNotice('订单已取消'); await load() } catch (e: any) { setNotice(e.message) } }

  return <div className="space-y-4"><div><h1 className="text-lg font-bold text-ink">订单调度</h1><p className="mt-0.5 text-xs text-ink-faint">付款确认、管理员派单、完工确认；已被打手抢走的订单不可强行改派</p></div><div className="flex flex-wrap gap-1.5">{FILTERS.map((item) => <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={cn('rounded-full border px-3 py-1.5 text-xs', filter === item.key ? 'border-primary bg-primary/15 text-primary' : 'border-line text-ink-dim')}>{item.label}</button>)}</div>{notice && <p className="text-sm text-primary">{notice}</p>}{loading ? <Card className="p-6 text-center text-sm text-ink-faint">加载中...</Card> : !orders.length ? <Card><Empty text="暂无订单" /></Card> : <div className="space-y-2">{orders.map((order) => <Card key={order.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-ink">{order.companionName}</p><StatusBadge status={order.status} />{order.isTrial && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">体验单</span>}{!order.paid && order.status === 'unpaid' && <span className="rounded-full bg-warn/10 px-2 py-0.5 text-[11px] text-warn">待付款</span>}</div><p className="mt-1 text-xs text-ink-faint">{order.orderNo} · {order.serviceName} · {order.customerName || '匿名顾客'}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</p><p className="mt-1 text-xs text-ink-dim">打手：{order.fighterName || '尚未分配'}　来源：{({ customer: '顾客指定', fighter: '打手抢单', admin: '管理员派单' } as Record<string, string>)[order.assignedBy] || '公共抢单池'}</p><p className="mt-1 text-xs text-ink-dim">区服：{order.gameField || '未填写'}　段位：{order.rank || '未填写'}</p>{order.completionRequestedAt && <p className="mt-1 text-xs text-warn">申请完工：{order.completionRequestedAt}</p>}{order.completionNote && <p className="mt-1 text-xs text-ink-dim">结单说明：{order.completionNote}</p>}{order.completionProof.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{order.completionProof.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="结单截图" className="h-16 w-16 rounded-btn border border-line object-cover" /></a>)}</div>}</div><div className="flex shrink-0 flex-col items-end gap-2"><span className="text-lg font-bold text-primary-bright"><Money value={order.amount} /></span>{order.status === 'unpaid' && <Btn size="sm" variant="soft" onClick={() => markPaid(order.id)}>标记线下已收款</Btn>}{order.status === 'pending' && <select value={order.fighterId} onChange={(e) => assign(order.id, e.target.value)} className="max-w-32 rounded-btn border border-line bg-surface2 px-2 py-1.5 text-xs text-ink"><option value="">公共抢单池</option>{fighters.map((fighter) => <option key={fighter.id} value={fighter.id}>{fighter.displayName}{fighter.tier === '娱乐' ? '（娱乐）' : ''}</option>)}</select>}{order.status === 'assigned' && order.assignedBy === 'admin' && <select value={order.fighterId} onChange={(e) => assign(order.id, e.target.value)} className="max-w-32 rounded-btn border border-line bg-surface2 px-2 py-1.5 text-xs text-ink"><option value="">放回公共抢单池</option>{fighters.map((fighter) => <option key={fighter.id} value={fighter.id}>{fighter.displayName}</option>)}</select>}{order.status === 'assigned' && order.assignedBy !== 'admin' && <p className="text-[11px] text-ink-faint">已被{order.assignedBy === 'fighter' ? '打手抢单' : '顾客指定'}，不可强行改派</p>}{order.status === 'completion_pending' && <Btn size="sm" variant="soft" onClick={() => complete(order.id)}>确认完成</Btn>}{['unpaid', 'pending', 'assigned', 'in_progress'].includes(order.status) && <Btn size="sm" variant="danger" onClick={() => cancel(order.id)}>取消</Btn>}</div></div></Card>)}</div>}</div>
}
