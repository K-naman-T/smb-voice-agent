#!/usr/bin/env python3
"""registry_audit.py - block slopsquatting and phantom dependencies.

A hallucinated import that happens to be a published package passes every audit
in existence, because npm audit / pip-audit / bundler-audit all assume the
package is real. This script checks existence instead: parse the lockfile,
ask the registry, fail on 404.

Usage:
  python tools/registry_audit.py [--root .] [--ci] [--json] [--max-age-days 30]
Exit 1 when a dependency does not exist (or when --ci and any warning exists).
Stdlib only; needs network. Run it in CI and before releasing, not on every commit.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = {"User-Agent": "hermes-registry-audit/1.0"}
LOCAL_PREFIXES = ("@our-scope/", "file:", "link:", "workspace:", "./", "../", "-e ", "git+", "http://", "https://")


def req_json(url: str, timeout: int = 20):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout)
        return r.status, json.loads(r.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception:  # noqa: BLE001
        return 0, None   # network failure: reported as unknown, not as missing


def parse_npm(root: str):
    p = os.path.join(root, "package-lock.json")
    if not os.path.isfile(p):
        return []
    data = json.load(open(p, encoding="utf-8"))
    names = set()
    for key in (data.get("packages") or {}):
        if not key:
            continue
        nm = key.split("node_modules/")[-1]
        if nm:
            names.add(nm)
    for nm in (data.get("dependencies") or {}):
        names.add(nm)
    return [("npm", n) for n in sorted(names)]


def parse_pypi(root: str):
    out = set()
    for fn in ("requirements.txt", "requirements-dev.txt", "requirements-prod.txt"):
        p = os.path.join(root, fn)
        if not os.path.isfile(p):
            continue
        for line in open(p, encoding="utf-8", errors="replace"):
            line = line.split("#")[0].strip()
            if not line or line.startswith("-"):
                continue
            nm = re.split(r"[<>=!~\[;\s]", line)[0].strip()
            if nm:
                out.add(nm)
    p = os.path.join(root, "poetry.lock")
    if os.path.isfile(p):
        for m in re.finditer(r'^name\s*=\s*"([^"]+)"', open(p, encoding="utf-8").read(), re.M):
            out.add(m.group(1))
    return [("pypi", n) for n in sorted(out)]


def parse_gems(root: str):
    p = os.path.join(root, "Gemfile.lock")
    if not os.path.isfile(p):
        return []
    out, in_specs = set(), False
    for line in open(p, encoding="utf-8", errors="replace"):
        if line.startswith("  specs:"):
            in_specs = True
            continue
        if in_specs and re.match(r"^\S", line):
            break
        m = re.match(r"^ {4}([A-Za-z0-9_.-]+) \(", line)
        if in_specs and m:
            out.add(m.group(1))
    return [("rubygems", n) for n in sorted(out)]


def check(ecosystem: str, name: str, max_age_days: int):
    if name.startswith(LOCAL_PREFIXES):
        return ("local", name, None, None)
    if ecosystem == "npm":
        url = "https://registry.npmjs.org/" + urllib.parse.quote(name, safe="")
        status, data = req_json(url)
        age = None
        if data and isinstance(data.get("time"), dict) and data["time"].get("created"):
            age = data["time"]["created"]
    elif ecosystem == "pypi":
        status, data = req_json(f"https://pypi.org/pypi/{urllib.parse.quote(name)}/json")
        age = None
        if data and data.get("releases"):
            earliest = None
            for rel_files in data["releases"].values():
                for f in rel_files:
                    t = f.get("upload_time_iso_8601")
                    if t and (earliest is None or t < earliest):
                        earliest = t
            age = earliest
        elif data and data.get("urls"):
            age = data["urls"][0].get("upload_time_iso_8601")
    else:
        status, data = req_json(f"https://rubygems.org/api/v1/gems/{urllib.parse.quote(name)}.json")
        age = None
    if status == 200:
        return ("exists", name, None, age)
    if status == 404:
        return ("missing", name, "404 from registry", age)
    return ("unknown", name, f"registry unreachable (status {status})", age)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--ci", action="store_true", help="exit 1 on warnings too")
    ap.add_argument("--json", action="store_true", dest="as_json")
    ap.add_argument("--max-age-days", type=int, default=30,
                    help="flag packages first published more recently than this")
    args = ap.parse_args()

    deps = parse_npm(args.root) + parse_pypi(args.root) + parse_gems(args.root)
    if not deps:
        print("registry audit: no lockfile or requirements file found")
        return 0

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda d: check(d[0], d[1], args.max_age_days), deps))

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    missing, unknown, fresh, ok = [], [], [], 0
    for state, name, note, age in results:
        if state == "missing":
            missing.append(name)
        elif state == "unknown":
            unknown.append(name)
        elif state == "exists":
            ok += 1
            if age and args.max_age_days > 0:
                try:
                    created = datetime.fromisoformat(age.replace("Z", "+00:00"))
                    if (now - created).days <= args.max_age_days:
                        fresh.append(f"{name} (first published {(now - created).days}d ago)")
                except ValueError:
                    pass

    verdict = "FAIL" if missing or (args.ci and (unknown or fresh)) else "PASS"
    if args.as_json:
        print(json.dumps({"verdict": verdict, "checked": len(results), "exists": ok,
                          "missing": missing, "unknown": unknown, "fresh": fresh}, indent=1))
    else:
        print(f"registry audit: {len(results)} dependencies, {ok} exist, "
              f"{len(missing)} missing, {len(unknown)} unreachable")
        for n in missing:
            print(f"  MISSING  {n}  (hallucinated or squatted: do not install, do not import)")
        for n in unknown:
            print(f"  UNKNOWN  {n}  (registry unreachable; re-run before release)")
        for n in fresh:
            print(f"  NEW      {n}  (review the publisher before trusting it)")
        print(verdict)
    return 1 if verdict == "FAIL" else 0


if __name__ == "__main__":
    sys.exit(main())
