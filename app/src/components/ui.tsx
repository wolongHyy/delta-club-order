import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

type IconProps = { size?: number; className?: string }

function Svg({ size = 20, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </Svg>
)

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Svg>
)

export const IconChat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12a8 8 0 0 1-8 8H4l2.2-2.6A8 8 0 1 1 21 12Z" />
    <path d="M8.5 11h7M8.5 15h4" />
  </Svg>
)

export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </Svg>
)

export const IconUserPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M16 11h6" />
  </Svg>
)

export const IconBack = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14 5-7 7 7 7" />
  </Svg>
)

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
)

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12 5 5 9-10" />
  </Svg>
)

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)

export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
  </Svg>
)

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Svg>
)

export const IconSend = (p: IconProps) => (
  <Svg {...p}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </Svg>
)

export const IconList = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path d="M3 6h.01M3 12h.01M3 18h.01" />
  </Svg>
)

export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
  </Svg>
)

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Svg>
)

export const IconTag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8l-7.2 7.2a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6Z" />
    <circle cx="7.5" cy="7.5" r="1.2" />
  </Svg>
)

export const IconPackage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z" />
    <path d="M3.3 7 12 12l8.7-5M12 22V12" />
  </Svg>
)

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'soft'
  size?: 'sm' | 'md'
  block?: boolean
}

export function Btn({ variant = 'primary', size = 'md', block, className, ...rest }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-btn font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer'
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm' }
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-bright shadow-glow',
    outline: 'border border-primary/50 text-primary hover:bg-primary/10',
    ghost: 'text-ink-dim hover:text-ink hover:bg-primary/5',
    danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
    soft: 'bg-primary/10 text-primary hover:bg-primary/20',
  }
  return <button className={cn(base, sizes[size], variants[variant], block && 'w-full', className)} {...rest} />
}

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div {...props} className={cn('rounded-card border border-line bg-surface shadow-card', className)}>{children}</div>
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-line bg-surface2 px-2 py-0.5 text-[11px] leading-4 text-ink-dim',
        className,
      )}
    >
      {children}
    </span>
  )
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  unpaid: { label: '待付款', cls: 'text-warn bg-warn/10 border-warn/30' },
  assigned: { label: '待服务', cls: 'text-primary bg-primary/10 border-primary/30' },
  completion_pending: { label: '待确认完成', cls: 'text-warn bg-warn/10 border-warn/30' },
  pending: { label: '待接单', cls: 'text-warn bg-warn/10 border-warn/30' },
  in_progress: { label: '进行中', cls: 'text-ok bg-ok/10 border-ok/30' },
  completed: { label: '已完成', cls: 'text-primary bg-primary/10 border-primary/30' },
  cancelled: { label: '已取消', cls: 'text-ink-faint bg-surface2 border-line' },
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'text-ink-dim bg-surface2 border-line' }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-4', s.cls)}>
      {s.label}
    </span>
  )
}

const FIGHTER_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '待审核', cls: 'text-warn bg-warn/10 border-warn/30' },
  approved: { label: '已通过', cls: 'text-ok bg-ok/10 border-ok/30' },
  rejected: { label: '已拒绝', cls: 'text-danger bg-danger/10 border-danger/30' },
}

export function FighterStatusBadge({ status }: { status: string }) {
  const s = FIGHTER_STATUS_MAP[status] || { label: status, cls: 'text-ink-dim bg-surface2 border-line' }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-4', s.cls)}>
      {s.label}
    </span>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-xs text-ink-dim">
        <span>{label}</span>
        {hint && <span className="text-[11px] text-ink-faint">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-btn border border-line bg-surface2 px-3 py-2 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-primary/60 focus:shadow-glow'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, 'min-h-20 resize-y', props.className)} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, 'appearance-none', props.className)} />
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-card border border-line bg-surface p-4 sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-dim hover:bg-primary/5 hover:text-ink">
            <IconClose size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ text = '暂无数据' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <IconSearch size={24} />
      </div>
      <p className="text-sm text-ink-faint">{text}</p>
    </div>
  )
}

export function Avatar({ name, src, size = 48 }: { name: string; src?: string; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full border border-primary/25 object-cover"
      />
    )
  }
  const ch = name.trim().slice(0, 1) || '?'
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className="flex shrink-0 items-center justify-center rounded-full border border-primary/25 bg-gradient-to-br from-primary/15 to-surface2 font-semibold text-primary"
    >
      {ch}
    </div>
  )
}

export function Money({ value }: { value: number }) {
  const v = Math.round(value * 100) / 100
  return <span>¥{v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}</span>
}
