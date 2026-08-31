import { getSettings, setSetting, listServiceTypes, listCompanions } from "@/lib/db"
import type { AiSettings } from "@/lib/types"
import {
  addAiMessage,
  getAiConversation,
  listAiConversationMessages,
  listKnowledgeChunks,
  touchAiConversation,
} from "./db-ai"
import { retrieve } from "./retrieval"
import { buildContextBlock, buildMessages, buildPersonaPrompt, DEFAULT_ASSISTANT_NAME, DEFAULT_PERSONA, DEFAULT_QUICK_QUESTIONS, DEFAULT_WELCOME } from "./persona"
import { streamChatCompletion, completeChat, LlmError, type LlmConfig } from "./llm"

const SETTING_KEYS = [
  "ai.enabled",
  "ai.baseUrl",
  "ai.apiKey",
  "ai.model",
  "ai.assistantName",
  "ai.welcomeMessage",
  "ai.temperature",
  "ai.maxHistory",
  "ai.topK",
  "ai.persona",
  "ai.quickQuestions",
  "ai.testMessage",
] as const

export function defaultAiSettings(): AiSettings {
  return {
    enabled: true,
    baseUrl: "http://127.0.0.1:15721/v1",
    apiKey: "PROXY_MANAGED",
    model: "deepseek-v4-flash",
    assistantName: DEFAULT_ASSISTANT_NAME,
    welcomeMessage: DEFAULT_WELCOME,
    temperature: 0.6,
    maxHistory: 8,
    topK: 5,
    persona: DEFAULT_PERSONA,
    quickQuestions: DEFAULT_QUICK_QUESTIONS,
    testMessage: "你好，测试一下连接",
  }
}

