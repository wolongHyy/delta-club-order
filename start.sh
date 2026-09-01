#!/usr/bin/env bash
# Delta Game Service Platform - cross-platform launcher for Linux & macOS.
#
# First-time setup (one of):
#   * Use system Node.js 22+:
#       macOS:    brew install node@22
#       Debian:   install nvm     ->  https://github.com/nvm-sh/nvm
#       then run: cd app && npm install && npm run build
#   * Or grab a portable Node.js v22 from https://nodejs.org/dist/ and place it
#     in ./node/bin/node so start.sh picks it up automatically.
#
# After setup:  ./start.sh   (or double-click start.command on macOS)
# Default URL:  http://localhost:3000   (admin: /admin)

set -e
cd "$(dirname "$0")"

# Pick a Node binary: portable ./node first, then system.
if [ -x "node/node.exe" ] && command -v wine >/dev/null 2>&1; then
  # Not common on Linux/macOS - just skip.
  :
fi
if [ -x "node/bin/node" ]; then
  NODE_BIN="node/bin/node"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  echo "[error] Node.js not found."
  echo "        macOS:  brew install node@22"
  echo "        Linux:  install Node.js 22+ (https://nodejs.org)"
  echo "        Or unpack a portable Node into ./node/bin/node"
  exit 1
fi

cd app

if [ ! -d "node_modules" ]; then
  echo "[1/3] Installing dependencies (first run, ~1 minute)..."
  "$NODE_BIN" --version
  # npm ships with Node; use the same binary to invoke npm.
  "$NODE_BIN" "$(dirname "$NODE_BIN")/npm" install --no-audit --no-fund
fi

if [ ! -f ".next/BUILD_ID" ]; then
  echo "[2/3] Building production bundle..."
  "$NODE_BIN" --experimental-sqlite node_modules/next/dist/bin/next build --webpack
fi

echo "[3/3] Starting server on http://localhost:3000 ..."
exec "$NODE_BIN" --experimental-sqlite server.js
