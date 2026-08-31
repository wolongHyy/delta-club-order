'use client'

import { useEffect, useState } from 'react'
import type { Message } from '@/lib/types'
import { api } from '@/lib/client'
import { Card, IconBack, Tag } from '@/components/ui'

export default function MessageDetailView({
  messageId,
  onBack,
}: {
  messageId: string
  onBack: () => void
}) {
  const [msg, setMsg] = useState<Message | null>(null)

  useEffect(() => {
    api<Message[]>('/api/messages')
      .then((list) => setMsg(list.find((m) => m.id === messageId) || null))
      .catch(() => setMsg(null))
  }, [messageId])

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={onBack} className="rounded-full p-1 text-ink-dim hover:text-ink">
          <IconBack size={20} />
        </button>
        <h1 className="text-base font-semibold text-ink">消息详情</h1>
      </header>
      {!msg ? (
        <Card className="m-4 p-6 text-center text-sm text-ink-faint">加载中…</Card>
      ) : (
        <Card className="m-4 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Tag className={msg.type === 'official' ? 'border-primary/40 text-primary' : 'border-warn/40 text-warn'}>
              {msg.type === 'official' ? '官方公告' : '客服消息'}
            </Tag>
            <span className="text-[11px] text-ink-faint">{msg.createdAt?.slice(0, 16)}</span>
          </div>
          <h2 className="text-base font-semibold text-ink">{msg.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-dim">{msg.content}</p>
        </Card>
      )}
    </div>
  )
}
