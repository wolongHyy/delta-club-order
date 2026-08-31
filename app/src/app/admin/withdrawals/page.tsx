'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Withdrawal } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Card, Empty, Money, StatusBadge } from '@/components/ui'

export default function AdminWithdrawals() {
  const [items, setItems] = useState<Withdrawal[]>([])
  const [notice, setNotice] = useState('')
  const load = useCallback(() => { api<Withdrawal[]>('/api/admin/withdrawals').then(setItems).catch(() => setItems([])) }, [])
  useEffect(() => { load() }, [load])
  // 打手提交提现后自动同步到后台
  useEffect(() => { const timer = setInterval(load, 10000); return () => clearInterval(timer) }, [load])
  async function review(id: string, status: 'approved' | 'rejected') {
    try { await api(`/api/admin/withdrawals/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); setNotice(status === 'approved' ? '提现已通过' : '提现已驳回'); load() } catch (e: any) { setNotice(e.message) }
  }
  return <div className="space-y-4"><div className="flex items-start justify-between"><div><h1 className="text-lg font-bold text-ink">提现审核</h1><p className="mt-0.5 text-xs text-ink-faint">打手申请后自动同步到这里，通过后计入打手已提现金额</p></div><button type="button" onClick={load} className="text-xs text-primary">刷新</button></div>{notice && <p className="text-sm text-primary">{notice}</p>}{items.length ? <div className="space-y-2">{items.map((item) => <Card key={item.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-semibold text-ink">{item.fighterName}</p><StatusBadge status={item.status} /></div><p className="mt-1 text-lg font-bold text-primary-bright"><Money value={item.amount} /></p><p className="mt-1 break-all text-xs text-ink-dim">收款信息：{item.accountInfo}</p><p className="mt-1 text-xs text-ink-faint">申请时间：{item.createdAt}</p></div>{item.status === 'pending' && <div className="flex gap-1.5"><Btn size="sm" variant="soft" onClick={() => review(item.id, 'approved')}>通过</Btn><Btn size="sm" variant="danger" onClick={() => review(item.id, 'rejected')}>驳回</Btn></div>}</div></Card>)}</div> : <Card><Empty text="暂无提现申请" /></Card>}</div>
}
