export type LlmConfig = {
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
}

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string }

function chatUrl(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, "")
  if (base.endsWith("/chat/completions")) return base
  return base + "/chat/completions"
}

export class LlmError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (data && data.error) {
      const e = data.error
      return (typeof e === "string" ? e : e.message) || res.statusText
    }
    return res.statusText
  } catch {
    return res.statusText
  }
}

// 非流式补全（测试连接 / 降级用）
export async function completeChat(config: LlmConfig, messages: LlmMessage[], signal?: AbortSignal): Promise<string> {
  const res = await fetch(chatUrl(config.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + (config.apiKey || ""),
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      stream: false,
      max_tokens: 2500,
    }),
    signal,
  })
  if (!res.ok) throw new LlmError(await readError(res), res.status)
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== "string" || !text.trim()) throw new LlmError("模型返回为空")
  return text.trim()
}

function parseDelta(payload: string): string {
  try {
    const json = JSON.parse(payload)
    const delta = json?.choices?.[0]?.delta
    const text = delta?.content
    if (typeof text === "string") return text
    const messageContent = json?.choices?.[0]?.message?.content
    if (typeof messageContent === "string") return messageContent
    return ""
  } catch {
    return ""
  }
}

// 流式补全：解析 OpenAI 兼容 SSE，只输出正式内容（跳过 reasoning_content）
export async function streamChatCompletion(
  config: LlmConfig,
  messages: LlmMessage[],
  signal?: AbortSignal,
): Promise<ReadableStream<string>> {
  const res = await fetch(chatUrl(config.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + (config.apiKey || ""),
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      stream: true,
      max_tokens: 2500,
    }),
    signal,
  })
  if (!res.ok) throw new LlmError(await readError(res), res.status)
  if (!res.body) throw new LlmError("模型流式响应为空")

  const reader = res.body.getReader()
  const decoder = new TextDecoder("utf-8")
  let buffer = ""

  return new ReadableStream<string>({
    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            const tail = buffer.trim()
            buffer = ""
            if (tail.startsWith("data:")) {
              const payload = tail.slice(5).trim()
              if (payload && payload !== "[DONE]") {
                const text = parseDelta(payload)
                if (text) controller.enqueue(text)
              }
            }
            controller.close()
            return
          }
          buffer += decoder.decode(value, { stream: true })
          let nl = buffer.indexOf("\n")
          while (nl >= 0) {
            const line = buffer.slice(0, nl).trim()
            buffer = buffer.slice(nl + 1)
            if (line.startsWith("data:")) {
              const payload = line.slice(5).trim()
              if (payload === "[DONE]") {
                controller.close()
                return
              }
              const text = parseDelta(payload)
              if (text) controller.enqueue(text)
            }
            nl = buffer.indexOf("\n")
          }
          if (controller.desiredSize != null && controller.desiredSize <= 0) return
        }
      } catch (error) {
        controller.error(error)
      }
    },
  })
}
