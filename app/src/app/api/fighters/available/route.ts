import { NextResponse } from 'next/server'
import { listAvailableFighters } from '@/lib/db'
export async function GET() { return NextResponse.json(listAvailableFighters()) }
