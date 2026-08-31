"use client"

import { useCallback, useEffect, useState } from "react"
import type { AiChatMessage, AiConversation, AiKnowledgeChunk } from "@/lib/types"
import { Btn, Card, Empty, Field, Select, Tag, TextArea, TextInput } from "@/components/ui"

type TabKey = "conversations" | "knowledge" | "settings"

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "conversations", label: "对话记录" },
  { key: "knowledge", label: "知识库" },
  { key: "settings", label: "客服设置" },
]

type AiSettingsForm = {
  enabled: boolean
  baseUrl: string
  apiKey: string
  model: string
  assistantName: string
  welcomeMessage: string
  temperature: number
  maxHistory: number
  topK: number
  persona: string
  quickQuestions: string
  testMessage: string
}

export default function AdminAiConsole() {
  const [tab, setTab] = useState<TabKey>("conversations")

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">智能客服</h1>
        <p className="mt-0.5 text-xs text-ink-faint">24小时 AI 客服：RAG 知识库 + 人格化回复，可管理对话、知识库与模型设置</p>
      </div>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              "rounded-full px-4 py-1.5 text-sm transition-colors " +
              (tab === t.key ? "bg-primary text-white" : "bg-surface text-ink-dim hover:text-ink")
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "conversations" && <ConversationsTab />}
      {tab === "knowledge" && <KnowledgeTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  )
}

