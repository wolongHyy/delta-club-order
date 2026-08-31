"use client"

import { useEffect, useState } from "react"
import type { Message } from "@/lib/types"
import { apiCached } from "@/lib/client"
import { Card, Empty, IconChevronRight, IconChat } from "@/components/ui"

function fmtTime(s: string) {
  return s ? s.slice(5, 16) : ""
}

export default function MessagesView({
  onOpen,
  onOpenChat,
}: {
  onOpen: (id: string) => void
  onOpenChat: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    apiCached<Message[]>("/api/messages", 30_000)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoaded(true))
  }, [])

  const official = messages.filter((m) => m.type === "official")
  const cs = messages.filter((m) => m.type === "customer_service")

  const renderItem = (m: Message) => (
    <button
      key={m.id}
      type="button"
      onClick={() => onOpen(m.id)}
      className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-primary/5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <IconChat size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium text-ink">{m.title}</span>
          <span className="ml-2 shrink-0 text-[11px] text-ink-faint">{fmtTime(m.createdAt)}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-dim">{m.content}</p>
      </div>
      <IconChevronRight size={16} className="shrink-0 text-ink-faint" />
    </button>
  )

  return (
    <div>
      <header className="border-b border-line bg-bg/95 px-4 pb-3 pt-4 backdrop-blur">
        <h1 className="text-lg font-bold text-ink">消息</h1>
      </header>
      <div className="space-y-4 p-4">
        <section>
          <h2 className="mb-2 text-xs font-semibold text-ink-faint">智能客服</h2>
          <button
            type="button"
            onClick={onOpenChat}
            className="relative w-full overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 to-primary/5 p-4 text-left transition-colors hover:border-primary/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white">
                小V
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">24小时智能客服</span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">在线</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-dim">套餐价格、下单流程、保底规则、趣味单…随问随答</p>
              </div>
              <IconChevronRight size={18} className="shrink-0 text-primary" />
            </div>
          </button>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold text-ink-faint">官方公告</h2>
          <Card className="divide-y divide-line overflow-hidden">
            {official.length === 0 && !loaded ? (
              <div className="p-6 text-center text-sm text-ink-faint">加载中…</div>
            ) : official.length === 0 ? (
              <Empty text="暂无公告" />
            ) : (
              official.map(renderItem)
            )}
          </Card>
        </section>
        <section>
          <h2 className="mb-2 text-xs font-semibold text-ink-faint">客服消息</h2>
          <Card className="divide-y divide-line overflow-hidden">
            {cs.length === 0 ? <Empty text="暂无客服消息" /> : cs.map(renderItem)}
          </Card>
        </section>
      </div>
    </div>
  )
}
