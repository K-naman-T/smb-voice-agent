#!/usr/bin/env bash
# scripts/_discover_remote.sh
# Runs on chomp via ssh; inventory only. No remote side-effects.
set -e
echo "==HOST=="; uname -a
echo "==UPTIME=="; uptime -p 2>/dev/null || true

echo "==NVIDIA-SMI=="
if command -v nvidia-smi >/dev/null 2>&1; then
  nvidia-smi --query-gpu=driver_version,Name,memory.total,memory.free,memory.used,temperature.gpu,utilization.gpu --format=csv,noheader 2>&1 || echo "nvidia-smi query failed"
  echo "---"
  nvidia-smi 2>&1 | head -10 || true
else
  echo "nvidia-smi not installed"
fi

echo "==KERNEL-MODULES=="
lsmod 2>/dev/null | grep -iE "^nvidia" || echo "no nvidia modules loaded"

echo "==LSPCI=="
lspci 2>/dev/null | grep -iE "vga|3d|nvidia" || echo "no VGA/NVIDIA on PCI"

echo "==CUDA-DEVICE-FILES=="
ls /dev/nvidia* 2>&1 | head

echo "==CONTAINER-TOOLKIT=="
nvidia-ctk --version 2>&1 | head -1 || echo "nvidia-ctk not installed"

echo "==DOCKER=="
docker version --format "{{.Server.Version}}" 2>/dev/null || echo "docker not running"

echo "==DOCKER-RUNTIME=="
cat /etc/docker/daemon.json 2>/dev/null || echo "no /etc/docker/daemon.json"

echo "==LLAMA-SERVER=="
ls -la /opt/llama.cpp/build/bin/llama-server 2>/dev/null || echo "llama-server binary missing"
/opt/llama.cpp/build/bin/llama-server --version 2>&1 | head -3 || true

echo "==LLAMA-SERVER-RUNNING=="
pgrep -af llama-server 2>&1 || echo "no llama-server running"

echo "==LLAMA-HTTP=="
for port in 8081 8082 8083 8091 9010; do
  out=$(curl -sS -m 2 "http://127.0.0.1:$port/v1/models" 2>&1 | head -1)
  echo "127.0.0.1:$port -> ${out:-no response}"
done

echo "==MODELS-ON-DISK=="
# Use nullglob so unmatched globs produce no args (no zsh "no matches found" failure).
shopt -s nullglob 2>/dev/null || true
for d in /home/knamant/models/*/; do
  [ -d "$d" ] || continue
  for f in "$d"/*.gguf "$d"/*.GGUF; do
    [ -f "$f" ] || continue
    sz=$(stat -c%s "$f" 2>/dev/null || echo "?")
    sha=$(sha256sum "$f" 2>/dev/null | cut -d" " -f1)
    echo "FILE $f size=$sz sha256=$sha"
  done
done

echo "==HF-CACHE=="
for d in /home/knamant/.cache/huggingface/hub/models--*/; do
  [ -d "$d" ] || continue
  name=$(basename "$d")
  size=$(du -sh "$d" 2>/dev/null | cut -f1)
  echo "HF $name size=$size"
done

echo "==FASTER-WHISPER=="
pip show faster_whisper 2>&1 | head -3 || echo "faster_whisper not installed"

echo "==PIPER=="
which piper 2>&1 || echo "piper not in PATH"
pip show piper-tts 2>&1 | head -3 || true

echo "==PIPER-VOICES=="
find /home /opt /usr/local -maxdepth 6 -name "*.onnx" 2>/dev/null | head

echo "==ANY-LLAMA-GGUF=="
find /home /opt /root -maxdepth 5 -name "*.gguf" 2>/dev/null | head -20

echo "==LIVEKIT=="
which livekit-server 2>&1 || echo "livekit-server not in PATH"
curl -sS -m 2 -o /dev/null -w "livekit /  -> %{http_code}\n" http://127.0.0.1:7880/ 2>&1 || true

echo "==PORTS=="
ss -tln 2>&1 | head -40

echo "==DISK=="
df -h /home /opt 2>&1

echo "==PYTHON=="
python3 --version 2>&1
