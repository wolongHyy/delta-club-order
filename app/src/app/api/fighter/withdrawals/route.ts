import { NextResponse } from 'next/server'
import { currentFighter } from '@/lib/fighter-auth'
import { createWithdrawal, listWithdrawals } from '@/lib/db'
export async function GET() { const f = await currentFighter(); return f ? NextResponse.json(listWithdrawals(f.id)) : NextResponse.json({ error: '请先登录打手端' }, { status: 401 }) }
export async function POST(request: Request) { const f = await currentFighter(); if (!f) return NextResponse.json({ error: '请先登录打手端' }, { status: 401 }); try { const b = await request.json(); return NextResponse.json(createWithdrawal(f.id, Number(b.amount), String(b.accountInfo || '').trim()), { status: 201 }) } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }) } }
