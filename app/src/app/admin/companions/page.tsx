'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Companion, ServiceType } from '@/lib/types'
import { api } from '@/lib/client'
import {
  Avatar,
  Btn,
  Card,
  Empty,
  Field,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  Modal,
  Money,
  Select,
  Tag,
  TextArea,
  TextInput,
} from '@/components/ui'

const EMPTY_FORM = {
  id: '',
  name: '',
  gender: '',
  serviceTypeId: '',
  price: '',
  unit: '小时',
  rank: '',
  tags: '',
  description: '',
  sort: '0',
  status: 1,
}

export default function AdminCompanions() {
  const [list, setList] = useState<Companion[]>([])
  const [types, setTypes] = useState<ServiceType[]>([])
  const [keyword, setKeyword] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    const params = new URLSearchParams({ all: '1' })
    if (keyword.trim()) params.set('keyword', keyword.trim())
    api<Companion[]>(`/api/admin/companions?${params.toString()}`)
      .then(setList)
      .catch(() => setList([]))
  }, [keyword])

  useEffect(() => {
    load()
    api<ServiceType[]>('/api/admin/service-types').then(setTypes).catch(() => setTypes([]))
  }, [load])

  function openCreate() {
    setForm({ ...EMPTY_FORM, serviceTypeId: types.find((t) => t.enabled && !t.reserved)?.id || '' })
    setOpen(true)
  }

  function openEdit(c: Companion) {
    setForm({
      id: c.id,
      name: c.name,
      gender: c.gender,
      serviceTypeId: c.serviceTypeId,
      price: String(c.price),
      unit: c.unit,
      rank: c.rank,
      tags: c.tags.join('，'),
      description: c.description,
      sort: String(c.sort),
      status: c.status,
    })
    setOpen(true)
  }

  async function save() {
    const name = form.name.trim()
    const price = Number(form.price)
    if (!name || !form.serviceTypeId || !Number.isFinite(price) || price < 0) return
    setSaving(true)
    const body = {
      name,
      gender: form.gender.trim(),
      serviceTypeId: form.serviceTypeId,
      price,
      unit: form.unit,
      rank: form.rank.trim(),
      tags: form.tags
        .split(/[，,、\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
      description: form.description.trim(),
      sort: Number(form.sort) || 0,
      status: form.status,
    }
    try {
      if (form.id) {
        await api(`/api/admin/companions/${form.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await api('/api/admin/companions', { method: 'POST', body: JSON.stringify(body) })
      }
      setOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(c: Companion) {
    await api(`/api/admin/companions/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: c.status === 1 ? 0 : 1 }),
    })
    load()
  }

  async function remove(c: Companion) {
    if (!window.confirm(`确认删除「${c.name}」？删除后不可恢复`)) return
    await api(`/api/admin/companions/${c.id}`, { method: 'DELETE' })
    load()
  }

  const typeName = (id: string) => types.find((t) => t.id === id)?.name || '—'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">陪玩管理</h1>
          <p className="mt-0.5 text-xs text-ink-faint">上下架、编辑陪玩与服务信息</p>
        </div>
        <Btn onClick={openCreate}>
          <IconPlus size={16} /> 新增陪玩
        </Btn>
      </div>

      <div className="flex max-w-xs items-center gap-2 rounded-btn border border-line bg-surface px-3 py-2">
        <IconSearch size={16} className="text-ink-faint" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索昵称 / 标签"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
        />
      </div>

      {list.length === 0 ? (
        <Card>
          <Empty text="暂无陪玩" />
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center gap-3 p-3">
              <Avatar name={c.name} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{c.name}</span>
                  {c.gender && <span className="text-[11px] text-primary">{c.gender}</span>}
                  {c.kind === 'fighter' && (
                    <Tag className="border-primary/40 bg-primary/10 text-primary">打手</Tag>
                  )}
                  <Tag>{typeName(c.serviceTypeId)}</Tag>
                  <Tag>
                    <Money value={c.price} />
                    /{c.unit}
                  </Tag>
                  <span className={c.status === 1 ? 'text-[11px] text-ok' : 'text-[11px] text-ink-faint'}>
                    {c.status === 1 ? '在售' : '下架'}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-ink-faint">
                  {c.rank || '未设段位'} · 销量 {c.sales} · {c.description || '暂无简介'}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Btn size="sm" variant="outline" onClick={() => toggleStatus(c)}>
                  {c.status === 1 ? '下架' : '上架'}
                </Btn>
                <Btn size="sm" variant="soft" onClick={() => openEdit(c)}>
                  <IconEdit size={14} /> 编辑
                </Btn>
                <Btn size="sm" variant="danger" onClick={() => remove(c)}>
                  <IconTrash size={14} /> 删除
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} title={form.id ? '编辑陪玩' : '新增陪玩'} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="昵称 *">
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="展示昵称" />
            </Field>
            <Field label="性别">
              <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">不区分</option>
                <option value="女陪">女陪</option>
                <option value="男陪">男陪</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="服务类型 *">
              <Select value={form.serviceTypeId} onChange={(e) => setForm({ ...form, serviceTypeId: e.target.value })}>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.reserved ? '（预留）' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="计费单位">
              <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="小时">小时</option>
                <option value="局">局</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="单价（元）*">
              <TextInput
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="如 66"
              />
            </Field>
            <Field label="段位">
              <TextInput value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} placeholder="如 高星" />
            </Field>
          </div>
          <Field label="标签" hint="用逗号分隔">
            <TextInput
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="技术，颜值，娱乐"
            />
          </Field>
          <Field label="简介">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="排序">
              <TextInput
                type="number"
                value={form.sort}
                onChange={(e) => setForm({ ...form, sort: e.target.value })}
              />
            </Field>
            <label className="flex items-end gap-2 pb-2.5 text-sm text-ink-dim">
              <input
                type="checkbox"
                checked={form.status === 1}
                onChange={(e) => setForm({ ...form, status: e.target.checked ? 1 : 0 })}
                className="h-4 w-4 accent-blue-600"
              />
              立即上架
            </label>
          </div>
          <Btn block onClick={save} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </Btn>
        </div>
      </Modal>
    </div>
  )
}
