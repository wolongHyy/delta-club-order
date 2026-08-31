import { NextResponse } from "next/server"
import { auditAdminAction } from "@/lib/admin-auth"
import { deleteKnowledgeChunk, updateKnowledgeChunk } from "@/lib/ai/db-ai"

export const dynamic = "force-dynamic"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await auditAdminAction(request, "ai.knowledge.update", id)
    const body = await request.json()
    const chunk = updateKnowledgeChunk(id, {
      key: body.key !== undefined ? String(body.key) : undefined,
      category: body.category !== undefined ? String(body.category) : undefined,
      title: body.title !== undefined ? String(body.title) : undefined,
      content: body.content !== undefined ? String(body.content) : undefined,
      keywords: body.keywords !== undefined ? String(body.keywords) : undefined,
      source: body.source !== undefined ? String(body.source) : undefined,
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
    })
    if (!chunk) return NextResponse.json({ error: "知识条目不存在" }, { status: 404 })
    return NextResponse.json(chunk)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "更新失败" }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await auditAdminAction(request, "ai.knowledge.delete", id)
    const ok = deleteKnowledgeChunk(id)
    if (!ok) return NextResponse.json({ error: "知识条目不存在" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "删除失败" }, { status: 400 })
  }
}
