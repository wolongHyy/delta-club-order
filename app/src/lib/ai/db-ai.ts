import { getDb, genId, nowLocal } from "@/lib/db"
import type { AiChatMessage, AiConversation, AiKnowledgeChunk } from "@/lib/types"
import fs from "node:fs"
import path from "node:path"

// ===== 知识库 =====

export type KnowledgeSeedEntry = {
  key: string
  category: string
  title: string
  content: string
  keywords: string
  source: string
}

let seedLoaded = false
let schemaChecked = false

export function loadBuiltinSeed(): KnowledgeSeedEntry[] {
  const file = path.join(process.cwd(), "src", "lib", "ai", "knowledge-seed.json")
  if (!fs.existsSync(file)) return []
  try {
    const raw = fs.readFileSync(file, "utf8")
    const data = JSON.parse(raw) as KnowledgeSeedEntry[]
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error("knowledge-seed.json parse failed", error)
    return []
  }
}

export function ensureAiSchema(): void {
  if (schemaChecked) return
  schemaChecked = true
  const d = getDb()
  const cols = d.prepare("PRAGMA table_info(AiConversation)").all() as any[]
  if (!cols.some((c) => c.name === "customerName")) {
    d.exec("ALTER TABLE AiConversation ADD COLUMN customerName TEXT DEFAULT ''")
  }
}

export function ensureAiSeeded(): number {
  ensureAiSchema()
  if (seedLoaded) return 0
  seedLoaded = true
  const d = getDb()
  const count = d.prepare("SELECT COUNT(*) AS n FROM AiKnowledgeChunk").get() as { n: number }
  if (count.n > 0) return 0
  const entries = loadBuiltinSeed()
  let added = 0
  for (const e of entries) {
    const id = genId()
    d.prepare(
      "INSERT OR IGNORE INTO AiKnowledgeChunk (id, key, category, title, content, keywords, source, enabled, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,1,?,?)",
    ).run(id, e.key, e.category, e.title, e.content, e.keywords, e.source, nowLocal(), nowLocal())
    added += 1
  }
  if (added > 0) console.log("[ai] knowledge seeded: " + added + " chunks")
  return added
}

function kbRow(r: any): AiKnowledgeChunk {
  return {
    id: r.id,
    key: r.key || "",
    category: r.category || "",
    title: r.title || "",
    content: r.content || "",
    keywords: r.keywords || "",
    source: r.source || "",
    enabled: !!r.enabled,
    createdAt: r.createdAt || "",
    updatedAt: r.updatedAt || "",
  }
}

export function listKnowledgeChunks(includeDisabled = false): AiKnowledgeChunk[] {
  ensureAiSeeded()
  const rows = getDb()
    .prepare("SELECT * FROM AiKnowledgeChunk " + (includeDisabled ? "" : "WHERE enabled = 1") + " ORDER BY category ASC, createdAt ASC")
    .all() as any[]
  return rows.map(kbRow)
}

export function countKnowledgeChunks(): number {
  ensureAiSeeded()
  const r = getDb().prepare("SELECT COUNT(*) AS n FROM AiKnowledgeChunk").get() as { n: number }
  return r.n
}

export function createKnowledgeChunk(input: KnowledgeSeedEntry & { enabled?: boolean }): AiKnowledgeChunk {
  ensureAiSeeded()
  const d = getDb()
  const id = genId()
  const now = nowLocal()
  d.prepare(
    "INSERT INTO AiKnowledgeChunk (id, key, category, title, content, keywords, source, enabled, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)",
  ).run(
    id,
    input.key || id,
    input.category || "",
    input.title || "",
    input.content || "",
    input.keywords || "",
    input.source || "",
    input.enabled === false ? 0 : 1,
    now,
    now,
  )
  return listKnowledgeChunks(true).find((k) => k.id === id)!
}

export function updateKnowledgeChunk(id: string, input: Partial<KnowledgeSeedEntry> & { enabled?: boolean }): AiKnowledgeChunk | null {
  const d = getDb()
  const cur = d.prepare("SELECT * FROM AiKnowledgeChunk WHERE id = ?").get(id) as any
  if (!cur) return null
  d.prepare(
    "UPDATE AiKnowledgeChunk SET key = ?, category = ?, title = ?, content = ?, keywords = ?, source = ?, enabled = ?, updatedAt = ? WHERE id = ?",
  ).run(
    input.key ?? cur.key ?? "",
    input.category ?? cur.category ?? "",
    input.title ?? cur.title ?? "",
    input.content ?? cur.content ?? "",
    input.keywords ?? cur.keywords ?? "",
    input.source ?? cur.source ?? "",
    input.enabled === undefined ? cur.enabled : input.enabled ? 1 : 0,
    nowLocal(),
    id,
  )
  return listKnowledgeChunks(true).find((k) => k.id === id) || null
}

