import { NextResponse } from "next/server"
import { requireCustomer } from "@/lib/customer-auth"
import { getAiConversation, listAiConversationMessages } from "@/lib/ai/db-ai"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCustomer()
    const { id } = await params
    const conv = getAiConversation(id)
    if (!conv || conv.customerId !== session.customerId) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 })
    }
    return NextResponse.json({ conversation: conv, messages: listAiConversationMessages(id) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "获取失败" }, { status: e?.status || 401 })
  }
}
