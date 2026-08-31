import { NextResponse } from "next/server"
import { auditAdminAction } from "@/lib/admin-auth"
import { resetKnowledgeFromSeed } from "@/lib/ai/db-ai"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    await auditAdminAction(request, "ai.knowledge.seed", "")
    const n = resetKnowledgeFromSeed()
    return NextResponse.json({ ok: true, seeded: n })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "重置失败" }, { status: 400 })
  }
}
