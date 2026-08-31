import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { getUploadDir, contentTypeFor } from '@/lib/uploads'

export const dynamic = 'force-dynamic'

// 结单截图等上传文件的访问接口：/api/uploads/<文件名>
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path || []
  if (!segments.length) return NextResponse.json({ error: '缺少文件名' }, { status: 400 })
  const filename = decodeURIComponent(segments.join('/'))
  if (!/^[A-Za-z0-9._-]+$/.test(filename) || filename.includes('..')) {
    return NextResponse.json({ error: '非法文件名' }, { status: 400 })
  }
  const filePath = path.join(getUploadDir(), filename)
  try {
    const buffer = fs.readFileSync(filePath)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentTypeFor(filename),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 })
  }
}
