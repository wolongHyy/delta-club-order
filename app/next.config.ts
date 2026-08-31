import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
  webpack: (config) => {
    config.externals = [
      ...config.externals,
      { 'node:path': 'commonjs node:path' },
      { 'node:sqlite': 'commonjs node:sqlite' },
      { 'node:crypto': 'commonjs node:crypto' },
    ]
    return config
  },
}

export default nextConfig
