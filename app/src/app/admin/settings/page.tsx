'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/client'
import { Btn, Card, Field, TextArea, TextInput } from '@/components/ui'

export default function AdminSettings() {
  const [form, setForm] = useState({ shopName: '', customerServiceWechat: '', notice: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<Record<string, string>>('/api/admin/settings')
      .then((s) =>
        setForm({
          shopName: s.shopName || '',
          customerServiceWechat: s.customerServiceWechat || '',
          notice: s.notice || '',
        }),
      )
      .catch(() => undefined)
  }, [])

  async function save() {
    setSaving(true)
    try {
      await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(form) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">设置</h1>
        <p className="mt-0.5 text-xs text-ink-faint">店铺信息与系统占位配置</p>
      </div>
      <Card className="space-y-3 p-4">
        <Field label="店铺名称">
          <TextInput value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
        </Field>
        <Field label="客服微信">
          <TextInput
            value={form.customerServiceWechat}
            onChange={(e) => setForm({ ...form, customerServiceWechat: e.target.value })}
            placeholder="微信号（占位）"
          />
        </Field>
        <Field label="门店公告">
          <TextArea value={form.notice} onChange={(e) => setForm({ ...form, notice: e.target.value })} />
        </Field>
        <Btn onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存设置'}
        </Btn>
      </Card>
      <Card className="p-4 text-xs leading-5 text-ink-faint">
        <p>系统信息：三角洲游戏服务平台 v1.0</p>
        <p>数据存储：SQLite（app/db/custom.db）</p>
        <p>运行方式：start.bat 便携启动 / npm run dev 开发</p>
      </Card>
    </div>
  )
}
