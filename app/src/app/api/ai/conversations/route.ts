import { NextResponse } from "next/server"
import { requireCustomer } from "@/lib/customer-auth"
import { createAiConversation, listMyAiConversations } from "@/lib/ai/db-ai"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await requireCustomer()
    return NextResponse.json(listMyAiConversations(session.customerId))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "请先刷新页面获取顾客身份" }, { status: e?.status || 401 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireCustomer()
    const body = await request.json().catch(() => ({}))
    const conv = createAiConversation({
      customerId: session.customerId,
      customerName: session.nickname || "",
      title: String(body.title || "").trim() || "智能客服咨询",
    })
    return NextResponse.json(conv, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "创建会话失败" }, { status: e?.status || 401 })
  }
}
