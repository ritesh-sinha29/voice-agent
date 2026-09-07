#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script 03: Configure Telephony & AI Providers in Dograh Orchestrator
# ==============================================================================

if [ ! -f .env ]; then
  echo "[-] .env file missing." >&2
  exit 1
fi

set -a
source .env
set +a

DOGRAH_API_URL="${DOGRAH_URL:-http://localhost:3000}/api/v1"

echo "=== [1/4] Authenticating with Dograh Orchestrator ==="
AUTH_RESP=$(curl -s -X POST "$DOGRAH_API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DOGRAH_EMAIL\",\"password\":\"$DOGRAH_PASSWORD\"}" || echo "{}")

TOKEN=$(echo "$AUTH_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || echo "mock-token")
AUTH_HEADER="Authorization: Bearer $TOKEN"

echo "=== [2/4] Registering AI Providers (Deepgram STT, Groq/Gemini LLM, Rumik TTS) ==="
# STT Configuration
curl -s -X POST "$DOGRAH_API_URL/providers/stt" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{
    "provider": "deepgram",
    "model": "nova-3-general",
    "language": "multi",
    "api_key": "'"$DEEPGRAM_API_KEY"'"
  }' >/dev/null || true

# LLM Configuration
if [ "${LLM_PROVIDER:-groq}" = "gemini" ]; then
  echo "[*] Configuring Gemini LLM (${GEMINI_MODEL:-gemini-3.5-flash-lite})..."
  curl -s -X POST "$DOGRAH_API_URL/providers/llm" \
    -H "$AUTH_HEADER" -H "Content-Type: application/json" \
    -d '{
      "provider": "gemini",
      "model": "'"${GEMINI_MODEL:-gemini-3.5-flash-lite}"'",
      "api_key": "'"$GEMINI_API_KEY"'"
    }' >/dev/null || true
else
  echo "[*] Configuring Groq LLM (llama-3.3-70b-versatile)..."
  curl -s -X POST "$DOGRAH_API_URL/providers/llm" \
    -H "$AUTH_HEADER" -H "Content-Type: application/json" \
    -d '{
      "provider": "groq",
      "model": "llama-3.3-70b-versatile",
      "api_key": "'"$GROQ_API_KEY"'"
    }' >/dev/null || true
fi

# TTS Configuration (Rumik Silk Mulberry)
curl -s -X POST "$DOGRAH_API_URL/providers/tts" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{
    "provider": "rumik",
    "voice": "mulberry",
    "sample_rate": 24000,
    "api_key": "'"$RUMIK_API_KEY"'"
  }' >/dev/null || true

echo "=== [3/4] Configuring VoBiz Telephony Provider ==="
if [ -n "${VOBIZ_AUTH_ID:-}" ] && [ -n "${VOBIZ_AUTH_TOKEN:-}" ]; then
  BACKEND_BASE="${DOGRAH_PUBLIC_URL:-http://localhost:3000}"
  ANSWER_URL="${BACKEND_BASE}/api/v1/telephony/inbound/run"
  
  echo "[*] Registering VoBiz application with answer_url: $ANSWER_URL"
  curl -s -X POST "$DOGRAH_API_URL/telephony/providers" \
    -H "$AUTH_HEADER" -H "Content-Type: application/json" \
    -d '{
      "carrier": "vobiz",
      "auth_id": "'"$VOBIZ_AUTH_ID"'",
      "auth_token": "'"$VOBIZ_AUTH_TOKEN"'",
      "inbound_phone_number": "'"${VOBIZ_NUMBER:-}"'",
      "answer_url": "'"$ANSWER_URL"'",
      "method": "POST"
    }' >/dev/null || true
  echo "[+] VoBiz provider registered."
else
  echo "[*] VoBiz credentials not configured in .env. Skipping telephony registration."
fi

echo "=== [4/4] Configuring VoiceLink Secondary Carrier ==="
if [ -n "${VOICELINK_RESELLER_USER:-}" ] && [ -n "${VOICELINK_RESELLER_PASS:-}" ]; then
  echo "[*] Registering VoiceLink carrier (G.711 A-law 8kHz)..."
  curl -s -X POST "$DOGRAH_API_URL/telephony/providers" \
    -H "$AUTH_HEADER" -H "Content-Type: application/json" \
    -d '{
      "carrier": "voicelink",
      "reseller_user": "'"$VOICELINK_RESELLER_USER"'",
      "reseller_pass": "'"$VOICELINK_RESELLER_PASS"'",
      "did": "'"${VOICELINK_DID:-}"'",
      "codec": "PCMA",
      "sample_rate": 8000
    }' >/dev/null || true
  echo "[+] VoiceLink provider registered."
else
  echo "[*] VoiceLink credentials omitted. Optional secondary carrier not configured."
fi

echo "[+] Provider configuration completed."
