#!/usr/bin/env python3
"""scripts/_refresh_repo_artifacts.py

Runs LOCALLY on the dev box (where the repo is checked out). Reads
artifacts/chomp/latest/raw.txt, computes the real sha256 of every GGUF
on chomp that we want to pin, and rewrites:

  - deploy/models/manifest.json  (LLM entry sha256 = the real value)
  - deploy/chomp-gpu.lock        (driver, cuda, llama.cpp commit, model sha)

This is the bridge between "what's actually on chomp" and "what the
repo says is on chomp". Idempotent.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
RAW = REPO / "artifacts" / "chomp" / "latest" / "raw.txt"
MANIFEST = REPO / "deploy" / "models" / "manifest.json"
LOCK = REPO / "deploy" / "chomp-gpu.lock"


def _read(path: Path) -> str:
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")


def parse_driver(raw: str) -> str | None:
    m = re.search(r"Driver Version:\s*([0-9.]+)", raw)
    return m.group(1) if m else None


def parse_cuda(raw: str) -> str | None:
    m = re.search(r"CUDA Version:\s*([0-9.]+)", raw)
    return m.group(1) if m else None


def parse_llama_commit(raw: str) -> str | None:
    # `/opt/llama.cpp/build/bin/llama-server --version` prints e.g. "version: 1 (fc6545d)".
    m = re.search(r"version:\s*[\w.\-]+\s*\(([0-9a-f]+)\)", raw)
    return m.group(1) if m else None


def parse_model_sha(raw: str, filename: str) -> str | None:
    m = re.search(
        rf"FILE .*?{re.escape(filename)} size=\d+ sha256=([0-9a-f]{{64}})", raw
    )
    return m.group(1) if m else None


def refresh_manifest(llm_sha: str) -> None:
    if not MANIFEST.is_file():
        print(f"missing {MANIFEST}", file=sys.stderr)
        return
    manifest = json.loads(MANIFEST.read_text())
    for m in manifest.get("models", []):
        if m.get("id") == "llm.chomp.fast":
            m["sha256"] = llm_sha
            m["filename"] = "Qwen3.5-9B-Q4_K_M.gguf"
            m["url"] = (
                "https://huggingface.co/lmstudio-community/Qwen3.5-9B-GGUF/"
                f"resolve/main/{m['filename']}"
            )
            break
    else:
        manifest["models"].insert(
            0,
            {
                "id": "llm.chomp.fast",
                "kind": "llm",
                "runtime": "llama.cpp",
                "filename": "Qwen3.5-9B-Q4_K_M.gguf",
                "url": (
                    "https://huggingface.co/lmstudio-community/Qwen3.5-9B-GGUF/"
                    "resolve/main/Qwen3.5-9B-Q4_K_M.gguf"
                ),
                "sha256": llm_sha,
                "min_vram_mb": 5500,
                "ctx_size": 4096,
                "purpose": "Default LLM profile for chomp (Q4_K_M, 9B chat).",
                "license": "apache-2.0",
            },
        )
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"updated {MANIFEST} (llm.chomp.fast sha={llm_sha[:12]}…)")


def refresh_lock(driver: str | None, cuda: str | None, llama_commit: str | None, llm_sha: str | None) -> None:
    if not LOCK.is_file():
        print(f"missing {LOCK}", file=sys.stderr)
        return
    lock = json.loads(LOCK.read_text())
    if driver:
        lock["nvidia_driver"] = driver
    if cuda:
        lock["cuda_runtime"] = cuda
    if llama_commit:
        lock["llama_cpp_git_sha"] = llama_commit
    if llm_sha:
        lock["llm_sha256"] = llm_sha
        lock.setdefault("notes", []).append(
            f"llm_sha256 is the sha256 of the pinned default model "
            f"(Qwen3.5-9B-Q4_K_M.gguf) verified by scripts/discover_chomp.sh."
        )
    LOCK.write_text(json.dumps(lock, indent=2) + "\n")
    print(
        f"updated {LOCK} (driver={driver}, cuda={cuda}, "
        f"llama={llama_commit}, llm_sha={llm_sha[:12] if llm_sha else 'unchanged'}…)"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--llm-filename", default="Qwen3.5-9B-Q4_K_M.gguf")
    args = parser.parse_args()

    raw = _read(RAW)
    if not raw:
        print(f"missing {RAW}; run scripts/discover_chomp.sh first", file=sys.stderr)
        return 1

    driver = parse_driver(raw)
    cuda = parse_cuda(raw)
    llama_commit = parse_llama_commit(raw)
    llm_sha = parse_model_sha(raw, args.llm_filename)

    if not llm_sha:
        print(
            f"could not find sha256 for {args.llm_filename!r} in {RAW}. "
            f"Has bring_up_chomp.sh run yet?",
            file=sys.stderr,
        )
        return 1

    refresh_manifest(llm_sha)
    refresh_lock(driver, cuda, llama_commit, llm_sha)
    return 0


if __name__ == "__main__":
    sys.exit(main())
