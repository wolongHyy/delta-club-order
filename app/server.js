const path = require('path')
const fs = require('fs')

const dir = path.join(__dirname)

process.env.NODE_ENV = 'production'
process.chdir(__dirname)

// 便携版补充加载同目录 .env（standalone 产物不会自动读 .env）
// 规则：只补当前进程里还没有的环境变量，绝不覆盖系统已设置的值
const envFile = path.join(__dirname, '.env')
if (fs.existsSync(envFile)) {
  for (const rawLine of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

const currentPort = parseInt(process.env.PORT, 10) || 3000
const hostname = process.env.HOSTNAME || '0.0.0.0'

let keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10)
const nextConfig = {"distDir":"./.next","cacheComponents":false,"htmlLimitedBots":"[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight","assetPrefix":"","output":"standalone","trailingSlash":false,"images":{"deviceSizes":[640,750,828,1080,1200,1920,2048,3840],"imageSizes":[32,48,64,96,128,256,384],"path":"/_next/image","loader":"default","loaderFile":"","domains":[],"disableStaticImages":false,"minimumCacheTTL":14400,"formats":["image/webp"],"maximumRedirects":3,"dangerouslyAllowLocalIP":false,"dangerouslyAllowSVG":false,"contentSecurityPolicy":"script-src 'none'; frame-src 'none'; sandbox;","contentDispositionType":"attachment","localPatterns":[{"pathname":"**","search":""}],"remotePatterns":[],"qualities":[75],"unoptimized":false},"reactMaxHeadersLength":6000,"cacheLife":{"default":{"stale":300,"revalidate":900,"expire":4294967294},"seconds":{"stale":30,"revalidate":1,"expire":60},"minutes":{"stale":300,"revalidate":60,"expire":3600},"hours":{"stale":300,"revalidate":3600,"expire":86400},"days":{"stale":300,"revalidate":86400,"expire":604800},"weeks":{"stale":300,"revalidate":604800,"expire":2592000},"max":{"stale":300,"revalidate":2592000,"expire":31536000}},"basePath":"","expireTime":31536000,"generateEtags":true,"poweredByHeader":true,"cacheHandlers":{},"cacheMaxMemorySize":52428800,"compress":true,"i18n":null,"httpAgentOptions":{"keepAlive":true},"pageExtensions":["tsx","ts","jsx","js"],"useFileSystemPublicRoutes":true,"experimental":{"ppr":false,"staleTimes":{"dynamic":0,"static":300},"dynamicOnHover":false,"inlineCss":false,"authInterrupts":false,"fetchCacheKeyPrefix":"","isrFlushToDisk":true,"optimizeCss":false,"nextScriptWorkers":false,"disableOptimizedLoading":false,"largePageDataBytes":128000,"serverComponentsHmrCache":true,"caseSensitiveRoutes":false,"validateRSCRequestHeaders":false,"useSkewCookie":false,"preloadEntriesOnStart":true,"hideLogsAfterAbort":false,"removeUncaughtErrorAndRejectionListeners":false,"imgOptConcurrency":null,"imgOptMaxInputPixels":268402689,"imgOptSequentialRead":null,"imgOptSkipMetadata":null,"imgOptTimeoutInSeconds":7,"proxyClientMaxBodySize":10485760,"trustHostHeader":false,"isExperimentalCompile":false}}

process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig)

require('next')
const { startServer } = require('next/dist/server/lib/start-server')

if (
  Number.isNaN(keepAliveTimeout) ||
  !Number.isFinite(keepAliveTimeout) ||
  keepAliveTimeout < 0
) {
  keepAliveTimeout = undefined
}

startServer({
  dir,
  isDev: false,
  config: nextConfig,
  hostname,
  port: currentPort,
  allowRetry: false,
  keepAliveTimeout,
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