// ===== 对话记录 =====
function ConversationsTab() {
  const [list, setList] = useState<AiConversation[]>([])
  const [active, setActive] = useState<AiConversation | null>(null)
  const [messages, setMessages] = useState<AiChatMessage[]>([])

  const load = useCallback(() => {
    api<AiConversation[]>("/api/admin/ai/conversations").then(setList).catch(() => setList([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function open(conv: AiConversation) {
    setActive(conv)
    setMessages([])
    const data = await api<{ conversation: AiConversation; messages: AiChatMessage[] }>(
      "/api/admin/ai/conversations/" + conv.id,
    ).catch(() => null)
    if (data) setMessages(data.messages)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="overflow-hidden lg:col-span-2">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">全部会话（{list.length}）</h2>
        </div>
        {list.length === 0 ? (
          <Empty text="暂无对话" />
        ) : (
          <div className="max-h-[560px] divide-y divide-line overflow-y-auto">
            {list.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => open(c)}
                className={
                  "block w-full p-3 text-left transition-colors hover:bg-primary/5 " +
                  (active?.id === c.id ? "bg-primary/8" : "")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{c.customerName || c.customerId}</span>
                  <span className="shrink-0 text-[11px] text-ink-faint">{c.updatedAt?.slice(0, 16)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-dim">{c.title}</p>
                <p className="mt-0.5 text-[11px] text-ink-faint">{c.messageCount} 条消息</p>
              </button>
            ))}
          </div>
        )}
      </Card>
      <Card className="lg:col-span-3">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{active ? active.title : "会话详情"}</h2>
        </div>
        {!active ? (
          <Empty text="点击左侧会话查看聊天记录" />
        ) : (
          <div className="max-h-[560px] space-y-3 overflow-y-auto p-4">
            {messages.map((m) => (
              <div key={m.id} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={
                    "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-6 " +
                    (m.role === "user"
                      ? "rounded-br-sm bg-primary text-white"
                      : "rounded-tl-sm bg-surface text-ink-dim")
                  }
                >
                  {m.content}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-1.5 border-t border-line/60 pt-1.5 text-[10px] text-ink-faint">
                      参考：{m.sources.join("、")}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ===== 知识库 =====
function KnowledgeTab() {
  const [list, setList] = useState<AiKnowledgeChunk[]>([])
  const [editing, setEditing] = useState<AiKnowledgeChunk | null>(null)
  const [form, setForm] = useState({ key: "", category: "", title: "", content: "", keywords: "", source: "", enabled: true })
  const [saving, setSaving] = useState(false)
  const [seedMsg, setSeedMsg] = useState("")

  const load = useCallback(() => {
    api<AiKnowledgeChunk[]>("/api/admin/ai/knowledge").then(setList).catch(() => setList([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function edit(chunk: AiKnowledgeChunk) {
    setEditing(chunk)
    setForm({ key: chunk.key, category: chunk.category, title: chunk.title, content: chunk.content, keywords: chunk.keywords, source: chunk.source, enabled: chunk.enabled })
  }

  function resetForm() {
    setForm({ key: "", category: "", title: "", content: "", keywords: "", source: "", enabled: true })
    setEditing(null)
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await api("/api/admin/ai/knowledge/" + editing.id, { method: "PUT", body: JSON.stringify(form) })
      } else {
        await api("/api/admin/ai/knowledge", { method: "POST", body: JSON.stringify(form) })
      }
      resetForm()
      load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(chunk: AiKnowledgeChunk) {
    if (!window.confirm("确认删除该知识条目？")) return
    await api("/api/admin/ai/knowledge/" + chunk.id, { method: "DELETE" }).catch(() => undefined)
    load()
  }

  async function reseed() {
    if (!window.confirm("将清空知识库并重新载入内置知识，确认？")) return
    setSeedMsg("重新载入中…")
    const r = await api<{ seeded: number }>("/api/admin/ai/knowledge/seed", { method: "POST" }).catch(() => null)
    setSeedMsg(r ? "已重新载入 " + r.seeded + " 条内置知识" : "重新载入失败")
    load()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-ink">{editing ? "编辑知识条目" : "新增知识条目"}</h2>
        <Field label="标题 *">
          <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="如：机密套餐价格" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="分类">
            <TextInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="如：套餐价格" />
          </Field>
          <Field label="关键词（逗号分隔）">
            <TextInput value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="保底,机密,45" />
          </Field>
        </div>
        <Field label="内容 *">
          <TextArea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="回答依据的准确内容" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="来源">
            <TextInput value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="如：规则文档" />
          </Field>
          <Field label="内部 key">
            <TextInput value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="留空自动生成" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-dim">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          启用该条目
        </label>
        <div className="flex gap-2">
          <Btn onClick={save} disabled={saving}>
            {saving ? "保存中…" : editing ? "保存修改" : "添加"}
          </Btn>
          {editing && (
            <Btn variant="ghost" onClick={resetForm}>
              取消
            </Btn>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">知识条目（{list.length}）</h2>
          <Btn variant="ghost" onClick={reseed}>
            重新载入内置知识
          </Btn>
        </div>
        {seedMsg && <p className="text-xs text-ink-faint">{seedMsg}</p>}
        <Card className="max-h-[620px] overflow-y-auto">
          {list.length === 0 ? (
            <Empty text="暂无知识条目" />
          ) : (
            <div className="divide-y divide-line">
              {list.map((c) => (
                <div key={c.id} className="p-3">
                  <div className="flex items-center gap-2">
                    <Tag className="border-primary/30 text-primary">{c.category || "未分类"}</Tag>
                    {!c.enabled && <Tag className="border-ink-faint/30 text-ink-faint">停用</Tag>}
                    <span className="truncate text-sm font-medium text-ink">{c.title}</span>
                    <span className="ml-auto flex shrink-0 gap-1">
                      <button type="button" onClick={() => edit(c)} className="text-xs text-ink-dim hover:text-primary">
                        编辑
                      </button>
                      <button type="button" onClick={() => remove(c)} className="text-xs text-ink-dim hover:text-warn">
                        删除
                      </button>
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-dim">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ===== 设置 =====
function SettingsTab() {
  const [form, setForm] = useState<AiSettingsForm>({
    enabled: true,
    baseUrl: "",
    apiKey: "",
    model: "",
    assistantName: "",
    welcomeMessage: "",
    temperature: 0.6,
    maxHistory: 8,
    topK: 5,
    persona: "",
    quickQuestions: "",
    testMessage: "",
  })
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    api<AiSettingsForm>("/api/admin/ai/settings")
      .then((s) =>
        setForm({
          enabled: s.enabled !== false,
          baseUrl: s.baseUrl || "",
          apiKey: s.apiKey || "",
          model: s.model || "",
          assistantName: s.assistantName || "",
          welcomeMessage: s.welcomeMessage || "",
          temperature: Number(s.temperature) || 0.7,
          maxHistory: Number(s.maxHistory) || 8,
          topK: Number(s.topK) || 5,
          persona: s.persona || "",
          quickQuestions: Array.isArray(s.quickQuestions) ? s.quickQuestions.join("，") : String(s.quickQuestions || ""),
          testMessage: s.testMessage || "",
        }),
      )
      .catch(() => undefined)
  }, [])

  async function save() {
    setSaving(true)
    try {
      await api("/api/admin/ai/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          quickQuestions: form.quickQuestions.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
          temperature: Number(form.temperature),
          maxHistory: Number(form.maxHistory),
          topK: Number(form.topK),
        }),
      })
      setTestResult({ ok: true, message: "设置已保存" })
    } catch {
      setTestResult({ ok: false, message: "保存失败" })
    } finally {
      setSaving(false)
    }
  }

  async function test() {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await api<{ ok: boolean; message: string }>("/api/admin/ai/test", {
        method: "POST",
        body: JSON.stringify(form),
      }).catch(() => ({ ok: false, message: "请求失败" }))
      setTestResult(r)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Card className="space-y-3 p-4">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          启用 24 小时智能客服
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="接口地址（OpenAI 兼容）">
            <TextInput value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="http://127.0.0.1:15721/v1" />
          </Field>
          <Field label="API Key（留空保留原值）">
            <TextInput value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="••••••" />
          </Field>
          <Field label="模型名称">
            <TextInput value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="deepseek-v4-flash / glm-4-flash" />
          </Field>
          <Field label="客服昵称">
            <TextInput value={form.assistantName} onChange={(e) => setForm({ ...form, assistantName: e.target.value })} placeholder="小V" />
          </Field>
          <Field label="温度（0-1.5）">
            <TextInput type="number" step="0.1" min="0" max="1.5" value={String(form.temperature)} onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })} />
          </Field>
          <Field label="记忆轮数（2-20）">
            <TextInput type="number" min="2" max="20" value={String(form.maxHistory)} onChange={(e) => setForm({ ...form, maxHistory: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="欢迎语">
          <TextArea rows={2} value={form.welcomeMessage} onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })} />
        </Field>
        <Field label="常见问题快捷提问（逗号分隔）">
          <TextInput value={form.quickQuestions} onChange={(e) => setForm({ ...form, quickQuestions: e.target.value })} />
        </Field>
        <Field label="人设与语气（陪伴/服务/聊天 skill）">
          <TextArea rows={8} value={form.persona} onChange={(e) => setForm({ ...form, persona: e.target.value })} />
          <p className="mt-1 text-[11px] text-ink-faint">留空使用默认人设：自然口语、短句、带温度、不机械不 AI 化、知识库优先、敏感问题转人工。</p>
        </Field>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={save} disabled={saving}>
            {saving ? "保存中…" : "保存设置"}
          </Btn>
          <Btn variant="ghost" onClick={test} disabled={testing}>
            {testing ? "测试中…" : "测试连接"}
          </Btn>
        </div>
        {testResult && (
          <p className={"text-sm " + (testResult.ok ? "text-primary" : "text-warn")}>{testResult.message}</p>
        )}
      </Card>
    </div>
  )
}

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string })?.error || "请求失败")
  return data as T
}