export function deleteKnowledgeChunk(id: string): boolean {
  const r = getDb().prepare("DELETE FROM AiKnowledgeChunk WHERE id = ?").run(id)
  return r.changes > 0
}

export function resetKnowledgeFromSeed(): number {
  const d = getDb()
  ensureAiSchema()
  d.exec("DELETE FROM AiKnowledgeChunk")
  seedLoaded = true
  const entries = loadBuiltinSeed()
  let added = 0
  for (const e of entries) {
    const id = genId()
    d.prepare(
      "INSERT OR IGNORE INTO AiKnowledgeChunk (id, key, category, title, content, keywords, source, enabled, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,1,?,?)",
    ).run(id, e.key, e.category, e.title, e.content, e.keywords, e.source, nowLocal(), nowLocal())
    added += 1
  }
  return added
}

// ===== 会话与消息 =====

export type NewConversationInput = { customerId: string; customerName?: string; title?: string }

export function createAiConversation(input: NewConversationInput): AiConversation {
  ensureAiSchema()
  const d = getDb()
  const id = genId()
  const now = nowLocal()
  d.prepare(
    "INSERT INTO AiConversation (id, customerId, customerName, title, status, messageCount, createdAt, updatedAt) VALUES (?,?,?,?,?,0,?,?)",
  ).run(id, input.customerId, input.customerName || "", input.title || "智能客服咨询", "active", now, now)
  return getAiConversation(id)!
}

export function getAiConversation(id: string): AiConversation | null {
  const r = getDb().prepare("SELECT * FROM AiConversation WHERE id = ?").get(id) as any
  if (!r) return null
  return {
    id: r.id,
    customerId: r.customerId,
    customerName: r.customerName || "",
    title: r.title || "",
    status: r.status || "active",
    messageCount: r.messageCount || 0,
    createdAt: r.createdAt || "",
    updatedAt: r.updatedAt || "",
  }
}

export function listMyAiConversations(customerId: string): AiConversation[] {
  const rows = getDb()
    .prepare("SELECT * FROM AiConversation WHERE customerId = ? ORDER BY updatedAt DESC LIMIT 50")
    .all(customerId) as any[]
  return rows.map((r) => ({
    id: r.id,
    customerId: r.customerId,
    customerName: r.customerName || "",
    title: r.title || "",
    status: r.status || "active",
    messageCount: r.messageCount || 0,
    createdAt: r.createdAt || "",
    updatedAt: r.updatedAt || "",
  }))
}

export function listAllAiConversations(): AiConversation[] {
  const rows = getDb()
    .prepare("SELECT * FROM AiConversation ORDER BY updatedAt DESC LIMIT 300")
    .all() as any[]
  return rows.map((r) => ({
    id: r.id,
    customerId: r.customerId,
    customerName: r.customerName || r.customerId,
    title: r.title || "",
    status: r.status || "active",
    messageCount: r.messageCount || 0,
    createdAt: r.createdAt || "",
    updatedAt: r.updatedAt || "",
  }))
}

export function listAiConversationMessages(conversationId: string): AiChatMessage[] {
  const rows = getDb()
    .prepare("SELECT * FROM AiMessage WHERE conversationId = ? ORDER BY createdAt ASC, rowid ASC")
    .all(conversationId) as any[]
  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversationId,
    role: r.role,
    content: r.content || "",
    sources: safeJsonArray(r.sources),
    createdAt: r.createdAt || "",
  }))
}

export function addAiMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  sources: string[] = [],
): AiChatMessage {
  const d = getDb()
  const id = genId()
  const now = nowLocal()
  d.prepare("INSERT INTO AiMessage (id, conversationId, role, content, sources, createdAt) VALUES (?,?,?,?,?,?)").run(
    id,
    conversationId,
    role,
    content,
    JSON.stringify(sources),
    now,
  )
  d.prepare("UPDATE AiConversation SET messageCount = messageCount + 1, updatedAt = ? WHERE id = ?").run(now, conversationId)
  return listAiConversationMessages(conversationId).find((m) => m.id === id)!
}

export function touchAiConversation(conversationId: string, title?: string): void {
  const d = getDb()
  if (title) {
    d.prepare("UPDATE AiConversation SET title = ?, updatedAt = ? WHERE id = ?").run(title, nowLocal(), conversationId)
  } else {
    d.prepare("UPDATE AiConversation SET updatedAt = ? WHERE id = ?").run(nowLocal(), conversationId)
  }
}

function safeJsonArray(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}
