import { NextResponse } from 'next/server'
import { countUsedTrialThisWeek } from '@/lib/db'
import { readCustomerSession } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

// 体验单周限额：前端下单页用来提前禁用/提示，后端 createOrder 仍会强制校验
export async function GET() {
  const customer = await readCustomerSession()
  const customerId = customer?.customerId || ''
  const used = countUsedTrialThisWeek(customerId)
  const limit = 1
  return NextResponse.json({
    used,
    remaining: Math.max(0, limit - used),
    limit,
  })
}
