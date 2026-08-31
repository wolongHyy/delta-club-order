import { NextResponse } from 'next/server'
import { currentFighter } from '@/lib/fighter-auth'
import { requestOrderCompletion } from '@/lib/db'
import { saveUploadFile, uploadUrl } from '@/lib/uploads'

export const dynamic = 'force-dynamic'

// 打手申请结单：必须带至少 1 张截图证明（multipart/form-data：note + files[]）
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const fighter = await currentFighter()
  if (!fighter) return NextResponse.json({ error: '请先登录打手端' }, { status: 401 })
  try {
    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return NextResponse.json({ error: '请通过结单弹窗上传截图（multipart）后再提交' }, { status: 400 })
    }
    const note = String(form.get('note') || '').trim()
    const files = form.getAll('files') as File[]
    const proof: string[] = []
    for (const file of files) {
      if (!(file instanceof File)) continue
      const buffer = Buffer.from(await file.arrayBuffer())
      const filename = saveUploadFile(buffer, file.name)
      proof.push(uploadUrl(filename))
    }
    if (!proof.length) return NextResponse.json({ error: '申请结单必须至少上传 1 张截图证明' }, { status: 400 })
    return NextResponse.json(requestOrderCompletion((await params).id, fighter.id, { note, proof }))
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '提交完工申请失败' }, { status: 409 })
  }
}
