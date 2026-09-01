#!/usr/bin/env bash
# Delta Game Service Platform - macOS double-clickable launcher.
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
chmod +x start.sh 2>/dev/null || true
bash ./start.sh
echo ""
echo "Delta Game Service has stopped. You can close this window now."
read -rp "Press Enter to close..."
