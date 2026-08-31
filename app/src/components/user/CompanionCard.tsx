import type { Companion } from '@/lib/types'
import { Avatar, Card, Money, Tag, cn } from '@/components/ui'

export default function CompanionCard({
  companion,
  onClick,
}: {
  companion: Companion
  onClick: () => void
}) {
  const off = companion.status !== 1
  return (
    <Card
      className={cn('cursor-pointer overflow-hidden transition-colors hover:border-primary/40', off && 'opacity-55')}
    >
      <button type="button" onClick={onClick} className="flex w-full items-start gap-3 p-3 text-left">
        <Avatar name={companion.name} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink">{companion.name}</span>
            {companion.gender && (
              <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">{companion.gender}</span>
            )}
            {companion.rank && <span className="shrink-0 text-[11px] text-ink-faint">{companion.rank}</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {companion.tags.slice(0, 3).map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-base font-bold text-primary-bright">
              <Money value={companion.price} />
              <span className="ml-0.5 text-[11px] font-normal text-ink-faint">/{companion.unit}</span>
            </span>
            <span className="text-[11px] text-ink-faint">销量 {companion.sales}</span>
          </div>
        </div>
      </button>
    </Card>
  )
}
