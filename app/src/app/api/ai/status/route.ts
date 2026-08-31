import { NextResponse } from "next/server"
import { aiSettings } from "@/lib/ai/chat"
import { getSettings } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const s = aiSettings()
  const shop = getSettings()
  return NextResponse.json({
    enabled: s.enabled,
    configured: Boolean(s.baseUrl && s.apiKey && s.model),
    assistantName: s.assistantName,
    welcomeMessage: s.welcomeMessage,
    quickQuestions: s.quickQuestions,
    customerServiceWechat: shop.customerServiceWechat || "",
    shopName: shop.shopName || "三角洲俱乐部",
  })
}
