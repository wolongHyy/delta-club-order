import { NextResponse } from "next/server"
import { auditAdminAction } from "@/lib/admin-auth"
import { createKnowledgeChunk, listKnowledgeChunks } from "@/lib/ai/db-ai"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  await auditAdminAction(request, "ai.knowledge.list", "")
  return NextResponse.json(listKnowledgeChunks(true))
}

export async function POST(request: Request) {
  try {
    await auditAdminAction(request, "ai.knowledge.create", "")
    const body = await request.json()
    const chunk = createKnowledgeChunk({
      key: String(body.key || "").trim(),
      category: String(body.category || "自定义").trim(),
      title: String(body.title || "").trim(),
      content: String(body.content || "").trim(),
      keywords: String(body.keywords || "").trim(),
      source: String(body.source || "手动添加").trim(),
      enabled: body.enabled !== false,
    })
    return NextResponse.json(chunk, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "添加失败" }, { status: 400 })
  }
}
