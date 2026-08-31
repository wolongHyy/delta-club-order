'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  IconChart,
  IconChat,
  IconHome,
  IconList,
  IconPackage,
  IconSend,
  IconSettings,
  IconTag,
  IconUserPlus,
  cn,
} from '@/components/ui'

const NAV = [
  { href: '/admin', label: '仪表盘', Icon: IconHome },
  { href: '/admin/stats', label: '数据分析', Icon: IconChart },
  { href: '/admin/withdrawals', label: '提现审核', Icon: IconChat },
  { href: '/admin/orders', label: '订单管理', Icon: IconList },
  { href: '/admin/companions', label: '陪玩管理', Icon: IconPackage },
  { href: '/admin/fighter-applications', label: '打手申请', Icon: IconUserPlus },
  { href: '/admin/service-types', label: '服务类型', Icon: IconTag },
  { href: '/admin/ai', label: '智能客服', Icon: IconChat },
  { href: '/admin/messages', label: '消息管理', Icon: IconSend },
  { href: '/admin/settings', label: '设置', Icon: IconSettings },
]

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.replace('/admin/login')
  }
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface/50 p-4 md:flex">
        <div className="mb-6 px-2">
          <p className="text-base font-bold text-ink">三角洲俱乐部</p>
          <p className="mt-0.5 text-xs text-primary">管理后台 · DELTA CLUB</p>
        </div>
        <nav className="space-y-1">
          {NAV.map(({ href, label, Icon }) => {
            const on = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-btn px-3 py-2.5 text-sm transition-colors',
                  on ? 'bg-primary/12 text-primary shadow-glow' : 'text-ink-dim hover:bg-primary/5 hover:text-ink',
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto px-2 pt-6">
          <p className="text-[11px] text-ink-faint">管理员</p>
          <p className="text-[11px] text-ink-faint">已启用登录与接口保护</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="flex items-center justify-between border-b border-line bg-surface/40 px-4 py-3 md:px-6">
          <p className="text-sm font-semibold text-ink md:hidden">三角洲俱乐部管理后台</p>
          <p className="hidden text-sm text-ink-dim md:block">Delta Club Admin Console</p>
          <button type="button" onClick={logout} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-dim hover:text-ink">退出登录</button>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-line bg-surface/95 backdrop-blur md:hidden">
        {NAV.map(({ href, label, Icon }) => {
          const on = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-w-16 flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[10px]',
                on ? 'text-primary' : 'text-ink-faint',
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
