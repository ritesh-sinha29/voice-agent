#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script 06: Deploy Replora Voice Studio UI (Node 20 Container)
# ==============================================================================

echo "=== [1/3] Preparing dashboard container ==="
docker rm -f rumik-voice-studio 2>/dev/null || true

if [ ! -f .env ]; then
  echo "[-] .env file not found. Copying from .env.example..."
  cp .env.example .env
fi

echo "=== [2/3] Launching bundled Studio UI in Node 20 container ==="
# Launch bundled Studio UI so Node.js is not strictly required on the host system
docker run -d --name rumik-voice-studio --restart unless-stopped \
  -p 127.0.0.1:8787:8787 --env-file .env \
  -v "$PWD/dashboard:/app" -w /app node:20-alpine sh -c "npx tsx server.ts"

echo "=== [3/3] Checking Studio UI health ==="
RETRIES=15
until curl -s http://localhost:8787/api/health | grep -q "ok" || [ $RETRIES -eq 0 ]; do
  echo "Waiting for Voice Studio on port 8787... ($RETRIES left)"
  sleep 2
  RETRIES=$((RETRIES-1))
done

echo "[+] Voice Studio UI running:"
echo "    - Studio/marketing: http://localhost:8787"
echo "    - Studio console:   http://localhost:8787/app.html"
