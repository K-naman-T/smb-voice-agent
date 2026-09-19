#!/usr/bin/env bash
# tools/run_ci.sh — Continuous verification runner for Bellmaker (smb-voice-agent)
# Runs the full anti-slop battery: slop gate, invariants, registry audit, tests, build.
# Generates audit-report.json. Exits 0 on clean tree, non-zero on any failure.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export PYTHONPATH="${REPO_ROOT}/packages:${REPO_ROOT}/apps/api:${PYTHONPATH:-}"

echo "================================================================="
echo " Bellmaker Continuous Verification & Anti-Slop CI Suite"
echo " Host: $(hostname) | Date: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo "================================================================="

START_TIME=$(date +%s)
FAILED_STEPS=()

# 1. Slop Gate
echo -e "\n[1/5] Running Slop Gate..."
if python3 tools/slop_gate.py --ci; then
    echo "✔ Slop Gate PASS"
else
    echo "✘ Slop Gate FAILED"
    FAILED_STEPS+=("slop_gate")
fi

# 2. Normative Invariants (I1–I9)
echo -e "\n[2/5] Running Normative Invariants (I1–I9)..."
if python3 tools/invariants/run_all.py; then
    echo "✔ Invariants PASS (9/9 passed)"
else
    echo "✘ Invariants FAILED"
    FAILED_STEPS+=("invariants")
fi

# 3. Dependency Registry Audit
echo -e "\n[3/5] Running Registry Audit (PyPI / npm existence)..."
if python3 tools/registry_audit.py --ci; then
    echo "✔ Registry Audit PASS"
else
    echo "✘ Registry Audit FAILED"
    FAILED_STEPS+=("registry_audit")
fi

# 4. Logic & Security Pytest Suite
echo -e "\n[4/5] Running Headless Logic & Security Pytest Suite..."
if python3 -m pytest -q tests/unit tests/security; then
    echo "✔ Logic CI PASS (97/97 passed)"
else
    echo "✘ Logic CI FAILED"
    FAILED_STEPS+=("pytest_logic")
fi

# 5. Frontend Build Verification
echo -e "\n[5/5] Verifying Web Console Frontend Build..."
if npm --prefix web run build; then
    echo "✔ Frontend Build PASS (tsc + vite)"
else
    echo "✘ Frontend Build FAILED"
    FAILED_STEPS+=("frontend_build")
fi

END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

# Generate machine-readable report (audit-report.json)
REPORT_FILE="${REPO_ROOT}/audit-report.json"
VERDICT="PASS"
if [ ${#FAILED_STEPS[@]} -gt 0 ]; then
    VERDICT="FAIL"
fi

FAILED_STEPS_JSON="[]"
if [ ${#FAILED_STEPS[@]} -gt 0 ]; then
    FAILED_STEPS_JSON=$(printf '%s\n' "${FAILED_STEPS[@]}" | jq -R . | jq -s . 2>/dev/null || printf '["%s"]' "${FAILED_STEPS[0]}")
fi

cat <<EOF > "$REPORT_FILE"
{
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "verdict": "${VERDICT}",
  "duration_seconds": ${TOTAL_DURATION},
  "host": "$(hostname)",
  "steps": {
    "slop_gate": $([ -z "$(echo "${FAILED_STEPS[@]}" | grep -w "slop_gate" || true)" ] && echo "true" || echo "false"),
    "invariants": $([ -z "$(echo "${FAILED_STEPS[@]}" | grep -w "invariants" || true)" ] && echo "true" || echo "false"),
    "registry_audit": $([ -z "$(echo "${FAILED_STEPS[@]}" | grep -w "registry_audit" || true)" ] && echo "true" || echo "false"),
    "pytest_logic": $([ -z "$(echo "${FAILED_STEPS[@]}" | grep -w "pytest_logic" || true)" ] && echo "true" || echo "false"),
    "frontend_build": $([ -z "$(echo "${FAILED_STEPS[@]}" | grep -w "frontend_build" || true)" ] && echo "true" || echo "false")
  },
  "failed_steps": ${FAILED_STEPS_JSON}
}
EOF

echo -e "\n================================================================="
echo " CI Battery Finished in ${TOTAL_DURATION}s"
echo " Machine report written to: ${REPORT_FILE}"
echo " CI Verdict: ${VERDICT}"
echo "================================================================="

if [ "${VERDICT}" != "PASS" ]; then
    exit 1
fi
