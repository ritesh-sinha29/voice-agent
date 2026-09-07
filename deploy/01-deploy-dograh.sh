#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script 01: Deploy Dograh Voice Orchestrator
# ==============================================================================

echo "=== [1/5] Checking environment prerequisites ==="
if ! command -v docker &>/dev/null; then
  echo "[-] Docker is required but not installed." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "[-] .env file not found. Copying from .env.example..."
  cp .env.example .env
fi

# Load non-secret config
set -a
source .env
set +a

echo "=== [2/5] Creating Dograh docker network and volumes ==="
docker network create dograh-network 2>/dev/null || true
docker volume create dograh_pgdata 2>/dev/null || true
docker volume create dograh_redisdata 2>/dev/null || true

echo "=== [3/5] Starting Dograh core services (PostgreSQL, Redis, API, Worker) ==="
docker compose up -d dograh-postgres dograh-redis dograh-api dograh-worker

echo "=== [4/5] Waiting for Dograh API health check ==="
RETRIES=30
until curl -s http://localhost:3000/api/v1/health | grep -q "ok" || [ $RETRIES -eq 0 ]; do
  echo "Waiting for Dograh API on port 3000... ($RETRIES left)"
  sleep 2
  RETRIES=$((RETRIES-1))
done

if [ $RETRIES -eq 0 ]; then
  echo "[!] Warning: Dograh API did not respond to /api/v1/health in time. Checking docker logs..."
  docker compose logs --tail=20 dograh-api || true
else
  echo "[+] Dograh API is healthy."
fi

echo "=== [5/5] Dograh Orchestrator Ready ==="
echo "Local Dashboard: http://localhost:3000"
