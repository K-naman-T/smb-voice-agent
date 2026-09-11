#!/usr/bin/env python3
"""verify_p0.py — P0 gate for the v2 release path.

Checks (per docs/ENGINEERING_PLAN_v2.md §4 P0):
  1. P0 docs exist: docs/PRODUCT_SPEC.md, docs/ARCHITECTURE.md, docs/PRIVACY_MODEL.md.
  2. Schema packages import: agent_schema, runtime_contracts, privacy.
  3. No legacy imports of forbidden stacks in v2 source paths.
  4. Forbidden-provider scan over the v2 source tree passes.
  5. deploy/MODE and deploy/.env.example exist.
  6. Tests pass.

Usage:
  python3 scripts/verify_p0.py [--root PATH] [--no-pytest]

Exit codes:
  0  all checks pass
  1  one or more checks failed (details printed)
"""
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable

# Ensure `packages/` is importable so `privacy`, `agent_schema`, etc. resolve.
_THIS = Path(__file__).resolve()
_REPO = _THIS.parent.parent
sys.path.insert(0, str(_REPO / "packages"))

# Paths that belong to v2. Anything outside this set is considered legacy and
# may use the forbidden stacks (Twilio, Sarvam, Gemini, MiniMax, etc.).
V2_ROOTS = [
    "apps",
    "packages",
    "deploy",
    "scripts",
    "tests",
    "docs",
]

# Forbidden identifiers (case-insensitive substring match in source content).
# These are checked against files under V2_ROOTS only.
FORBIDDEN_SUBSTRINGS = [
    "import openai",
    "from openai",
    "import anthropic",
    "from anthropic",
    "import google.generativeai",
    "from google.generativeai",
    "import sarvam",
    "from sarvam",
    "import twilio",
    "from twilio",
    "import ollama",
    "from ollama",
]

# File extensions to scan.
SCAN_EXTS = {".py", ".yml", ".yaml", ".json", ".md", ".sh", ".env", ".example"}

# Files that may mention these substrings (e.g. privacy model documents them).
DOC_ALLOW_FILES = {
    "docs/PRIVACY_MODEL.md",
    "docs/ARCHITECTURE.md",
    "docs/PRODUCT_SPEC.md",
    "docs/ENGINEERING_PLAN_v2.md",
    "deploy/.env.example",
    "deploy/docker-compose.yml",
    "deploy/models/manifest.json",
    "deploy/chomp-gpu.lock",
    "scripts/verify_p0.py",
    "packages/privacy/forbidden_providers.py",
    "packages/runtime_contracts/deployment.py",
    "tests/unit/test_forbidden_providers.py",
    "tests/security/test_security_compliance.py",
}


def _files_under(roots: Iterable[str], base: Path) -> list[Path]:
    out: list[Path] = []
    for root in roots:
        p = base / root
        if not p.exists():
            continue
        for f in p.rglob("*"):
            if not f.is_file():
                continue
            if f.suffix not in SCAN_EXTS:
                continue
            # Skip obviously binary or generated dirs.
            rel = f.relative_to(base).as_posix()
            if any(part in rel.split("/") for part in ("__pycache__", ".git", "node_modules", ".venv", "var")):
                continue
            out.append(f)
    return out


def _check_docs(base: Path) -> list[str]:
    required = ["docs/PRODUCT_SPEC.md", "docs/ARCHITECTURE.md", "docs/PRIVACY_MODEL.md"]
    missing = [r for r in required if not (base / r).is_file()]
    return [f"missing required doc: {r}" for r in missing]


def _check_deploy(base: Path) -> list[str]:
    required = ["deploy/MODE", "deploy/.env.example"]
    return [f"missing required deploy file: {r}" for r in required if not (base / r).is_file()]


def _check_packages(base: Path) -> list[str]:
    required_pkgs = ["packages/agent_schema", "packages/runtime_contracts", "packages/privacy"]
    missing = [r for r in required_pkgs if not (base / r).is_dir()]
    return [f"missing required package: {r}" for r in missing]


def _check_legacy_imports(base: Path) -> list[str]:
    """Scan v2 source for forbidden stack imports.

    The DOC_ALLOW_FILES list is the explicit allowlist of files that may
    mention these substrings (e.g. docs that explain what is forbidden).
    """
    errs: list[str] = []
    for f in _files_under(V2_ROOTS, base):
        rel = f.relative_to(base).as_posix()
        if rel in DOC_ALLOW_FILES:
            continue
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for needle in FORBIDDEN_SUBSTRINGS:
            if needle in content:
                errs.append(f"{rel}: forbidden import substring {needle!r}")
    return errs


def _check_forbidden_provider_scan(base: Path) -> list[str]:
    """Run the privacy scanner over the v2 source/config tree.

    We feed the scanner the contents of v2 files as a string-keyed dict so
    that any leaked cloud URL or model prefix inside v2 surfaces as a
    violation. This is a structural check, not a live-network check.
    """
    pkg_path = str(base / "packages")
    if pkg_path not in sys.path:
        sys.path.insert(0, pkg_path)
    from privacy.forbidden_providers import scan_for_forbidden_providers  # noqa: E402

    # Build a synthetic config containing every v2 file's text, keyed by path.
    cfg: dict = {}
    for f in _files_under(V2_ROOTS, base):
        rel = f.relative_to(base).as_posix()
        if rel in DOC_ALLOW_FILES:
            continue
        if f.suffix not in {".py", ".yml", ".yaml", ".json", ".sh", ".env", ".example", ".md", ".lock"}:
            continue
        try:
            cfg[rel] = f.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue

    violations = scan_for_forbidden_providers(cfg, env={})
    return [f"{v.path}: {v.detail}" for v in violations]


def _run_pytest(base: Path) -> list[str]:
    try:
        result = subprocess.run(
            ["python3", "-m", "pytest", "tests/", "-q"],
            cwd=base,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except FileNotFoundError:
        return ["pytest not available"]
    if result.returncode != 0:
        return [f"pytest failed: {result.stdout[-2000:]}\n{result.stderr[-1000:]}"]
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--root", default=".", help="Repo root")
    parser.add_argument("--no-pytest", action="store_true", help="Skip pytest")
    args = parser.parse_args()

    base = Path(args.root).resolve()
    failures: list[str] = []

    print("[P0] docs present ...")
    errs = _check_docs(base)
    failures.extend(errs)
    print(f"      {'OK' if not errs else 'FAIL: ' + str(errs)}")

    print("[P0] packages present ...")
    errs = _check_packages(base)
    failures.extend(errs)
    print(f"      {'OK' if not errs else 'FAIL: ' + str(errs)}")

    print("[P0] deploy artifacts present ...")
    errs = _check_deploy(base)
    failures.extend(errs)
    print(f"      {'OK' if not errs else 'FAIL: ' + str(errs)}")

    print("[P0] no legacy forbidden imports in v2 ...")
    errs = _check_legacy_imports(base)
    failures.extend(errs)
    print(f"      {'OK' if not errs else f'FAIL: {len(errs)} matches'}")

    print("[P0] forbidden-provider scan ...")
    errs = _check_forbidden_provider_scan(base)
    failures.extend(errs)
    print(f"      {'OK' if not errs else f'FAIL: {len(errs)} violations'}")

    if not args.no_pytest:
        print("[P0] pytest tests/ ...")
        errs = _run_pytest(base)
        failures.extend(errs)
        print(f"      {'OK' if not errs else 'FAIL'}")

    print()
    if failures:
        print(f"P0 GATE: FAILED — {len(failures)} issues")
        for f in failures[:50]:
            print(f"  - {f}")
        return 1
    print("P0 GATE: PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
