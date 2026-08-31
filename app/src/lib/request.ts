export function requestIsSecure(request: Request): boolean {
  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol = forwarded || new URL(request.url).protocol.replace(':', '')
  return protocol === 'https'
}
