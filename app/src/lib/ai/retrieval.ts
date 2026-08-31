import type { AiKnowledgeChunk } from "@/lib/types"

export type ScoredChunk = {
  chunk: AiKnowledgeChunk
  score: number
  matched: string[]
}

// 单字停用词：由这些字组成的 n-gram 会被过滤
const STOP_CHARS = new Set(
  "的了么吗呢啊呀哦嗯吧嘛哈是这在有和与及或都就很也还要想能可以请什么怎么多少哪哪那个我你他她我们你们他们老板客服朋友".split(""),
)

const CJK = /[\u4e00-\u9fff]/
const ASCII_WORD = /[a-z0-9]+(?:\.[0-9]+)?/g

export function tokenize(text: string): string[] {
  const s = text.toLowerCase()
  const tokens: string[] = []
  const words = s.match(ASCII_WORD) || []
  tokens.push(...words)
  const cjk = s.replace(/[^\u4e00-\u9fff]/g, "")
  for (let i = 0; i < cjk.length - 1; i += 1) tokens.push(cjk.slice(i, i + 2))
  for (let i = 0; i < cjk.length - 2; i += 1) tokens.push(cjk.slice(i, i + 3))
  const unique = new Set<string>()
  for (const t of tokens) {
    if (t.length < 2) continue
    const chars = t.split("")
    if (chars.every((c) => STOP_CHARS.has(c))) continue
    unique.add(t)
  }
  return Array.from(unique)
}

// 常见业务同义改写，让"多少钱/代练/上分"也能命中知识库
export function expandQuery(text: string): string[] {
  const variants = [text]
  const map: Array<[RegExp, string]> = [
    [/多少钱|什么价|价位|价格|报价|价目/g, "价格"],
    [/代练|代打|上分|带打/g, "护航"],
    [/陪玩多少钱|陪打/g, "陪玩"],
    [/怎么下单|如何下单|怎么买|怎么付款/g, "下单"],
    [/有什么服务|有哪些|服务有哪些/g, "服务类型"],
    [/什么是保底|保底是什么/g, "保底"],
    [/炸了|炸单了|这把炸了/g, "炸单"],
    [/退款|退钱|退单/g, "退款"],
    [/投诉|举报/g, "纠纷"],
    [/客服微信|人工|真人/g, "客服微信"],
    [/跑刀|开荒/g, "跑刀开荒"],
    [/绝密|机密|监狱|航天|巴克仕/g, "地图"],
  ]
  for (const [re, rep] of map) {
    if (re.test(text)) variants.push(text.replace(re, rep))
  }
  return variants
}

// 标准 BM25 + 关键词命中加成 + 整句命中加成
export function retrieve(
  query: string,
  chunks: AiKnowledgeChunk[],
  topK = 5,
): ScoredChunk[] {
  const queryVariants = expandQuery(query)
  const queryTokens = new Set<string>()
  for (const q of queryVariants) for (const t of tokenize(q)) queryTokens.add(t)
  if (queryTokens.size === 0) return []

  const scored: ScoredChunk[] = []
  const N = Math.max(chunks.length, 1)
  const avgLen = chunks.reduce((sum, c) => sum + tokenize(c.content + c.title).length, 0) / N

  for (const chunk of chunks) {
    const docTokens = tokenize(chunk.content + " " + chunk.title)
    const keywordTokens = new Set(tokenize(chunk.keywords || ""))
    const docLen = Math.max(docTokens.length, 1)
    const df = new Map<string, number>()
    for (const t of docTokens) df.set(t, (df.get(t) || 0) + 1)

    let score = 0
    const matched: string[] = []
    const k1 = 1.5
    const b = 0.75
    for (const qt of queryTokens) {
      const tf = df.get(qt) || 0
      if (tf === 0) continue
      const idf = Math.log(1 + (N - 1) / 1) // 单文档频近似
      const denom = tf + k1 * (1 - b + b * (docLen / avgLen))
      score += idf * ((tf * (k1 + 1)) / denom)
      if (keywordTokens.has(qt)) score += 1.5
      matched.push(qt)
    }

    // 列举型问题（有什么/推荐/清单…）：总览、价目表类条目优先
    if (/有什么|有哪些|推荐|全部|清单|列表|价目|价格表|总览/.test(query)) {
      if (/总览|价目表/.test(chunk.title)) score += 8
      else if (chunk.category === "趣味单") score += 1.5
    }

    // 整句/关键词直接命中加成
    const haystack = (chunk.title + chunk.content + chunk.keywords).toLowerCase()
    if (haystack.includes(query.toLowerCase()) && query.trim().length >= 2) score += 6
    for (const q of queryVariants) {
      if (q.trim().length >= 2 && haystack.includes(q.toLowerCase())) score += 3
    }

    if (score > 0) scored.push({ chunk, score, matched: Array.from(new Set(matched)) })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

// 用关键词直接匹配（管理端测试用）
export function matchByKeyword(query: string, chunks: AiKnowledgeChunk[]): AiKnowledgeChunk[] {
  const q = query.toLowerCase()
  return chunks.filter((c) => {
    const hay = (c.title + c.content + c.keywords + c.category).toLowerCase()
    return tokenize(q).some((t) => hay.includes(t)) || (q.length >= 2 && hay.includes(q))
  })
}
