'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ServiceType } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Card, Empty, Field, IconEdit, IconPlus, Modal, Tag, TextInput } from '@/components/ui'

export default function AdminServiceTypes() {
  const [list, setList] = useState<ServiceType[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceType | null>(null)
  const [form, setForm] = useState({ name: '', icon: 'gamepad-2', sort: '0', enabled: true })

  const load = useCallback(() => {
    api<ServiceType[]>('/api/admin/service-types').then(setList).catch(() => setList([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', icon: 'gamepad-2', sort: String(list.length), enabled: true })
    setOpen(true)
  }

  function openEdit(t: ServiceType) {
    setEditing(t)
    setForm({ name: t.name, icon: t.icon, sort: String(t.sort), enabled: t.enabled })
    setOpen(true)
  }

  async function save() {
    if (!form.name.trim()) return
    if (editing) {
      await api(`/api/admin/service-types/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: form.name.trim(), icon: form.icon.trim(), sort: Number(form.sort) || 0, enabled: form.enabled }),
      })
    } else {
      await api('/api/admin/service-types', {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim(), icon: form.icon.trim(), sort: Number(form.sort) || 0 }),
      })
    }
    setOpen(false)
    load()
  }

  async function toggle(t: ServiceType) {
    await api(`/api/admin/service-types/${t.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !t.enabled }),
    })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">服务类型</h1>
          <p className="mt-0.5 text-xs text-ink-faint">陪玩 / 护航 / 趣味单，预留未来业务扩展位</p>
        </div>
        <Btn onClick={openCreate}>
          <IconPlus size={16} /> 新增类型
        </Btn>
      </div>

      {list.length === 0 ? (
        <Card>
          <Empty text="暂无服务类型" />
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((t) => (
            <Card key={t.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{t.name}</span>
                  {t.reserved && <Tag className="border-warn/40 text-warn">预留</Tag>}
                  <Tag>{t.icon || 'gamepad-2'}</Tag>
                  <span className={t.enabled ? 'text-[11px] text-ok' : 'text-[11px] text-ink-faint'}>
                    {t.enabled ? '启用' : '停用'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-faint">排序：{t.sort} · 预留位：{t.reserved ? '是' : '否'}</p>
              </div>
              <div className="flex gap-1.5">
                <Btn size="sm" variant="outline" onClick={() => toggle(t)} disabled={t.reserved}>
                  {t.enabled ? '停用' : '启用'}
                </Btn>
                <Btn size="sm" variant="soft" onClick={() => openEdit(t)}>
                  <IconEdit size={14} /> 编辑
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} title={editing ? '编辑服务类型' : '新增服务类型'} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="名称 *">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：陪玩" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="图标标识">
              <TextInput value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="gamepad-2" />
            </Field>
            <Field label="排序">
              <TextInput
                type="number"
                value={form.sort}
                onChange={(e) => setForm({ ...form, sort: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 pb-1 text-sm text-ink-dim">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="h-4 w-4 accent-blue-600"
            />
            启用该类型
          </label>
          <Btn block onClick={save}>
            保存
          </Btn>
        </div>
      </Modal>
    </div>
  )
}
