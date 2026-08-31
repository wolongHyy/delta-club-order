import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { getAiConversation, listAiConversationMessages } from "@/lib/ai/db-ai"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const conv = getAiConversation(id)
  if (!conv) return NextResponse.json({ error: "会话不存在" }, { status: 404 })
  return NextResponse.json({ conversation: conv, messages: listAiConversationMessages(id) })
}
