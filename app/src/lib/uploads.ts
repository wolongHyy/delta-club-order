// 结单截图等用户上传文件的保存与访问
// 遵循“新内容一律放 D 盘”的规则：默认存到 D:/delta_app_uploads，D 盘不可用时回退到项目内 uploads 目录。
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024 // 单张最大 8MB
const ALLOWED_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
}

let cachedDir = ''

export function getUploadDir(): string {
  if (cachedDir) return cachedDir
  const candidates = [process.env.UPLOAD_DIR || 'D:/delta_app_uploads', path.join(process.cwd(), 'uploads')]
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true })
      fs.accessSync(dir, fs.constants.W_OK)
      cachedDir = dir
      return dir
    } catch {
      // 尝试下一个目录
    }
  }
  cachedDir = path.join(process.cwd(), 'uploads')
  fs.mkdirSync(cachedDir, { recursive: true })
  return cachedDir
}

export function uploadUrl(filename: string): string {
  return `/api/uploads/${encodeURIComponent(filename)}`
}

export function isAllowedImage(name: string): boolean {
  return Boolean(ALLOWED_EXT[path.extname(name || '').toLowerCase()])
}

export function contentTypeFor(filename: string): string {
  return ALLOWED_EXT[path.extname(filename).toLowerCase()] || 'application/octet-stream'
}

// 返回保存后的相对文件名；超过大小限制或类型不允许时抛错
export function saveUploadFile(buffer: Buffer, originalName: string): string {
  if (buffer.byteLength <= 0) throw new Error('上传文件为空')
  if (buffer.byteLength > MAX_UPLOAD_BYTES) throw new Error('图片不能超过 8MB')
  const ext = path.extname(originalName || '').toLowerCase()
  if (!isAllowedImage(originalName)) throw new Error('只支持 jpg/png/webp/gif 图片格式')
  const dir = getUploadDir()
  const filename = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}${ext}`
  fs.writeFileSync(path.join(dir, filename), buffer)
  return filename
}
