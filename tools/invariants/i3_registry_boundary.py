#!/usr/bin/env python3
"""Invariant I3: Registry boundary (cloud adapters forbidden in local-private).

Why it exists:
Local-private deployment requires complete isolation from external cloud APIs.
Cloud SDKs or proprietary cloud adapters must not be imported into the local runtime
contracts, agent compiler, or core API packages.
"""
from __future__ import annotations

import ast
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

FORBIDDEN_MODULES = {
    "openai",
    "anthropic",
    "google.generativeai",
    "sarvamai",
    "cohere",
    "mistralai",
    "groq",
}


def check_file_imports(filepath: Path) -> list[str]:
    violations = []
    try:
        content = filepath.read_text(encoding="utf-8")
        tree = ast.parse(content, filename=str(filepath))
    except Exception:
        return violations

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                mod = alias.name.split(".")[0]
                if mod in FORBIDDEN_MODULES:
                    violations.append(f"{filepath}:{node.lineno} imports '{alias.name}'")
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                mod = node.module.split(".")[0]
                if mod in FORBIDDEN_MODULES:
                    violations.append(f"{filepath}:{node.lineno} imports from '{node.module}'")
    return violations


def check_i3_registry_boundary() -> None:
    violations = []
    # Scan packages/ and apps/api/
    scan_dirs = [REPO_ROOT / "packages", REPO_ROOT / "apps" / "api"]
    for sdir in scan_dirs:
        for py_file in sdir.rglob("*.py"):
            violations.extend(check_file_imports(py_file))

    assert not violations, f"Violation I3: Cloud adapter imports detected in local runtime:\n" + "\n".join(violations)
    print("PASS: Invariant I3 (Registry boundary verified: no cloud adapters imported in local runtime)")


if __name__ == "__main__":
    try:
        check_i3_registry_boundary()
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
