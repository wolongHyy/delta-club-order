'use client'

import { useEffect, useState } from 'react'
import type { Order } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Card, IconBack, Money, StatusBadge } from '@/components/ui'

export default function OrderDetailView({ orderId, onBack, onCancelled, onNotice }: { orderId: string; onBack: () => void; onCancelled: () => void; onNotice: (msg: string) => void }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<Order>(`/api/orders/${orderId}`).then(setOrder).catch((e) => setError(e.message)) }, [orderId])
  async function cancel() { try { await api(`/api/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }); onNotice('订单已取消'); onCancelled(); setOrder(await api<Order>(`/api/orders/${orderId}`)) } catch (e: any) { onNotice(e.message) } }
  async function pay() { try { await api(`/api/orders/${orderId}/pay`, { method: 'POST' }); onNotice('支付成功，已进入待接单'); setOrder(await api<Order>(`/api/orders/${orderId}`)) } catch (e: any) { onNotice(e.message) } }
  if (!order) return <div className="p-4"><button type="button" onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-ink-dim"><IconBack size={18} />返回</button><Card className="p-6 text-center text-sm text-ink-faint">{error || '加载中...'}</Card></div>
  const source = ({ customer: '顾客指定', fighter: '打手抢单', admin: '管理员派单' } as Record<string, string>)[order.assignedBy] || '公共抢单池'
  return <div><header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur"><button type="button" onClick={onBack} className="rounded-full p-1 text-ink-dim"><IconBack size={20} /></button><h1 className="text-base font-semibold text-ink">订单详情</h1></header><div className="space-y-3 p-4"><Card className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-ink-faint">{order.orderNo}</span><StatusBadge status={order.status} /></div><div className="mt-3 flex items-center justify-between"><span className="font-semibold text-ink">{order.companionName}</span><span className="text-lg font-bold text-primary-bright"><Money value={order.amount} /></span></div><p className="mt-1 text-xs text-ink-faint">{order.serviceName} · {order.unitCount} 单位 · {order.createdAt}</p></Card><Card className="space-y-2 p-4 text-sm"><Info label="订单类型" value={order.isTrial ? '体验单' : '普通订单'} /><Info label="支付状态" value={order.paid ? `已付款${order.paymentMethod === 'offline' ? '（线下收款）' : ''}` : '待付款'} />{order.customerPhone ? <Info label="联系电话" value={order.customerPhone} /> : null}<Info label="当前打手" value={order.fighterName || '等待接单'} /><Info label="订单归属" value={source} /><Info label="游戏区服" value={order.gameField || '未填写'} /><Info label="段位要求" value={order.rank || '未填写'} /><Info label="备注" value={order.remark || '无'} />{order.completionRequestedAt && <Info label="完工申请" value="等待管理员确认" />}</Card>{order.status === 'unpaid' && <div className="space-y-2"><Btn block onClick={pay}>去支付</Btn><Btn variant="danger" block onClick={cancel}>取消订单</Btn></div>}{order.status === 'pending' && <Btn variant="danger" block onClick={cancel}>取消订单</Btn>}</div></div>
}

function Info({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3"><span className="text-ink-dim">{label}</span><span className="max-w-[65%] text-right text-ink">{value}</span></div> }
