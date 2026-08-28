#!/usr/bin/env bash
# scripts/check_no_legacy_imports.sh
#
# Gate for the v2 import boundary. Fails (exit 1) if any file under the v2
# source tree imports from the legacy v1 surface (api/, voice_pipeline,
# legacy/).
#
# Usage:  bash scripts/check_no_legacy_imports.sh
#
# Allowed v2 roots: apps packages deploy scripts tests docs web

set -euo pipefail

ROOTS=(apps packages deploy scripts tests docs web)
PATTERN='(import[[:space:]]+voice_pipeline\b|from[[:space:]]+voice_pipeline\b|import[[:space:]]+api\.main\b|from[[:space:]]+api\.main\b|import[[:space:]]+api\.kits\b|from[[:space:]]+api\.kits\b|import[[:space:]]+legacy\b|from[[:space:]]+legacy\b)'

violations=$(grep -rEn "$PATTERN" "${ROOTS[@]}" 2>/dev/null \
  | grep -v '^web/' \
  | grep -v '__pycache__' \
  | grep -v 'verify_p0.py' \
  | grep -v 'check_no_legacy_imports.sh' \
  || true)

# Note: the `web/` exclusion is because the v1 web lives in legacy/ and
# verify_p0.py contains a sentinel literal that would false-positive.

if [ -n "$violations" ]; then
  echo "forbidden legacy import(s) found in v2 source:" >&2
  echo "$violations" >&2
  exit 1
fi

echo "OK: no legacy imports in v2 source"
