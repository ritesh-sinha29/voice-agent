#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script 01: Deploy Replora FastAPI Voice Agent
# ==============================================================================

echo "=== [1/4] Checking environment prerequisites ==="
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "[-] .env file not found. Copying from .env.example..."
  cp .env.example .env
fi

# Load non-secret config
set -a
source .env
set +a

AGENT_PORT="${AGENT_PORT:-8000}"

echo "=== [2/4] Setting up Python dependencies for FastAPI Agent ==="
if command -v uv &>/dev/null; then
  echo "[+] Using uv to install requirements into virtualenv..."
  uv venv .venv 2>/dev/null || true
  uv pip install -r agent/requirements.txt
elif command -v python3 &>/dev/null; then
  python3 -m pip install -r agent/requirements.txt
elif command -v python &>/dev/null; then
  python -m pip install -r agent/requirements.txt
else
  echo "[-] Python 3 is required to run the FastAPI Voice Agent." >&2
  exit 1
fi

echo "=== [3/4] Starting FastAPI Voice Agent on port $AGENT_PORT ==="
if command -v uv &>/dev/null; then
  AGENT_PORT="$AGENT_PORT" uv run python agent/main.py &
  AGENT_PID=$!
else
  AGENT_PORT="$AGENT_PORT" python agent/main.py &
  AGENT_PID=$!
fi

echo "FastAPI Agent PID: $AGENT_PID"

echo "=== [4/4] Verifying FastAPI Voice Agent health ==="
RETRIES=20
until curl -s "http://localhost:$AGENT_PORT/health" | grep -q "ok" || [ $RETRIES -eq 0 ]; do
  echo "Waiting for FastAPI agent on port $AGENT_PORT... ($RETRIES retries left)"
  sleep 1
  RETRIES=$((RETRIES-1))
done

if [ $RETRIES -eq 0 ]; then
  echo "[!] Warning: FastAPI Agent did not respond in time on port $AGENT_PORT."
else
  echo "[+] FastAPI Voice Agent is healthy and ready!"
  echo "    API Health:    http://localhost:$AGENT_PORT/health"
  echo "    API Docs:      http://localhost:$AGENT_PORT/docs"
  echo "    WebSocket:     ws://localhost:$AGENT_PORT/ws/talk"
fi
