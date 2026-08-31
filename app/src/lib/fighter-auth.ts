import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getFighterAccount, getFighterByUsername } from './db'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hex] = stored.split(':')
  if (!salt || !hex) return false
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(hex, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function currentFighter() {
  const cookieStore = await cookies()
  return readSession(cookieStore.get('fighter_session')?.value)
}

export function sessionId(id: string) {
  return createHash('sha256').update(`${id}:${process.env.FIGHTER_SESSION_SECRET || 'delta-fighter-local'}`).digest('hex') + '.' + id
}

export function readSession(value: string | undefined) {
  if (!value) return null
  const [signature, id] = value.split('.')
  if (!signature || !id) return null
  const expected = createHash('sha256').update(`${id}:${process.env.FIGHTER_SESSION_SECRET || 'delta-fighter-local'}`).digest('hex')
  return signature === expected ? getFighterAccount(id) : null
}

export { getFighterByUsername }
