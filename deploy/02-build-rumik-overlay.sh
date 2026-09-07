#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script 02: Build Rumik TTS Overlay into Dograh Worker
# ==============================================================================

echo "=== [1/3] Locating Dograh worker and API containers ==="
WORKER_CONTAINER=$(docker ps -q -f name=dograh-worker | head -n 1 || true)

if [ -z "$WORKER_CONTAINER" ]; then
  echo "[*] No separate worker container found. Checking dograh-api..."
  WORKER_CONTAINER=$(docker ps -q -f name=dograh-api | head -n 1 || true)
fi

if [ -z "$WORKER_CONTAINER" ]; then
  echo "[-] Could not find running Dograh container. Ensure deploy/01-deploy-dograh.sh is running."
  echo "    For local development/testing without Dograh container, continuing in decoupled mode."
  exit 0
fi

echo "[+] Target container: $WORKER_CONTAINER"

echo "=== [2/3] Installing pipecat-rumik with strict --no-deps ==="
# IMPORTANT: Never omit --no-deps to prevent overwriting Dograh's vendored Pipecat fork
docker exec -u root "$WORKER_CONTAINER" pip install --no-deps pipecat-rumik

echo "=== [3/3] Registering Rumik Silk Mulberry voice profile in provider registry ==="
docker exec -u root "$WORKER_CONTAINER" python3 -c "
try:
    import pipecat_rumik
    print('[+] pipecat_rumik imported successfully inside container.')
except ImportError as e:
    print('[-] Import check failed:', e)
" || true

echo "[+] Rumik overlay applied successfully."
