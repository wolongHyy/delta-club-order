import { IconChat, IconGrid, IconHome, IconUser, cn } from '@/components/ui'

export type TabKey = 'home' | 'category' | 'messages' | 'profile'

const TABS: { key: TabKey; label: string; Icon: typeof IconHome }[] = [
  { key: 'home', label: '首页', Icon: IconHome },
  { key: 'category', label: '分类', Icon: IconGrid },
  { key: 'messages', label: '消息', Icon: IconChat },
  { key: 'profile', label: '我的', Icon: IconUser },
]

export default function TabBar({ active, onTab }: { active: TabKey; onTab: (k: TabKey) => void }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ key, label, Icon }) => {
          const on = active === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTab(key)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors',
                on ? 'text-primary' : 'text-ink-faint hover:text-ink-dim',
              )}
            >
              <Icon size={22} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
