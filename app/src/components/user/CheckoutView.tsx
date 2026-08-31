'use client'

import { useEffect, useState } from 'react'
import type { Companion, FighterAccount, ServiceType, TrialQuota } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Card, Field, IconBack, Money, Select, TextArea, TextInput, cn } from '@/components/ui'

export default function CheckoutView({
  companionId,
  unitCount,
  price,
  spec,
  onBack,
  onSubmitted,
}: {
  companionId: string
  unitCount: number
  price?: number
  spec?: string
  onBack: () => void
  onSubmitted: (orderId: string) => void
}) {
  const [companion, setCompanion] = useState<Companion | null>(null)
  const [types, setTypes] = useState<ServiceType[]>([])
  const [fighters, setFighters] = useState<FighterAccount[]>([])
  const [gameField, setGameField] = useState('')
  const [gameMode, setGameMode] = useState('')
  const [mapName, setMapName] = useState('')
  const [inGameId, setInGameId] = useState('')
  const [objective, setObjective] = useState(OBJECTIVES[0])
  const [customObjective, setCustomObjective] = useState('')
  const [remark, setRemark] = useState('')
  const [fighterId, setFighterId] = useState('')
  const [isTrial, setIsTrial] = useState(false)
  const [trialQuota, setTrialQuota] = useState<TrialQuota | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [idempotencyKey] = useState(() => Math.random().toString(36).slice(2) + Date.now().toString(36))
  const [pendingPay, setPendingPay] = useState<{ id: string; amount: number } | null>(null)
  const [paying, setPaying] = useState(false)

  const rank = objective === '自定义目标' ? customObjective : objective

  useEffect(() => {
    if (!MAPS[gameMode]?.includes(mapName)) setMapName('')
  }, [gameMode, mapName])

  useEffect(() => {
    api<Companion>(`/api/companions/${companionId}`).then(setCompanion).catch((e) => setError(e.message))
    api<ServiceType[]>('/api/service-types').then(setTypes).catch(() => setTypes([]))
    api<FighterAccount[]>('/api/fighters/available').then(setFighters).catch(() => setFighters([]))
    api<TrialQuota>('/api/customer/trial-quota').then(setTrialQuota).catch(() => setTrialQuota(null))
  }, [companionId])

  useEffect(() => {
    if (trialQuota && trialQuota.remaining <= 0 && isTrial) setIsTrial(false)
  }, [trialQuota, isTrial])

  async function submit() {
    if (!companion) return
    if (!gameField.trim()) {
      setError('请选择游戏区服')
      return
    }
    if (!gameMode) {
      setError('请选择游戏模式')
      return
    }
    if (objective === '自定义目标' && !customObjective.trim()) {
      setError('请填写具体目标要求')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const order = await api<{ id: string; amount: number }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          companionId: companion.id,
          unitCount,
          spec: spec || '',
          price,
          gameField: gameField.trim(),
          gameMode,
          mapName,
          inGameId: inGameId.trim(),
          rank: rank.trim(),
          remark: remark.trim(),
          customerName: '',
          fighterId,
          isTrial,
          idempotencyKey,
        }),
      })
      // 下单先进入“待付款”，付款成功后才进入公共池/指派给指定打手
      setPendingPay({ id: order.id, amount: order.amount })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function pay() {
    if (!pendingPay) return
    setPaying(true)
    try {
      await api(`/api/orders/${pendingPay.id}/pay`, { method: 'POST' })
      onSubmitted(pendingPay.id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setPaying(false)
    }
  }

  if (!companion) {
    return <div className="p-4"><button type="button" onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-ink-dim"><IconBack size={18} />返回</button><Card className="p-6 text-center text-sm text-ink-faint">{error || '加载中...'}</Card></div>
  }

  const serviceName = types.find((t) => t.id === companion.serviceTypeId)?.name || '陪玩'
  const unitPrice = price !== undefined && Number.isFinite(price) ? price : companion.price
  const amount = unitPrice * unitCount

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur"><button type="button" onClick={onBack} className="rounded-full p-1 text-ink-dim hover:text-ink"><IconBack size={20} /></button><h1 className="text-base font-semibold text-ink">确认订单</h1></header>
      <div className="space-y-3 p-4">
        <Card className="space-y-2 p-4">
          <Row label="服务人员" value={companion.name} />
          <Row label="服务类型" value={serviceName} />
          <Row label="时长 / 局数" value={`${unitCount} ${companion.unit}`} />
          <Row label="单价" value={<><Money value={unitPrice} />/{companion.unit}</>} />
          {spec && <Row label="服务规格" value={spec} />}
        </Card>
        <Card className="space-y-3 p-4">
          <label className={cn('flex items-center justify-between rounded-btn border border-line bg-surface2 px-3 py-2.5 text-sm', trialQuota?.remaining === 0 && 'opacity-60')}><span className="font-medium text-ink">体验单 <span className="ml-1 text-xs font-normal text-ink-faint">平台抽成 10%{trialQuota ? ` · 本周剩余 ${trialQuota.remaining} 次` : ''}</span></span><input type="checkbox" checked={isTrial} disabled={trialQuota?.remaining === 0} onChange={(e) => setIsTrial(e.target.checked)} className="h-4 w-4 accent-blue-600" /></label>
          <Field label="派单方式" hint="不指定打手时进入公共抢单大厅"><select value={fighterId} onChange={(e) => setFighterId(e.target.value)} className="w-full rounded-btn border border-line bg-surface2 px-3 py-2 text-sm text-ink"><option value="">公共抢单池</option>{fighters.map((fighter) => <option key={fighter.id} value={fighter.id}>{fighter.displayName}</option>)}</select></Field>
          <OptionRow label="游戏区服" value={gameField} onChange={setGameField} options={SERVERS} />
          <OptionRow label="游戏模式" value={gameMode} onChange={setGameMode} options={MODES} />
          <Field label="地图" hint="选填"><Select value={mapName} onChange={(e) => setMapName(e.target.value)}><option value="">由打手根据当前活动选择</option>{(MAPS[gameMode] || []).map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <Field label="游戏内 ID / 昵称" hint="选填，便于邀请进队"><TextInput value={inGameId} onChange={(e) => setInGameId(e.target.value)} placeholder="填写游戏内昵称或数字 ID" /></Field>
          <Field label="目标要求" hint="选填"><Select value={objective} onChange={(e) => setObjective(e.target.value)}>{OBJECTIVES.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          {objective === '自定义目标' && <Field label="具体目标" hint="必填"><TextInput value={customObjective} onChange={(e) => setCustomObjective(e.target.value)} placeholder="例如：保底 888W 哈夫币" /></Field>}
          <Field label="备注" hint="选填"><TextArea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="特殊要求、联系方式等" /></Field>
        </Card>
        {error && <p className="text-center text-sm text-danger">{error}</p>}
      </div>
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur"><div className="mx-auto flex max-w-md items-center justify-between px-4 py-3"><div><p className="text-[11px] text-ink-faint">合计</p><p className="text-lg font-bold text-primary-bright"><Money value={amount} /></p></div><Btn onClick={submit} disabled={submitting}>{submitting ? '提交中...' : '提交订单'}</Btn></div></div>
      {pendingPay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md rounded-2xl p-5">
            <p className="text-base font-bold text-ink">确认支付</p>
            <p className="mt-1 text-xs text-ink-dim">订单已生成（待付款），付款成功后自动进入公共抢单池{fighterId ? ' / 指派给所选打手' : ''}</p>
            <div className="mt-4 rounded-btn bg-primary/5 p-4 text-center">
              <p className="text-xs text-ink-dim">需支付</p>
              <p className="mt-1 text-3xl font-bold text-primary-bright"><Money value={pendingPay.amount} /></p>
              <p className="mt-1 text-[11px] text-ink-faint">当前为模拟支付，正式上线后接入微信支付</p>
            </div>
            <div className="mt-4 flex gap-2">
              <Btn block disabled={paying} onClick={pay}>{paying ? '支付中...' : '确认支付'}</Btn>
              <Btn block variant="outline" disabled={paying} onClick={() => onSubmitted(pendingPay.id)}>稍后支付</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-ink-dim">{label}</span><span className="text-right text-ink">{value}</span></div>
}

const SERVERS = ['QQ区', '微信区']
const MODES = ['烽火地带', '全面战场']
const OBJECTIVES = ['不限目标', '轻松娱乐', '上分/冲分', '保底哈夫币', '清图刷物资', '教学指导', '自定义目标']
const MAPS: Record<string, string[]> = {
  烽火地带: ['不指定地图', '零号大坝', '长弓溪谷', '航天基地', '巴克什'],
  全面战场: ['不指定地图'],
}

function OptionRow({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-ink-dim">{label}</p>
      <div className={cn('grid gap-2', options.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {options.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              'h-10 rounded-btn border px-2 text-sm transition-colors',
              value === item ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-line bg-surface2 text-ink-dim',
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}