export function aiSettings(): AiSettings {
  const s = getSettings()
  const def = defaultAiSettings()
  const num = (v: string | undefined, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  const quick = s["ai.quickQuestions"]
  let quickQuestions = def.quickQuestions
  if (quick) {
    try {
      const parsed = JSON.parse(quick)
      if (Array.isArray(parsed) && parsed.length > 0) quickQuestions = parsed.map(String)
    } catch {
      // keep default
    }
  }
  return {
    enabled: process.env.AI_ENABLED !== undefined ? process.env.AI_ENABLED === "1" || process.env.AI_ENABLED === "true" : s["ai.enabled"] !== undefined ? s["ai.enabled"] === "1" : def.enabled,
    baseUrl: process.env.AI_BASE_URL || s["ai.baseUrl"] || def.baseUrl,
    apiKey: process.env.AI_API_KEY || s["ai.apiKey"] || def.apiKey,
    model: process.env.AI_MODEL || s["ai.model"] || def.model,
    assistantName: s["ai.assistantName"] || def.assistantName,
    welcomeMessage: s["ai.welcomeMessage"] || def.welcomeMessage,
    temperature: num(s["ai.temperature"], def.temperature),
    maxHistory: Math.max(2, Math.min(20, Math.round(num(s["ai.maxHistory"], def.maxHistory)))),
    topK: Math.max(1, Math.min(10, Math.round(num(s["ai.topK"], def.topK)))),
    persona: s["ai.persona"] || def.persona,
    quickQuestions,
    testMessage: s["ai.testMessage"] || def.testMessage,
  }
}

export function saveAiSettings(input: Partial<AiSettings>): AiSettings {
  const def = defaultAiSettings()
  if (input.enabled !== undefined) setSetting("ai.enabled", input.enabled ? "1" : "0")
  if (input.baseUrl !== undefined && input.baseUrl !== null) setSetting("ai.baseUrl", String(input.baseUrl).trim())
  if (input.apiKey !== undefined && input.apiKey !== null) {
    const key = String(input.apiKey).trim()
    if (key === "" || key.startsWith("••")) {
      // 空或掩码值不覆盖
    } else {
      setSetting("ai.apiKey", key)
    }
  }
  if (input.model !== undefined && input.model !== null) setSetting("ai.model", String(input.model).trim())
  if (input.assistantName !== undefined && input.assistantName !== null) setSetting("ai.assistantName", String(input.assistantName).trim())
  if (input.welcomeMessage !== undefined && input.welcomeMessage !== null) setSetting("ai.welcomeMessage", String(input.welcomeMessage))
  if (input.temperature !== undefined && input.temperature !== null) setSetting("ai.temperature", String(input.temperature))
  if (input.maxHistory !== undefined && input.maxHistory !== null) setSetting("ai.maxHistory", String(input.maxHistory))
  if (input.topK !== undefined && input.topK !== null) setSetting("ai.topK", String(input.topK))
  if (input.persona !== undefined && input.persona !== null) setSetting("ai.persona", String(input.persona))
  if (input.quickQuestions !== undefined && input.quickQuestions !== null) setSetting("ai.quickQuestions", JSON.stringify(input.quickQuestions))
  if (input.testMessage !== undefined && input.testMessage !== null) setSetting("ai.testMessage", String(input.testMessage))
  return aiSettings()
}

export function maskApiKey(key: string): string {
  if (!key) return ""
  if (key.length <= 4) return "••••"
  return "••••••" + key.slice(-4)
}

export function llmConfig(settings: AiSettings): LlmConfig {
  return {
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    temperature: settings.temperature,
  }
}

// 把在售服务类型与商品拼成一条"实时商品"资料
export function buildCatalogChunk(): string {
  const types = listServiceTypes()
  const companions = listCompanions()
  const parts: string[] = []
  if (types.length > 0) {
    parts.push("服务类型：" + types.map((t) => t.name).join("、"))
  }
  if (companions.length > 0) {
    const rows = companions.slice(0, 30).map((c) => {
      const tags = c.tags && c.tags.length > 0 ? "（" + c.tags.join("/") + "）" : ""
      return c.name + tags + " " + c.price + "元/" + (c.unit || "单")
    })
    parts.push("在售商品：" + rows.join("；"))
  }
  return parts.join("\n")
}

export function buildContext(settings: AiSettings, query: string): { catalog: string; hits: ReturnType<typeof retrieve> } {
  const chunks = listKnowledgeChunks()
  const catalog = buildCatalogChunk()
  const hits = retrieve(query, chunks, settings.topK)
  return { catalog, hits }
}

export async function testLlmConnection(settings: AiSettings): Promise<{ ok: boolean; message: string }> {
  try {
    const messages = [
      { role: "system" as const, content: "你是客服机器人，请用一句话简短回复。" },
      { role: "user" as const, content: settings.testMessage || "你好" },
    ]
    const text = await completeChat(llmConfig(settings), messages)
    return { ok: true, message: "连接成功，模型返回：" + text.slice(0, 120) }
  } catch (error) {
    if (error instanceof LlmError) return { ok: false, message: "连接失败：" + error.message }
    return { ok: false, message: "连接失败：" + String((error as Error)?.message || error) }
  }
}

// 流式回答：保存用户消息 → 检索 → 调用模型 → 流式返回并落库
export async function streamAiAnswer(input: {
  conversationId: string
  customerId: string
  text: string
  signal?: AbortSignal
}): Promise<ReadableStream<string>> {
  const conversation = getAiConversation(input.conversationId)
  if (!conversation || conversation.customerId !== input.customerId) {
    throw Object.assign(new Error("会话不存在"), { status: 404 })
  }
  const settings = aiSettings()
  if (!settings.enabled) throw Object.assign(new Error("智能客服已关闭"), { status: 403 })

  const text = input.text.trim()
  if (!text) throw Object.assign(new Error("消息不能为空"), { status: 400 })
  if (text.length > 500) throw Object.assign(new Error("消息太长了，请精简到500字以内"), { status: 400 })

  addAiMessage(input.conversationId, "user", text)
  if (conversation.messageCount === 0) {
    touchAiConversation(input.conversationId, text.slice(0, 20))
  }

  const { catalog, hits } = buildContext(settings, text)
  const history = listAiConversationMessages(input.conversationId).slice(0, -1)
  const shop = getSettings()
  const contextBlock = buildContextBlock(
    {
      shopName: shop.shopName || "",
      customerServiceWechat: shop.customerServiceWechat || "",
      notice: shop.notice || "",
    },
    catalog,
    hits,
  )
  const messages = buildMessages(
    buildPersonaPrompt(settings),
    contextBlock,
    history.slice(-settings.maxHistory),
    text,
    settings.maxHistory,
  )

  const config = llmConfig(settings)
  const llmStream = await streamChatCompletion(config, messages, input.signal)
  const sources = hits.map((h) => h.chunk.title)

  let acc = ""
  let reader: ReadableStreamDefaultReader<string> | null = null
  return new ReadableStream<string>({
    async start(controller) {
      reader = llmStream.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += value
          controller.enqueue(value)
        }
      } catch (error) {
        // 流中断：仍保存已生成部分
      }
      if (!acc.trim()) {
        // 兜底：流式没有内容（可能推理占满 token），改用非流式再问一次
        try {
          const fallback = await completeChat(config, messages)
          acc = fallback
          controller.enqueue(fallback)
        } catch {
          // 兜底也失败：什么都不写，客户端展示错误提示
        }
      }
      if (acc.trim()) {
        addAiMessage(input.conversationId, "assistant", acc.trim(), sources)
      }
      controller.close()
    },
    cancel() {
      if (reader) reader.cancel().catch(() => undefined)
    },
  })
}
