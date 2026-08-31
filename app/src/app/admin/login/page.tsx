'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/client'
import { Btn, Card, Field, TextInput } from '@/components/ui'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api('/api/admin/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      const next = new URLSearchParams(window.location.search).get('next') || '/admin'
      router.replace(next)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-lg font-bold text-ink">管理后台登录</h1>
          <p className="mt-1 text-xs text-ink-faint">Delta Game Service Platform Admin Console</p>
        </div>
        <form className="space-y-3" onSubmit={submit}>
          <Field label="账号"><TextInput value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></Field>
          <Field label="密码"><TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Btn type="submit" disabled={loading} className="w-full">{loading ? '登录中...' : '登录'}</Btn>
        </form>
      </Card>
    </div>
  )
}
