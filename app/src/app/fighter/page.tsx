'use client'

import { useEffect, useRef, useState } from 'react'
import type { FighterAccount, FighterEarnings, Order, Withdrawal } from '@/lib/types'
import { api } from '@/lib/client'
import { Avatar, Btn, Card, Empty, Money, StatusBadge, TextArea, TextInput, cn } from '@/components/ui'

const TABS = ['home', 'pool', 'orders', 'earnings'] as const
type Tab = typeof TABS[number]
type PoolOrder = Order & { slider?: { sliderId: string } }

function localDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 上传结单截图：multipart 不能用默认 JSON client
async function apiForm(path: string, form: FormData) {
  const res = await fetch(path, { method: 'PATCH', body: form })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && typeof data.error === 'string' ? data.error : '请求失败，请重试') as string)
  return data
}

export default function FighterPage() {
  const [fighter, setFighter] = useState<FighterAccount | null>(null)
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'home'
    const q = new URLSearchParams(window.location.search).get('tab')
    return (TABS as readonly string[]).includes(q || '') ? (q as Tab) : 'home'
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [pool, setPool] = useState<PoolOrder[]>([])
  const [earnings, setEarnings] = useState<FighterEarnings | null>(null)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [keyword, setKeyword] = useState('')
  const [notice, setNotice] = useState('')
  const [wechat, setWechat] = useState<{ enabled: boolean; openid: string } | null>(null)

  // 抢单确认弹窗（滑块验证）
  const [claimOrderItem, setClaimOrderItem] = useState<PoolOrder | null>(null)
  const [claimToken, setClaimToken] = useState('')
  const [sliderError, setSliderError] = useState('')

  // 申请结单弹窗
  const [completeOrder, setCompleteOrder] = useState<Order | null>(null)
  const [completeNote, setCompleteNote] = useState('')
  const [completeFiles, setCompleteFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 提现申请弹窗
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawAccount, setWithdrawAccount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')

  // 抢单大厅“新订单”提示
  const [poolCount, setPoolCount] = useState(0)

  async function load() {
    try {
      const f = await api<FighterAccount>('/api/fighter/me')
      setFighter(f)
      const [myOrders, openOrders, income, withdrawalList] = await Promise.all([
        api<Order[]>('/api/fighter/orders'),
        api<PoolOrder[]>('/api/fighter/orders?pool=1'),
        api<FighterEarnings>('/api/fighter/earnings'),
        api<Withdrawal[]>('/api/fighter/withdrawals'),
      ])
      setOrders(myOrders)
      setPoolCount(openOrders.length)
      setPool(openOrders)
      setEarnings(income)
      setWithdrawals(withdrawalList)
    } catch {
      setFighter(null)
    }
  }

  async function checkWechat() {
    try {
      const w = await api<{ enabled: boolean; openid: string }>('/api/wechat/status')
      setWechat(w)
      if (w.enabled && w.openid) {
        try {
          await api('/api/fighter/auth/wechat', { method: 'POST' })
          setNotice('微信登录成功')
          await load()
        } catch (e: any) {
          setNotice(e.message)
        }
      }
    } catch {
      setWechat({ enabled: false, openid: '' })
    }
  }

  useEffect(() => {
    load()
    checkWechat()
  }, [])

  // 打手端收益/订单实时同步：管理员确认完成、审核提现后，10 秒内自动刷新到账数据
  useEffect(() => {
    if (!fighter) return
    const timer = setInterval(async () => {
      try {
        const [myOrders, income] = await Promise.all([
          api<Order[]>('/api/fighter/orders'),
          api<FighterEarnings>('/api/fighter/earnings'),
        ])
        setOrders(myOrders)
        setEarnings(income)
      } catch {}
    }, 10000)
    return () => clearInterval(timer)
  }, [fighter])

  // 抢单大厅自动刷新 + 新订单提示
  useEffect(() => {
    if (tab !== 'pool') return
    const timer = setInterval(async () => {
      try {
        const fresh = await api<PoolOrder[]>('/api/fighter/orders?pool=1')
        setPool((prev) => {
          if (fresh.length > prev.length) setNotice(`公共池新增 ${fresh.length - prev.length} 个新订单`)
          return fresh
        })
      } catch {}
    }, 8000)
    return () => clearInterval(timer)
  }, [tab])

  async function login() {
    try {
      await api('/api/fighter/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      setNotice('登录成功')
      await load()
    } catch (e: any) { setNotice(e.message) }
  }

  function showNotice(msg: string) { setNotice(msg) }

  async function doClaim() {
    if (!claimOrderItem) return
    if (!claimToken) { setNotice('请先拖动滑块完成验证'); return }
    try {
      await api(`/api/fighter/orders/${claimOrderItem.id}/claim`, { method: 'POST', body: JSON.stringify({ claimToken }) })
      setNotice('抢单成功，请尽快开始服务')
      setClaimOrderItem(null)
      setClaimToken('')
      await load()
    } catch (e: any) {
      setNotice(e.message)
      await load() // 刷新大厅，移除已被抢/已取消的订单
    }
  }

  async function startService(order: Order) {
    try {
      await api(`/api/fighter/orders/${order.id}/start`, { method: 'PATCH' })
      setNotice('已开始服务')
      await load()
    } catch (e: any) { setNotice(e.message) }
  }

  function openComplete(order: Order) {
    setCompleteOrder(order)
    setCompleteNote('')
    setCompleteFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function pickFiles(files: FileList | null) {
    if (!files) return
    const picked = Array.from(files).slice(0, 5)
    setCompleteFiles((prev) => [...prev, ...picked].slice(0, 5))
  }

  async function submitComplete() {
    if (!completeOrder) return
    if (completeFiles.length === 0) { setNotice('申请结单必须至少上传 1 张截图证明'); return }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('note', completeNote.trim())
      for (const file of completeFiles) form.append('files', file)
      await apiForm(`/api/fighter/orders/${completeOrder.id}/request-complete`, form)
      setNotice('完工申请已提交，等待管理员确认，收益将进入待结算')
      setCompleteOrder(null)
      await load()
    } catch (e: any) {
      setNotice(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  function openWithdraw() {
    setWithdrawAmount('')
    setWithdrawAccount('')
    setWithdrawError('')
    setWithdrawOpen(true)
  }

  async function submitWithdrawal() {
    const amount = Number(withdrawAmount)
    if (!Number.isFinite(amount) || amount <= 0) { setWithdrawError('请输入正确的提现金额'); return }
    if (amount > (earnings?.available || 0)) { setWithdrawError(`提现金额不能超过可提现余额 ${earnings?.available || 0} 元`); return }
    if (!withdrawAccount.trim()) { setWithdrawError('请填写收款信息（如支付宝/微信/银行卡号）'); return }
    setWithdrawing(true)
    setWithdrawError('')
    try {
      await api('/api/fighter/withdrawals', { method: 'POST', body: JSON.stringify({ amount, accountInfo: withdrawAccount.trim() }) })
      setWithdrawOpen(false)
      setNotice('提现申请已提交，后台审核后到账')
      await load()
    } catch (e: any) {
      setWithdrawError(e.message)
    } finally {
      setWithdrawing(false)
    }
  }

  async function logout() {
    try { await api('/api/fighter/auth/logout', { method: 'POST' }) } catch {}
    setFighter(null)
  }

  if (!fighter) return (
    <Login
      username={username}
      password={password}
      notice={notice}
      onUsername={setUsername}
      onPassword={setPassword}
      onLogin={login}
      wechatEnabled={wechat?.enabled === true}
      onWechatLogin={() => { window.location.href = '/api/wechat/oauth?state=/fighter' }}
    />
  )

  const filteredPool = pool.filter((order) => `${order.orderNo}${order.serviceName}${order.companionName}`.toLowerCase().includes(keyword.toLowerCase()))
  const today = localDateStr(new Date())
  const todayOrders = orders.filter((order) => order.createdAt.slice(0, 10) === today).length
  const todayCompleted = orders.filter((order) => order.completedAt.slice(0, 10) === today).length

  return <main className="mx-auto min-h-screen max-w-md bg-bg pb-24">
    <header className="bg-primary px-5 pb-7 pt-8 text-white">
      <div className="flex items-center gap-3"><Avatar name={fighter.displayName} src={fighter.avatarUrl || undefined} size={56} /><div className="min-w-0 flex-1"><p className="truncate text-lg font-bold">{fighter.displayName}</p><p className="text-xs text-white/70">账号 {fighter.username}{fighter.tier ? ` · ${fighter.tier}档` : ''}</p></div><button type="button" className="rounded-full bg-white/15 px-3 py-1 text-xs" onClick={logout}>退出</button></div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/10 py-2"><p className="text-lg font-bold">{todayOrders}</p><p className="text-[11px] text-white/70">今日接单</p></div>
        <div className="rounded-xl bg-white/10 py-2"><p className="text-lg font-bold">{todayCompleted}</p><p className="text-[11px] text-white/70">今日完成</p></div>
        <div className="rounded-xl bg-white/10 py-2"><p className="text-lg font-bold">{poolCount}</p><p className="text-[11px] text-white/70">公共池订单</p></div>
      </div>
    </header>
    <div className="space-y-4 p-4">
      {tab === 'home' && <>
        <Card className="p-4"><p className="text-sm font-semibold text-ink">待办提醒</p>
          <p className="mt-2 text-xs text-ink-dim">待服务：{orders.filter((o) => o.status === 'assigned').length} 单</p>
          <p className="mt-1 text-xs text-ink-dim">服务中：{orders.filter((o) => o.status === 'in_progress').length} 单</p>
          <p className="mt-1 text-xs text-ink-dim">待确认完工：{orders.filter((o) => o.status === 'completion_pending').length} 单</p>
          <div className="mt-3 flex gap-2"><Btn size="sm" onClick={() => setTab('pool')}>去抢单大厅</Btn><Btn size="sm" variant="outline" onClick={() => setTab('orders')}>我的订单</Btn></div>
        </Card>
        <Card className="p-4"><p className="text-sm font-semibold text-ink">收益中心</p><p className="mt-3 text-2xl font-bold text-primary"><Money value={earnings?.available || 0} /></p><p className="mt-1 text-xs text-ink-faint">可提现余额（已确认完成）</p>{!!earnings?.pendingSettlement && <p className="mt-1 text-xs text-warn">待结算：<Money value={earnings.pendingSettlement} />（管理员确认后到账）</p>}<div className="mt-4 flex gap-2"><Btn size="sm" onClick={() => setTab('earnings')}>收益明细</Btn><Btn size="sm" variant="outline" onClick={openWithdraw}>提现申请</Btn></div></Card>
      </>}
      {tab === 'pool' && <><div className="flex items-center justify-between"><h1 className="text-lg font-bold text-ink">抢单大厅</h1><button type="button" onClick={load} className="text-xs text-primary">刷新</button></div><p className="mt-0.5 text-[11px] text-ink-faint">抢单需拖动滑块到最右侧完成验证，防止一键脚本；娱乐档次打手不能抢公共池订单</p><TextInput value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索订单号或服务关键词" /><PoolList list={filteredPool} onClaim={(order) => { setClaimOrderItem(order); setClaimToken(''); setSliderError('') }} /></>}
      {tab === 'orders' && <><div className="flex items-center justify-between"><h1 className="text-lg font-bold text-ink">我的订单</h1><button type="button" onClick={load} className="text-xs text-primary">刷新</button></div><OrderList list={orders} onStart={startService} onComplete={openComplete} /></>}
      {tab === 'earnings' && <><div className="flex items-center justify-between"><h1 className="text-lg font-bold text-ink">收益明细</h1><button type="button" onClick={load} className="text-xs text-primary">刷新</button></div><Card className="p-4"><p className="text-sm font-semibold text-ink">收益中心</p><p className="mt-3 text-2xl font-bold text-primary"><Money value={earnings?.available || 0} /></p><p className="mt-1 text-xs text-ink-faint">普通订单平台抽成 20%，体验单平台抽成 10%</p>{!!earnings?.pendingSettlement && <p className="mt-2 rounded-btn bg-warn/10 p-2 text-xs text-warn">待结算 <Money value={earnings.pendingSettlement} />：已提交完工申请，管理员确认后进入可提现余额</p>}<Btn className="mt-4" onClick={openWithdraw}>申请提现</Btn></Card><Card className="p-4"><p className="mb-3 text-sm font-semibold text-ink">提现记录</p>{withdrawals.length ? withdrawals.map((item) => <div key={item.id} className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0"><span><Money value={item.amount} /></span><StatusBadge status={item.status} /></div>) : <Empty text="暂无提现记录" />}</Card></>}
    </div>

    {/* 抢单确认弹窗 */}
    {claimOrderItem && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={() => setClaimOrderItem(null)}>
        <Card className="w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
          <p className="text-base font-bold text-ink">确认抢单</p>
          <p className="mt-1 text-xs text-ink-dim">{claimOrderItem.orderNo} · {claimOrderItem.companionName} · {claimOrderItem.serviceName}</p>
          <p className="mt-3 text-sm text-ink">订单金额：<span className="font-bold text-primary-bright"><Money value={claimOrderItem.amount} /></span></p>
          <div className="mt-3"><SliderVerify
            sliderId={claimOrderItem.slider?.sliderId || ''}
            orderId={claimOrderItem.id}
            onVerified={(token) => { setClaimToken(token); setSliderError('') }}
            onError={(msg) => setSliderError(msg)}
          />
          {sliderError && <p className="mt-2 text-center text-xs text-danger">{sliderError}</p>}
          {claimToken && <p className="mt-2 text-center text-xs text-ok">✓ 滑块验证通过，可确认抢单</p>}</div>
          <div className="mt-4 flex gap-2"><Btn block onClick={doClaim}>确认抢单</Btn><Btn block variant="outline" onClick={() => setClaimOrderItem(null)}>取消</Btn></div>
        </Card>
      </div>
    )}

    {/* 申请结单弹窗（必须带截图证明） */}
    {completeOrder && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={() => setCompleteOrder(null)}>
        <Card className="w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
          <p className="text-base font-bold text-ink">申请结单</p>
          <p className="mt-1 text-xs text-ink-dim">{completeOrder.orderNo} · {completeOrder.companionName} · 预计到手 <Money value={completeOrder.fighterIncome} /></p>
          <p className="mt-3 text-xs text-warn">必须至少上传 1 张游戏结算/截图证明，管理员确认后才算完成并结算</p>
          <Field label="完成说明" hint="选填">
            <TextArea value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} placeholder="例如：已完成保底 888W，带出截图见附件" />
          </Field>
          <div className="mt-3">
            <p className="mb-1.5 text-xs text-ink-dim">截图证明（最多 5 张）*</p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => pickFiles(e.target.files)} className="hidden" />
            {completeFiles.length === 0 && <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-btn border border-dashed border-line bg-surface2 py-6 text-center text-xs text-ink-dim hover:border-primary">点击选择截图（jpg/png/webp/gif）</button>}
            {completeFiles.length > 0 && <div className="space-y-2"><div className="grid grid-cols-5 gap-2">{completeFiles.map((file, index) => <img key={`${file.name}-${index}`} src={URL.createObjectURL(file)} alt={file.name} className="aspect-square w-full rounded-btn border border-line object-cover" />)}</div><div className="flex gap-2"><Btn size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>继续添加</Btn><Btn size="sm" variant="danger" onClick={() => setCompleteFiles([])}>清空</Btn></div></div>}
          </div>
          <div className="mt-4 flex gap-2"><Btn block disabled={submitting} onClick={submitComplete}>{submitting ? '提交中...' : '提交结单申请'}</Btn><Btn block variant="outline" onClick={() => setCompleteOrder(null)}>取消</Btn></div>
        </Card>
      </div>
    )}

    {/* 提现申请弹窗 */}
    {withdrawOpen && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={() => setWithdrawOpen(false)}>
        <Card className="w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
          <p className="text-base font-bold text-ink">申请提现</p>
          <p className="mt-1 text-xs text-ink-dim">可提现余额 <span className="font-bold text-primary-bright"><Money value={earnings?.available || 0} /></span>，提交后后台审核，通过后打款到你的收款账户</p>
          <div className="mt-4 space-y-3">
            <Field label="提现金额（元）*"><TextInput type="number" inputMode="decimal" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0.00" /></Field>
            <Field label="收款信息 *" hint="支付宝账号 / 微信 / 银行卡号等"><TextInput value={withdrawAccount} onChange={(e) => setWithdrawAccount(e.target.value)} placeholder="如：支付宝 138****0000" /></Field>
          </div>
          {withdrawError && <p className="mt-3 text-center text-xs text-danger">{withdrawError}</p>}
          <div className="mt-4 flex gap-2"><Btn block disabled={withdrawing} onClick={submitWithdrawal}>{withdrawing ? '提交中...' : '提交提现申请'}</Btn><Btn block variant="outline" disabled={withdrawing} onClick={() => setWithdrawOpen(false)}>取消</Btn></div>
        </Card>
      </div>
    )}

    {notice && <button type="button" onClick={() => setNotice('')} className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white">{notice}</button>}
    <nav className="safe-bottom fixed inset-x-0 bottom-0 mx-auto grid max-w-md grid-cols-4 border-t border-line bg-surface/95 py-2 text-center text-xs">{TABS.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={cn(tab === item ? 'text-primary' : 'text-ink-faint')}>{({ home: '首页', pool: '抢单大厅', orders: '我的订单', earnings: '收益' } as Record<Tab, string>)[item]}</button>)}</nav>
  </main>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div><p className="mb-1.5 text-xs text-ink-dim">{label}{hint ? <span className="ml-1 text-[11px] text-ink-faint">{hint}</span> : null}</p>{children}</div>
}


function Login({ username, password, notice, onUsername, onPassword, onLogin, wechatEnabled, onWechatLogin }: { username: string; password: string; notice: string; onUsername: (value: string) => void; onPassword: (value: string) => void; onLogin: () => void; wechatEnabled: boolean; onWechatLogin: () => void }) {
  return <main className="mx-auto min-h-screen max-w-md bg-bg p-5"><div className="pt-14"><p className="text-xs font-semibold uppercase text-primary">Delta Club / Fighter</p><h1 className="mt-2 text-2xl font-bold text-ink">打手工作台</h1><p className="mt-2 text-sm text-ink-dim">登录后管理接单、服务和收益</p><Card className="mt-8 space-y-4 p-4"><TextInput value={username} onChange={(e) => onUsername(e.target.value)} placeholder="登录账号" /><TextInput type="password" value={password} onChange={(e) => onPassword(e.target.value)} placeholder="登录密码" /><Btn block onClick={onLogin}>登录打手端</Btn>{wechatEnabled && <><div className="flex items-center gap-3 text-[11px] text-ink-faint"><span className="h-px flex-1 bg-line" /><span>或</span><span className="h-px flex-1 bg-line" /></div><Btn block variant="soft" onClick={onWechatLogin}>微信一键登录</Btn></>}</Card>{notice && <p className="mt-4 text-center text-sm text-danger">{notice}</p>}<p className="mt-4 text-center text-xs text-ink-faint">账号需先通过管理员审核</p></div></main>
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) { return <Card className="p-4"><p className="text-xs text-ink-faint">{label}</p><p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p></Card> }

// 滑块验证：市面上常见模式——把滑块拖到最右侧即完成验证，服务端校验后发放一次性抢单令牌
function SliderVerify({ sliderId, orderId, onVerified, onError }: { sliderId: string; orderId: string; onVerified: (token: string) => void; onError: (msg: string) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [checking, setChecking] = useState(false)
  const [success, setSuccess] = useState(false)

  function posFromClientX(clientX: number) {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    return Math.min(100, Math.max(0, Math.round(pct)))
  }

  async function finish(clientX: number) {
    if (checking || success) return
    const pct = posFromClientX(clientX)
    setDragging(false)
    if (!sliderId) { onError('验证信息缺失，请刷新抢单大厅'); return }
    if (pct < 95) { setPosition(0); onError('请把滑块拖到最右侧'); return }
    setChecking(true)
    try {
      const res = await fetch(`/api/fighter/orders/${orderId}/slider-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sliderId, position: pct }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data || !data.claimToken) {
        setPosition(0)
        onError((data && data.error) || '验证失败，请重试')
        return
      }
      setPosition(100)
      setSuccess(true)
      onVerified(String(data.claimToken))
    } catch {
      setPosition(0)
      onError('网络异常，请重试')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div>
      <p className="mb-2 text-center text-xs text-ink-dim">按住滑块，拖动到最右侧完成验证</p>
      <div
        ref={trackRef}
        className={cn('relative h-11 select-none overflow-hidden rounded-btn border transition-colors', success ? 'border-ok/50 bg-ok/10' : 'border-line bg-surface2')}
        onPointerMove={(e) => { if (dragging) { const p = posFromClientX(e.clientX); setPosition(p); if (p >= 98) finish(e.clientX) } }}
        onPointerUp={(e) => { if (dragging) finish(e.clientX) }}
        onPointerLeave={(e) => { if (dragging) finish(e.clientX) }}
      >
        <div className={cn('pointer-events-none absolute inset-y-0 left-0 transition-colors', success ? 'bg-ok/30' : 'bg-primary/20')} style={{ width: `${position}%` }} />
        <div
          className={cn('absolute inset-y-0 flex w-11 items-center justify-center rounded-btn border text-white shadow transition-colors', success ? 'border-ok bg-ok' : 'border-primary/40 bg-primary')}
          style={{ left: `calc(${position}% - 22px)` }}
          onPointerDown={(e) => { if (success) return; (e.target as HTMLElement).setPointerCapture(e.pointerId); setDragging(true) }}
        >
          {success ? <span className="text-sm">✓</span> : checking ? <span className="text-xs">…</span> : <span className="text-sm">→</span>}
        </div>
        {!success && <span className="pointer-events-none absolute inset-y-0 left-14 flex items-center text-xs text-ink-faint">向右拖动滑块</span>}
      </div>
    </div>
  )
}

function PoolList({ list, onClaim }: { list: PoolOrder[]; onClaim: (order: PoolOrder) => void }) {
  if (!list.length) return <Empty text="公共池暂无订单" />
  return <div className="space-y-2">{list.map((order) => <Card key={order.id} className="p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-semibold text-ink">{order.companionName}</p><p className="mt-1 text-xs text-ink-dim">{order.orderNo} · {order.serviceName} · {order.unitCount} 单位</p></div><StatusBadge status={order.status} /></div><p className="mt-2 text-xs text-ink-dim">区服：{order.gameField || '待沟通'}　段位：{order.rank || '不限'}</p>{order.remark && <p className="mt-1 text-xs text-ink-dim">备注：{order.remark}</p>}<div className="mt-3 flex items-center justify-between"><span className="font-bold text-primary"><Money value={order.amount} /></span><Btn size="sm" onClick={() => onClaim(order)}>抢单</Btn></div></Card>)}</div>
}

function OrderList({ list, onStart, onComplete }: { list: Order[]; onStart: (order: Order) => void; onComplete: (order: Order) => void }) {
  if (!list.length) return <Empty text="暂无订单" />
  return <div className="space-y-2">{list.map((order) => <Card key={order.id} className="p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-semibold text-ink">{order.companionName}</p><p className="mt-1 text-xs text-ink-dim">{order.orderNo} · {order.serviceName} · {order.unitCount} 单位</p></div><StatusBadge status={order.status} /></div><p className="mt-2 text-xs text-ink-dim">区服：{order.gameField || '待沟通'}　段位：{order.rank || '不限'}{order.customerPhone ? `　老板手机：${order.customerPhone}` : ''}</p>{order.remark && <p className="mt-1 text-xs text-ink-dim">备注：{order.remark}</p>}{order.status === 'completion_pending' && <p className="mt-1 text-xs text-warn">已申请完工，等待管理员确认</p>}<div className="mt-3 flex items-center justify-between"><span className="font-bold text-primary"><Money value={order.amount} /></span><span className="text-xs text-ink-faint">{order.status === 'completed' ? `到手 ${order.fighterIncome}` : ['in_progress', 'completion_pending'].includes(order.status) ? `预计到手 ${order.fighterIncome}` : ''}</span>{order.status === 'assigned' ? <Btn size="sm" onClick={() => onStart(order)}>开始服务</Btn> : order.status === 'in_progress' ? <Btn size="sm" onClick={() => onComplete(order)}>申请完成</Btn> : null}</div></Card>)}</div>
}
