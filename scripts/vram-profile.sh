#!/usr/bin/env bash
# scripts/vram-profile.sh
# Measures baseline and peak VRAM usage under load on chomp.
# Asserts peak VRAM <= 6500 MiB (leaving >= 1500 MiB headroom on RTX 4060 8GB).
set -euo pipefail

SSH_HOST="chomp"
LLAMA_PORT="8083"
LLAMA_API_KEY=${LLAMA_API_KEY:-}
VRAM_CEILING_MB=6500

echo "=== VRAM Profiler (Host: $SSH_HOST) ==="

# 1. Measure baseline VRAM
BASELINE=$(ssh "$SSH_HOST" "nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits" | tr -d '[:space:]')
TOTAL_VRAM=$(ssh "$SSH_HOST" "nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits" | tr -d '[:space:]')
echo "Total VRAM:    ${TOTAL_VRAM} MiB"
echo "Baseline VRAM: ${BASELINE} MiB"

# 2. Launch background VRAM monitor on chomp
MONITOR_FILE="/tmp/vram_profile_${RANDOM}.log"
ssh "$SSH_HOST" "
  rm -f '$MONITOR_FILE'
  while true; do
    nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits >> '$MONITOR_FILE' 2>/dev/null
    sleep 0.1
  done
" &
MONITOR_PID=$!

# Ensure monitor stops on exit
cleanup() {
  kill "$MONITOR_PID" 2>/dev/null || true
  ssh "$SSH_HOST" "rm -f '$MONITOR_FILE'" 2>/dev/null || true
}
trap cleanup EXIT

# 3. Fire concurrent inference requests
echo "Generating concurrent inference load on chomp:$LLAMA_PORT..."
python3 - << 'PYEOF'
import asyncio
import httpx

import os
API_KEY = os.environ.get("LLAMA_API_KEY", "")
URL = "http://127.0.0.1:8083/v1/chat/completions"

async def req(i: int):
    payload = {
        "messages": [
            {"role": "system", "content": "You are a customer service assistant."},
            {"role": "user", "content": f"Write a detailed 100-word explanation of air conditioner maintenance, task {i}."}
        ],
        "max_tokens": 128,
        "chat_template_kwargs": {"enable_thinking": False}
    }
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(URL, headers=headers, json=payload)
        return r.status_code

async def main():
    tasks = [req(i) for i in range(5)]
    results = await asyncio.gather(*tasks)
    print(f"Completed {len(results)} concurrent requests: {results}")

asyncio.run(main())
PYEOF

# Let monitor capture tail
sleep 1

# Kill monitor
kill "$MONITOR_PID" 2>/dev/null || true

# 4. Fetch samples and calculate peak
PEAK=$(ssh "$SSH_HOST" "cat '$MONITOR_FILE'" | sort -n | tail -1 | tr -d '[:space:]')
if [ -z "$PEAK" ]; then
  PEAK="$BASELINE"
fi

DELTA=$((PEAK - BASELINE))
HEADROOM=$((TOTAL_VRAM - PEAK))

echo "----------------------------------------"
echo "Peak VRAM:     ${PEAK} MiB"
echo "Load Delta:    +${DELTA} MiB"
echo "Headroom:      ${HEADROOM} MiB remaining"
echo "Target Ceiling:${VRAM_CEILING_MB} MiB"
echo "----------------------------------------"

if [ "$PEAK" -gt "$VRAM_CEILING_MB" ]; then
  echo "FAIL: Peak VRAM ${PEAK} MiB exceeded ceiling of ${VRAM_CEILING_MB} MiB"
  exit 1
else
  echo "PASS: Peak VRAM within safe headroom (<= ${VRAM_CEILING_MB} MiB)"
fi
