"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { AiChatMessage, AiConversation } from "@/lib/types"
import { IconBack, IconSend } from "@/components/ui"

type ChatBubble = {
  role: "user" | "assistant"
  content: string
  error?: boolean
}

export default function CustomerServiceView({
  onBack,
}: {
  onBack: () => void
}) {
  const [assistantName, setAssistantName] = useState("小V")
  const [welcome, setWelcome] = useState("")
  const [quickQuestions, setQuickQuestions] = useState<string[]>([])
  const [wechat, setWechat] = useState("")
  const [enabled, setEnabled] = useState(true)
  const [convId, setConvId] = useState("")
  const [messages, setMessages] = useState<ChatBubble[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [])

  // 初始化：读取状态 + 打开最近会话
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const status = await fetch("/api/ai/status").then((r) => r.json().catch(() => ({})))
        if (cancelled) return
        setAssistantName(status.assistantName || "小V")
        setWelcome(status.welcomeMessage || "")
        setQuickQuestions(Array.isArray(status.quickQuestions) ? status.quickQuestions : [])
        setWechat(status.customerServiceWechat || "")
        setEnabled(status.enabled !== false)
        if (status.enabled === false) return
        const list = await fetch("/api/ai/conversations").then((r) => r.json().catch(() => []))
        if (cancelled) return
        if (Array.isArray(list) && list.length > 0) {
          const latest = list[0] as AiConversation
          setConvId(latest.id)
          const detail = await fetch("/api/ai/conversations/" + latest.id).then((r) => r.json().catch(() => null))
          if (detail && Array.isArray(detail.messages)) {
            const bubbles: ChatBubble[] = detail.messages.map((m: AiChatMessage) => ({
              role: m.role,
              content: m.content,
            }))
            setMessages(bubbles)
            if (bubbles.length === 0) setMessages([{ role: "assistant", content: status.welcomeMessage || "" }])
          }
        } else {
          setMessages([{ role: "assistant", content: status.welcomeMessage || "嗨，有什么可以帮你的吗？" }])
        }
      } catch {
        if (!cancelled) setMessages([{ role: "assistant", content: "智能客服暂时连不上，你可以联系人工客服哦。" }])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  async function ensureConversation(): Promise<string> {
    if (convId) return convId
    const res = await fetch("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: input.slice(0, 20) || "智能客服咨询" }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.id) throw new Error(data.error || "创建会话失败")
    setConvId(data.id)
    return data.id as string
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || sending) return
    if (!enabled) return
    setSending(true)
    setMessages((prev) => [
      ...prev,
      { role: "user", content },
      { role: "assistant", content: "" },
    ])
    setInput("")
    try {
      const id = await ensureConversation()
      const res = await fetch("/api/ai/conversations/" + id + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "请求失败" }))
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: err.error || "请求失败，请稍后再试", error: true }
          return copy
        })
        return
      }
      if (!res.body) throw new Error("无响应")
      const reader = res.body.getReader()
      const decoder = new TextDecoder("utf-8")
      let acc = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        const snapshot = acc
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: snapshot }
          return copy
        })
      }
      if (!acc.trim()) {
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: "抱歉，我暂时没答上来，你可以换个问法，或者直接联系人工客服哦。", error: true }
          return copy
        })
      }
    } catch (error) {
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: "assistant", content: "网络开小差了，稍等一下再试？也可以直接加人工客服微信处理。", error: true }
        return copy
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={onBack} className="rounded-full p-1 text-ink-dim hover:text-ink">
          <IconBack size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-ink">{assistantName}</h1>
          <p className="text-[11px] text-primary">{enabled ? "24小时智能客服 · 在线" : "智能客服已关闭"}</p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm leading-6 text-white">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {assistantName.slice(0, 1)}
              </div>
              <div
                className={
                  "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-surface px-3.5 py-2 text-sm leading-6 text-ink-dim " +
                  (m.error ? "border border-warn/50 text-warn" : "")
                }
              >
                {m.content || (sending ? "正在输入…" : "")}
                {m.content === "" && !sending && <span className="text-ink-faint">…</span>}
              </div>
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      {quickQuestions.length > 0 && messages.filter((m) => m.role === "user").length === 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {quickQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-line bg-bg/95 p-3 backdrop-blur">
        {!enabled ? (
          <div className="flex items-center justify-between px-1 pb-1 text-xs text-ink-faint">
            <span>智能客服暂时关闭</span>
            {wechat && <span>人工客服微信：{wechat}</span>}
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              rows={1}
              placeholder="想问价格、规则、趣味单都可以问我…"
              className="max-h-28 min-h-[42px] flex-1 resize-none rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-primary/50"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={sending || !input.trim()}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
            >
              <IconSend size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
