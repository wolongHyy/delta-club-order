'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Message } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Card, Empty, Field, IconSend, Tag, TextArea, TextInput } from '@/components/ui'

export default function AdminMessages() {
  const [list, setList] = useState<Message[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(() => {
    api<Message[]>('/api/messages').then(setList).catch(() => setList([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function publish() {
    if (!title.trim() || !content.trim()) return
    setSending(true)
    try {
      await api('/api/admin/messages', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      })
      setTitle('')
      setContent('')
      load()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold text-ink">消息管理</h1>
          <p className="mt-0.5 text-xs text-ink-faint">发布官方公告，推送至用户端消息页</p>
        </div>
        <Card className="space-y-3 p-4">
          <Field label="公告标题 *">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：平台更新通知" />
          </Field>
          <Field label="公告内容 *">
            <TextArea value={content} onChange={(e) => setContent(e.target.value)} placeholder="公告正文" />
          </Field>
          <Btn block onClick={publish} disabled={sending}>
            <IconSend size={16} /> {sending ? '发布中…' : '发布公告'}
          </Btn>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">已发布消息</h2>
        </div>
        {list.length === 0 ? (
          <Empty text="暂无消息" />
        ) : (
          <div className="divide-y divide-line">
            {list.map((m) => (
              <div key={m.id} className="p-3">
                <div className="flex items-center gap-2">
                  <Tag className={m.type === 'official' ? 'border-primary/40 text-primary' : 'border-warn/40 text-warn'}>
                    {m.type === 'official' ? '官方公告' : '客服'}
                  </Tag>
                  <span className="text-sm font-medium text-ink">{m.title}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-ink-faint">{m.createdAt?.slice(0, 16)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-ink-dim">{m.content}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
