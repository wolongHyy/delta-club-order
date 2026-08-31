import { NextResponse } from 'next/server'
import { currentFighter } from '@/lib/fighter-auth'
import { fighterStartOrder } from '@/lib/db'
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const fighter = await currentFighter(); if (!fighter) return NextResponse.json({ error: '请先登录打手端' }, { status: 401 })
  try { return NextResponse.json(fighterStartOrder((await params).id, fighter.id)) } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 409 }) }
}
