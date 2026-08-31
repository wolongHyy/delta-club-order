import { NextResponse } from "next/server"
import { requireCustomer } from "@/lib/customer-auth"
import { streamAiAnswer } from "@/lib/ai/chat"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCustomer()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const stream = await streamAiAnswer({
      conversationId: id,
      customerId: session.customerId,
      text: String(body.text || ""),
    })
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "发送失败" }, { status: e?.status || 400 })
  }
}
