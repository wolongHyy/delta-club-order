'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FighterApplication } from '@/lib/types'
import { api } from '@/lib/client'
import { Avatar, Btn, Card, Empty, Field, FighterStatusBadge, IconBack, IconUserPlus, Tag, TextArea, TextInput, cn } from '@/components/ui'

const MODES = ['单陪', '双陪', '护航', '趣味单']
const TIERS = ['娱乐', '干事', '部长', '副主席', '主席']

export default function FighterApplyView({
  onBack,
  onNotice,
}: {
  onBack: () => void
  onNotice: (msg: string) => void
}) {
  const [gameName, setGameName] = useState('')
  const [contact, setContact] = useState('')
  const [rank, setRank] = useState('')
  const [tier, setTier] = useState('干事')
  const [modes, setModes] = useState<string[]>([])
  const [intro, setIntro] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [list, setList] = useState<FighterApplication[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [wechat, setWechat] = useState<{ enabled: boolean; authenticated: boolean; openid: string; nickname: string; avatarUrl: string } | null>(null)

  const load = useCallback(() => {
    api<FighterApplication[]>('/api/fighter-applications')
      .then(setList)
      .catch(() => setList([]))
  }, [])

  useEffect(() => {
    load()
    api<{ enabled: boolean; authenticated: boolean; openid: string; nickname: string; avatarUrl: string }>('/api/wechat/status')
      .then(setWechat)
      .catch(() => setWechat({ enabled: false, authenticated: false, openid: '', nickname: '', avatarUrl: '' }))
  }, [load])

  function toggleMode(m: string) {
    setModes((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  async function submit() {
    if (wechat?.enabled && !wechat.openid) {
      setError('请先点击上方按钮完成微信授权，审核通过后才能用同一微信登录打手端')
      return
    }
    if (!gameName.trim()) {
      setError('请填写游戏昵称')
      return
    }
    if (!contact.trim()) {
      setError('请填写微信号或QQ，方便俱乐部联系')
      return
    }
    if (!rank.trim()) {
      setError('请填写段位')
      return
    }
    if (!username.trim() || password.length < 6) {
      setError('请设置账号，并填写至少6位密码')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api('/api/fighter-applications', {
        method: 'POST',
        body: JSON.stringify({
          gameName: gameName.trim(),
          contact: contact.trim(),
          rank: rank.trim(),
          tier: tier.trim(),
          modes,
          intro: intro.trim(),
          username: username.trim(),
          password,
        }),
      })
      onNotice('入驻申请已提交，等待审核')
      setGameName('')
      setContact('')
      setRank('')
      setTier('干事')
      setModes([])
      setIntro('')
      setUsername('')
      setPassword('')
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={onBack} className="rounded-full p-1 text-ink-dim hover:text-ink">
          <IconBack size={20} />
        </button>
        <h1 className="text-base font-semibold text-ink">打手入驻</h1>
      </header>

      <div className="space-y-3 p-4">
        {wechat?.enabled && (
          <Card className={cn('flex items-center gap-3 border p-4', wechat.openid ? 'border-ok/30 bg-gradient-to-br from-emerald-50 to-white' : 'border-warn/30 bg-gradient-to-br from-amber-50 to-white')}>
            <Avatar name={wechat.nickname || '微信用户'} src={wechat.avatarUrl || undefined} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{wechat.openid ? `微信已绑定：${wechat.nickname || '已授权用户'}` : '需要微信授权'}</p>
              <p className="mt-0.5 text-xs text-ink-dim">
                {wechat.openid
                  ? '审核通过后，可直接用该微信登录打手端'
                  : '授权后申请会自动绑定微信，审核通过即可微信登录打手端'}
              </p>
            </div>
            {!wechat.openid && (
              <Btn
                size="sm"
                onClick={() => {
                  sessionStorage.setItem('delta_return_view', 'fighter-apply')
                  window.location.href = '/api/wechat/oauth?state=/'
                }}
              >
                微信授权
              </Btn>
            )}
          </Card>
        )}

        <Card className="flex items-center gap-3 border-primary/25 bg-gradient-to-br from-sky-50 to-white p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <IconUserPlus size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">申请成为俱乐部打手</p>
            <p className="mt-0.5 text-xs text-ink-dim">审核通过后自动登记入打手名单，可在管理后台派单接单。</p>
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <Field label="游戏昵称 *" hint="展示名，通过后自动登记">
            <TextInput value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="如：三角洲战神" />
          </Field>
          <Field label="微信号 / QQ *" hint="俱乐部联系你使用">
            <TextInput value={contact} onChange={(e) => setContact(e.target.value)} placeholder="微信号或QQ号" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="登录账号 *">
              <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="设置打手端账号" />
            </Field>
            <Field label="登录密码 *" hint="至少6位">
              <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="设置登录密码" />
            </Field>
          </div>
          <Field label="段位 *" hint="如 高星、顶尖">
            <TextInput value={rank} onChange={(e) => setRank(e.target.value)} placeholder="如：顶尖" />
          </Field>
          <Field label="打手档次 *" hint="娱乐档次不能抢公共池订单，只能由顾客指定或管理员派单">
            <select value={tier} onChange={(e) => setTier(e.target.value)} className="w-full rounded-btn border border-line bg-surface2 px-3 py-2 text-sm text-ink">
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="擅长模式" hint="可多选">
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMode(m)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs transition-colors',
                    modes.includes(m)
                      ? 'border-primary bg-primary text-white'
                      : 'border-line bg-surface2 text-ink-dim hover:text-ink',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </Field>
          <Field label="自我介绍 / 战绩" hint="选填">
            <TextArea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="简单介绍自己：段位战绩、可接时段、擅长地图等"
            />
          </Field>
          {error && <p className="text-center text-sm text-danger">{error}</p>}
          <Btn block onClick={submit} disabled={submitting}>
            {submitting ? '提交中…' : '提交入驻申请'}
          </Btn>
        </Card>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">我的申请记录</h2>
          {list.length === 0 ? (
            <Card>
              <Empty text="还没有申请记录，提交后在这里查看进度" />
            </Card>
          ) : (
            <div className="space-y-2">
              {list.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{a.gameName}</span>
                    <FighterStatusBadge status={a.status} />
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">
                    段位：{a.rank || '未填'} · 擅长：{a.modes.length ? a.modes.join(' / ') : '未选'}
                  </p>
                  {a.intro && <p className="mt-1 text-xs text-ink-dim">{a.intro}</p>}
                  <p className="mt-1 text-[11px] text-ink-faint">申请时间：{a.createdAt}</p>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
