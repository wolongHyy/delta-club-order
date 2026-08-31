import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        surface2: 'rgb(var(--surface2-rgb) / <alpha-value>)',
        line: 'rgb(var(--line-rgb) / 0.14)',
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          bright: 'rgb(var(--primary-bright-rgb) / <alpha-value>)',
          deep: 'rgb(var(--primary-deep-rgb) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          dim: 'rgb(var(--ink-dim-rgb) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint-rgb) / <alpha-value>)',
        },
        ok: 'rgb(var(--ok-rgb) / <alpha-value>)',
        warn: 'rgb(var(--warn-rgb) / <alpha-value>)',
        danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
      },
      boxShadow: {
        glow: '0 0 12px rgba(59, 130, 246, 0.35)',
        card: '0 2px 14px rgba(37, 99, 235, 0.10)',
      },
    },
  },
  plugins: [],
}

export default config
