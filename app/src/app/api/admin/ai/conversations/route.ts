import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { listAllAiConversations } from "@/lib/ai/db-ai"

export const dynamic = "force-dynamic"

export async function GET() {
  await requireAdmin()
  return NextResponse.json(listAllAiConversations())
}
