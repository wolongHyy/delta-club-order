import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { aiSettings, testLlmConnection } from "@/lib/ai/chat"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json().catch(() => ({}))
    const current = aiSettings()
    const settings = {
      ...current,
      baseUrl: String(body.baseUrl || current.baseUrl),
      apiKey: String(body.apiKey || current.apiKey),
      model: String(body.model || current.model),
      temperature: Number(body.temperature) || current.temperature,
    }
    const result = await testLlmConnection(settings)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: "测试失败：" + (e?.message || "") }, { status: 400 })
  }
}
