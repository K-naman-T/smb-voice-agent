#!/usr/bin/env python3
"""Run all normative invariants (I1–I9) from ENGINEERING_PLAN_v2.md §1.2.

Usage:
    python tools/invariants/run_all.py [--json]
Exits 0 if all invariants pass, 1 on any failure.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

INVARIANTS = [
    ("I1 Colocation", "i1_colocation.py"),
    ("I2 Immutable Artifact", "i2_immutable_artifact.py"),
    ("I3 Registry Boundary", "i3_registry_boundary.py"),
    ("I4 Dual Test", "i4_dual_test.py"),
    ("I5 Certified Bind", "i5_certified_bind.py"),
    ("I6 Tool State Machine", "i6_tool_state_machine.py"),
    ("I7 Privacy Fail-Closed", "i7_privacy_fail_closed.py"),
    ("I8 Single GPU Policy", "i8_single_gpu_policy.py"),
    ("I9 English-Only v1", "i9_english_only.py"),
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Run all engineering invariants")
    parser.add_argument("--json", action="store_true", dest="as_json", help="Output JSON report")
    args = parser.parse_args()

    invariants_dir = Path(__file__).resolve().parent
    results = []
    all_passed = True
    total_start = time.monotonic()

    for name, script_name in INVARIANTS:
        script_path = invariants_dir / script_name
        start = time.monotonic()
        proc = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
        )
        duration_ms = round((time.monotonic() - start) * 1000, 2)
        passed = proc.returncode == 0
        if not passed:
            all_passed = False

        results.append({
            "name": name,
            "script": script_name,
            "passed": passed,
            "duration_ms": duration_ms,
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
        })

        if not args.as_json:
            status = "PASS" if passed else "FAIL"
            print(f"[{status}] {name:<26} ({duration_ms}ms)")
            if not passed:
                if proc.stdout.strip():
                    print(f"       stdout: {proc.stdout.strip()}")
                if proc.stderr.strip():
                    print(f"       stderr: {proc.stderr.strip()}")

    total_duration_ms = round((time.monotonic() - total_start) * 1000, 2)

    if args.as_json:
        print(json.dumps({
            "verdict": "PASS" if all_passed else "FAIL",
            "total_duration_ms": total_duration_ms,
            "passed_count": sum(1 for r in results if r["passed"]),
            "total_count": len(results),
            "results": results,
        }, indent=2))
    else:
        print(f"\nInvariants: {sum(1 for r in results if r['passed'])}/{len(results)} passed in {total_duration_ms}ms")
        print("Verdict:", "PASS" if all_passed else "FAIL")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
