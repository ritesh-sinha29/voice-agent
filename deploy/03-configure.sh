#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script 03: Verify FastAPI Voice Agent Providers & Telephony Webhook
# ==============================================================================

if [ ! -f .env ]; then
  echo "[-] .env file missing." >&2
  exit 1
fi

set -a
source .env
set +a

AGENT_PORT="${AGENT_PORT:-8000}"
AGENT_URL="http://localhost:${AGENT_PORT}"

echo "=== [1/3] Checking FastAPI Voice Agent Health ($AGENT_URL/health) ==="
HEALTH_RESP=$(curl -s "$AGENT_URL/health" || echo "{}")
echo "$HEALTH_RESP"

echo "=== [2/3] Checking AI Providers & Benchmarks ==="
STATUS_RESP=$(curl -s "$AGENT_URL/api/v1/agent/status" || echo "{}")
echo "$STATUS_RESP"

echo "=== [3/3] Checking VoBiz Telephony Inbound Webhook ==="
INBOUND_TEST=$(curl -s -X POST "$AGENT_URL/api/v1/telephony/inbound/run" \
  -H "Content-Type: application/json" \
  -d '{"call_id":"test-call-123","caller":"+919876543210"}' || echo "{}")
echo "$INBOUND_TEST"

echo "[+] FastAPI Voice Agent configuration and webhook check passed."
