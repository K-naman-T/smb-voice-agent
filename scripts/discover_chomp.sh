#!/usr/bin/env bash
# scripts/discover_chomp.sh
#
# Read-only inventory of the chomp host over Tailscale. Writes
# artifacts/chomp/<run-id>/discover.json and updates
# artifacts/chomp/latest/discover.json as a symlink.
#
# Captures: GPU + driver, llama-server, models (with sha256), faster-whisper,
# Piper, LiveKit, port landscape, disk free, kernel, uptime. Does NOT modify
# anything on chomp.
#
# Usage:
#   bash scripts/discover_chomp.sh [--ssh-host NAME] [--out-root PATH]
#   bash scripts/discover_chomp.sh                  # default: ssh chomp, write artifacts/chomp/

set -euo pipefail

REPO="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

SSH_HOST="chomp"
OUT_ROOT="artifacts/chomp"
while [ $# -gt 0 ]; do
  case "$1" in
    --ssh-host) SSH_HOST="$2"; shift 2;;
    --out-root) OUT_ROOT="$2"; shift 2;;
    -h|--help)
      grep '^# ' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$OUT_ROOT/$RUN_ID"
mkdir -p "$RUN_DIR"

# Remote commands piped through ssh as a script file via stdin.
# We push scripts/_discover_remote.sh to chomp and execute it with bash.
REMOTE_SCRIPT="scripts/_discover_remote.sh"

# Capture remote inventory to a raw file
RAW="$RUN_DIR/raw.txt"
echo "==RUN_ID== $RUN_ID" | tee "$RAW"
echo "==SSH_HOST== $SSH_HOST" | tee -a "$RAW"
echo "==REMOTE-INVENTORY===" | tee -a "$RAW"
chmod +x "$REPO/$REMOTE_SCRIPT" 2>/dev/null || true
ssh -o ConnectTimeout=10 "$SSH_HOST" "bash -s --" < "$REPO/$REMOTE_SCRIPT" 2>&1 | tee -a "$RAW"

# Convert raw to a JSON summary (kept simple — pure bash + awk).
# The verify_m0_5.py script does the strict assertions; here we just
# persist the raw and a tiny JSON index.
JSON="$RUN_DIR/discover.json"
{
  echo "{"
  echo "  \"run_id\": \"$RUN_ID\","
  echo "  \"ssh_host\": \"$SSH_HOST\","
  echo "  \"raw\": \"raw.txt\","
  echo "  \"captured_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
  echo "}"
} > "$JSON"

# Symlink "latest" to the current run.
mkdir -p "$OUT_ROOT/latest"
ln -sfn "../$RUN_ID" "$OUT_ROOT/latest/run"
cp -f "$JSON" "$OUT_ROOT/latest/discover.json"
cp -f "$RAW" "$OUT_ROOT/latest/raw.txt"

echo
echo "wrote $JSON"
echo "wrote $RAW"
echo "wrote $OUT_ROOT/latest/discover.json (symlink target updated)"
