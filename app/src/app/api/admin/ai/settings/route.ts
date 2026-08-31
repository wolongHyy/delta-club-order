import { NextResponse } from "next/server"
import { requireAdmin, auditAdminAction } from "@/lib/admin-auth"
import { aiSettings, maskApiKey, saveAiSettings } from "@/lib/ai/chat"

export const dynamic = "force-dynamic"

export async function GET() {
  await requireAdmin()
  const s = aiSettings()
  return NextResponse.json({ ...s, apiKey: s.apiKey ? maskApiKey(s.apiKey) : "" })
}

export async function PUT(request: Request) {
  try {
    await auditAdminAction(request, "ai.settings.update", "")
    const body = await request.json()
    const next = saveAiSettings(body)
    const masked = { ...next, apiKey: next.apiKey ? maskApiKey(next.apiKey) : "" }
    return NextResponse.json(masked)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "保存失败" }, { status: 400 })
  }
}
