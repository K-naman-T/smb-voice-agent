#!/usr/bin/env bash
# scripts/bring_up_chomp.sh
#
# Brings chomp to a green state for the v2 voice-agent configurator.
# Run after scripts/discover_chomp.sh reports the M0.5 gate is failing.
#
# Steps (each idempotent):
#   1. Stop any existing llama-server (Qwen / Qwable / other) and free VRAM.
#   2. Install faster-whisper (pip --user).
#   3. Install Piper (pip --user) and download en_US-amy-low.onnx.
#   4. Install LiveKit server (binary).
#   5. Download Qwen3.5-9B-Chat Q4_K_M GGUF (the v2 default LLM).
#   6. Start a fresh llama-server on 127.0.0.1:8083 with the new model.
#   7. Re-pin chomp-gpu.lock and models/manifest.json in the repo.
#   8. Print summary; verify_m0_5.py must pass before M2 is unblocked.
#
# Usage:  bash scripts/bring_up_chomp.sh
#         bash scripts/bring_up_chomp.sh --skip-driver   # if driver is already good

set -euo pipefail

REPO="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SSH_HOST="chomp"
SKIP_DRIVER=0
SKIP_QWEN=0
for arg in "$@"; do
  case "$arg" in
    --skip-driver) SKIP_DRIVER=1;;
    --skip-qwen)   SKIP_QWEN=1;;
    -h|--help)
      grep '^# ' "$0" | sed 's/^# \?//'
      exit 0
      ;;
  esac
done

ssh_chomp() {
  ssh -o ConnectTimeout=10 "$SSH_HOST" "$@"
}

echo "==[1/8] Stop existing llama-server on chomp=="
ssh_chomp '
  # Surgical: only kill the actual llama-server binary
  pids=$(pgrep -x llama-server 2>/dev/null || true)
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null || true
    sleep 2
    kill -9 $pids 2>/dev/null || true
  fi
  pgrep -x llama-server >/dev/null && echo "llama-server still running" || echo "no llama-server running"
'

if [ "$SKIP_DRIVER" -eq 0 ]; then
  echo "==[2/8] Verify NVIDIA driver + container toolkit (read-only)=="
  ssh_chomp '
    nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>&1 || { echo "nvidia-smi failed"; exit 1; }
    nvidia-ctk --version 2>&1 | head -1 || { echo "nvidia-ctk missing"; exit 1; }
    ls /dev/nvidia0 2>&1 || { echo "/dev/nvidia0 missing"; exit 1; }
  '
else
  echo "==[2/8] Skipped (--skip-driver)=="
fi

echo "==[3/8] Install faster-whisper (pip --user)=="
ssh_chomp '
  pip install --user --quiet faster-whisper 2>&1 | tail -5 || true
  pip show faster_whisper 2>&1 | head -3
'

echo "==[4/8] Install Piper + download en_US-amy-low.onnx=="
ssh_chomp '
  pip install --user --quiet piper-tts 2>&1 | tail -5 || true
  # Piper voice models live in ~/.local/share/piper/voices/ after first use, or
  # we can fetch them directly from the rhasspy/piper voices GitHub release.
  mkdir -p /home/knamant/models/piper
  cd /home/knamant/models/piper
  if [ ! -f en_US-amy-low.onnx ]; then
    curl -fL -o en_US-amy-low.onnx \
      "https://github.com/rhasspy/piper/releases/download/v1.2.0/en/en_US-amy/low.onnx" \
      2>&1 | tail -3
  fi
  if [ ! -f en_US-amy-low.onnx.json ]; then
    curl -fL -o en_US-amy-low.onnx.json \
      "https://github.com/rhasspy/piper/releases/download/v1.2.0/en/en_US-amy/low.onnx.json" \
      2>&1 | tail -3
  fi
  ls -la en_US-amy-low.onnx en_US-amy-low.onnx.json 2>&1
'

echo "==[5/8] Install LiveKit server=="
ssh_chomp '
  if ! command -v livekit-server >/dev/null 2>&1; then
    cd /tmp
    # Try to install via the official install script; fall back to a manual
    # download from the GitHub release.
    arch=$(uname -m)
    if [ "$arch" = "x86_64" ]; then
      curl -fL -o livekit.tar.gz \
        "https://github.com/livekit/livekit/releases/download/v1.8.0/livekit_1.8.0_linux_amd64.tar.gz" \
        2>&1 | tail -3
      tar -xzf livekit.tar.gz
      sudo install -m 0755 livekit-server /usr/local/bin/livekit-server || \
        install -m 0755 livekit-server /home/knamant/.local/bin/livekit-server
      which livekit-server || ls -la /usr/local/bin/livekit-server /home/knamant/.local/bin/livekit-server 2>&1
    else
      echo "unsupported arch: $arch"
      exit 1
    fi
  else
    livekit-server --version 2>&1 || true
  fi
'

if [ "$SKIP_QWEN" -eq 0 ]; then
  echo "==[6/8] Download Qwen3.5-9B-Chat Q4_K_M GGUF=="
  ssh_chomp '
    mkdir -p /home/knamant/models/qwen3.5-9b
    cd /home/knamant/models/qwen3.5-9b
    URL="https://huggingface.co/lmstudio-community/Qwen3.5-9B-GGUF/resolve/main/Qwen3.5-9B-Q4_K_M.gguf"
    if [ ! -f Qwen3.5-9B-Q4_K_M.gguf ]; then
      echo "downloading Qwen3.5-9B-Q4_K_M.gguf from $URL"
      curl -fL --retry 3 -o Qwen3.5-9B-Q4_K_M.gguf "$URL" 2>&1 | tail -3
    fi
    sha256sum Qwen3.5-9B-Q4_K_M.gguf
    stat -c "size=%s" Qwen3.5-9B-Q4_K_M.gguf
  '
else
  echo "==[6/8] Skipped (--skip-qwen)=="
fi

echo "==[7/8] Start fresh llama-server on 127.0.0.1:8083=="
ssh_chomp "
  cd /home/knamant/models/qwen3.5-9b
  if [ ! -f Qwen3.5-9B-Q4_K_M.gguf ]; then
    echo 'Qwen3.5-9B model not on disk; refusing to start llama-server'
    exit 1
  fi
  mkdir -p /home/knamant/logs
  nohup /opt/llama.cpp/build/bin/llama-server \\
    -m /home/knamant/models/qwen3.5-9b/Qwen3.5-9B-Q4_K_M.gguf \\
    --host 127.0.0.1 --port 8083 \\
    -ngl 99 -c 4096 --parallel 1 --jinja \\
    --api-key \"\${LLAMA_API_KEY:-change-me-high-entropy}\" \\
    --metrics \\
    > /home/knamant/logs/llama-server.log 2>&1 &
  sleep 3
  pgrep -af llama-server 2>&1
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    out=\$(curl -sS -m 2 http://127.0.0.1:8083/v1/models 2>&1)
    if echo \"\$out\" | grep -q 'object'; then
      echo 'llama-server READY on 8083'
      break
    fi
    sleep 2
  done
  curl -sS http://127.0.0.1:8083/v1/models 2>&1 | head -2
"

echo "==[8/8] Refresh repo manifest + chomp-gpu.lock with real values=="
python3 "$REPO/scripts/_refresh_repo_artifacts.py" || true

echo
echo "Re-run scripts/verify_m0_5.py after the script completes."
