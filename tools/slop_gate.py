#!/usr/bin/env python3
"""slop_gate.py - mechanical anti-slop checks for a repo.

Tier A (HARD) findings fail the gate. Tier B (WARN) findings are defaults that
need a written reason; they fail only under --strict.

Usage:
  python tools/slop_gate.py [paths...] [--staged] [--ci] [--strict] [--json]

Suppress a single line with a comment containing `slop-allow` (optionally
`slop-allow: D2` for one rule). Repo config in .slop.json:
  {"disable": ["D8"], "exempt_globs": ["docs/**"]}
Documentation of the rules themselves is a carve-out: exempt that path or put
`slop-allow: H6` on the line.

Stdlib only. Exit 1 when HARD findings exist, or when --strict and any finding
at all exists.
"""
from __future__ import annotations

import argparse
import fnmatch
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field

TEXT_EXT = {
    ".py", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".vue", ".svelte",
    ".astro", ".html", ".htm", ".css", ".scss", ".sass", ".md", ".mdx",
    ".json", ".yml", ".yaml", ".toml", ".txt", ".sh", ".rb", ".go", ".rs",
    ".java", ".kt", ".php", ".ex", ".exs",
}
DEFAULT_SKIP_DIRS = {
    ".git", "node_modules", "dist", "build", "out", ".next", ".nuxt",
    "venv", ".venv", "__pycache__", ".mypy_cache", ".pytest_cache", "vendor",
    "target", ".hermes", "coverage", ".turbo",
}
# The gate's own rule table, and the docs that state the rules, contain the
# patterns they ban. Naming a banned pattern is not committing it: this is the
# same carve-out the em-dash rule uses for its own documentation.
SELF_EXEMPT_FILES = {
    "slop_gate.py", "registry_audit.py",
    "AGENTS.md", "CLAUDE.md", "GEMINI.md", "DELIVERY-GATE.md", "standards.md",
}


@dataclass
class Rule:
    id: str
    tier: str          # "hard" | "warn"
    title: str
    pattern: str
    exts: set | None = None
    note: str = ""
    ci: bool = False   # case-insensitive matching
    _rx: re.Pattern = field(default=None, repr=False)

    def rx(self) -> re.Pattern:
        if self._rx is None:
            self._rx = re.compile(self.pattern, re.IGNORECASE if self.ci else 0)
        return self._rx

    def applies(self, ext: str) -> bool:
        return self.exts is None or ext in self.exts


WEB = {".html", ".htm", ".jsx", ".tsx", ".vue", ".svelte", ".astro"}
STYLE = {".css", ".scss", ".sass"}
CODE = {".py", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".go", ".rb", ".rs", ".java", ".kt", ".php"}
# Em dashes are only worth flagging where copy ships to a reader. Internal notes,
# briefs and agent transcripts are a different surface; including them drowns the
# signal (a scan of one working repo: 402 hits, 368 of them in daily briefs).
# Opt a docs tree in with .slop.json: {"em_dash_extra_exts": [".md"]}.
EM_DASH_EXTS = WEB | {".css", ".scss"}

RULES = [
    # ---------------- Tier A: HARD ----------------
    Rule("H1", "hard", "dead control",
         r'(href\s*=\s*["\']\s*#?\s*["\']|javascript:void|onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}|onclick\s*=\s*["\']\s*(return\s+false;?)?\s*["\'])',
         WEB | {".md", ".mdx"},
         "Control resolves nowhere. Real destination, real handler, or remove it."),
    Rule("H2", "hard", "scaffold shipped as done",
         r'(\bTODO\b|\bFIXME\b|NotImplementedError|raise\s+NotImplemented|throw\s+new\s+Error\(\s*["\']not implemented|\bstub\b\s*(implementation|only)|not\s+implemented\s+yet)',
         None, "No stub on a path you claim works."),
    Rule("H3", "hard", "fabricated proof",
         r'(99\.9\d?%\s*(uptime|availability)|trusted\s+by\s+\d|\b\d{1,3}(,\d{3})*\+?\s*(users|customers|teams|developers|founders)|\b\d+[kK]\+\s*(users|customers)|rated\s+\d(\.\d)?\s*/\s*5|\bSOC\s*2\b|\bISO\s*27001\b|HIPAA[- ]compliant|GDPR[- ]compliant|Lorem\s+ipsum|Jane\s+Doe|John\s+Doe|John\s+Smith|Sarah\s+Chen|\bAcme\b|\bSmartFlow\b|\bCloudly\b|Your\s+Name\s+Here)',
         None, "Unsourceable claim or placeholder identity. Show nothing instead.", True),
    Rule("H4", "hard", "secret in source",
         r'(AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_\-]{16,}|AIza[0-9A-Za-z_\-]{35}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN[^-]*PRIVATE KEY-----|(password|passwd|api[_-]?key|secret|access[_-]?token)\s*[:=]\s*["\'][^"\']{8,}["\'])',
         None, "Move to env. Never commit a credential.", True),
    Rule("H5", "hard", "swallowed error",
         r'(except\s+[^:]*:\s*pass\b|except\s*:\s*pass\b|catch\s*\([^)]*\)\s*\{\s*\}|catch\s*\{\s*\}|\.catch\s*\(\s*\(?\s*\w*\s*\)?\s*=>\s*\{\s*\}\s*\))',
         CODE, "Swallowing the error hides the failure. Handle it or let it surface."),
    Rule("H6", "hard", "em dash in shipped copy",
         r'\u2014', EM_DASH_EXTS,
         "Em dash is the loudest AI tell. Comma, colon, parentheses. Rule docs are a carve-out."),
    Rule("H7", "hard", "type suppression without a reason",
         r'(@ts-ignore\s*$|@ts-expect-error\s*$|#\s*type:\s*ignore\s*$)',
         {".ts", ".tsx", ".js", ".jsx", ".py"},
         "A suppression with no comment explaining why is a debt marker."),

    # ---------------- Tier B: WARN ----------------
    Rule("D1", "warn", "gradient as default",
         r'(bg-gradient-to-|bg-linear-to-|bg-clip-text|linear-gradient\s*\()',
         None, "Needs a stated hierarchy or brand purpose."),
    Rule("D2", "warn", "transition-all",
         r'(transition-all|transition:\s*all)', None,
         "Name the properties; all of them animates layout by accident."),
    Rule("D3", "warn", "hover scale reflex",
         r'(hover:scale-1(0[1-9]|1\d)|scale-105\b|scale-110\b)', None,
         "The universal hover tell. Change something meaningful instead."),
    Rule("D4", "warn", "z-index 9999",
         r'(z-index:\s*9{3,}|z-\[9{3,}\])', None, "Stacking context, not escalation."),
    Rule("D5", "warn", "unchosen default type",
         r'(\bInter\b|\bGeist\b|\bRoboto\b)', None,
         "A face that was never chosen. Pick it in DESIGN.md or by A/B render."),
    Rule("D6", "warn", "glass / blur as default",
         r'(backdrop-blur|backdrop-filter\s*:)', None,
         "Blur on at most 1-2 elements; never navbar plus cards plus modal."),
    Rule("D7", "warn", "emoji as icon",
         r'([\U0001F300-\U0001FAFF\u2600-\u27BF])',
         WEB | {".md", ".mdx", ".json"},
         "Designed icons, or none."),
    Rule("D8", "warn", "three-equal-card row",
         r'(grid-cols-3|repeat\(3,\s*minmax)', WEB,
         "The most-named AI layout tell. Vary the composition."),
    Rule("D9", "warn", "colored side-stripe card",
         r'(border-l-4|border-left:\s*[3-9]px)', None,
         "Alert styling sprayed on ordinary cards."),
    Rule("D10", "warn", "viewport-height hero",
         r'(\bh-screen\b|100vh)', WEB | STYLE,
         "Use min-h-[100dvh]; 100vh clips on mobile."),
    Rule("D11", "warn", "fake product chrome",
         r'(fake[-_ ]?(terminal|browser|dashboard|screenshot)|v\d+\.\d+\.\d+-rc\.\d+)', None,
         "Real screenshot, real component, or nothing."),
]

DEFAULTS = {"disable": [], "exempt_globs": [], "em_dash_extra_exts": []}


@dataclass
class Finding:
    rule: str
    tier: str
    title: str
    path: str
    line: int
    snippet: str
    note: str = ""


def load_config(root: str) -> dict:
    cfg = dict(DEFAULTS)
    p = os.path.join(root, ".slop.json")
    if os.path.isfile(p):
        try:
            user = json.load(open(p, encoding="utf-8"))
            for k in ("disable", "exempt_globs", "em_dash_extra_exts"):
                if isinstance(user.get(k), list):
                    cfg[k] = user[k]
        except Exception as exc:  # noqa: BLE001
            print(f"slop gate: ignoring bad .slop.json ({exc})", file=sys.stderr)
    return cfg


def staged_files() -> list[str]:
    try:
        out = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
            capture_output=True, text=True, check=True).stdout
    except Exception:  # noqa: BLE001
        return []
    return [f for f in out.splitlines() if f.strip()]


def iter_files(paths: list[str], exempt: list[str]):
    for start in paths:
        if os.path.isfile(start):
            if os.path.basename(start) not in SELF_EXEMPT_FILES:
                yield start
            continue
        for dirpath, dirnames, filenames in os.walk(start):
            dirnames[:] = [d for d in dirnames if d not in DEFAULT_SKIP_DIRS]
            for name in filenames:
                if name in SELF_EXEMPT_FILES:
                    continue
                full = os.path.join(dirpath, name)
                rel = os.path.relpath(full, start)
                if any(fnmatch.fnmatch(rel, g) or fnmatch.fnmatch(full, g) for g in exempt):
                    continue
                if os.path.splitext(name)[1].lower() in TEXT_EXT:
                    yield full


EXCEPT_ONLY = re.compile(r'^\s*except\b[^:]*:\s*(#.*)?$')


def scan(path: str, rules: list[Rule]) -> tuple[list[Finding], int]:
    findings: list[Finding] = []
    ext = os.path.splitext(path)[1].lower()
    try:
        raw = open(path, "rb").read()
    except OSError:
        return findings, 0
    if b"\x00" in raw[:4096]:
        return findings, 0
    text = raw.decode("utf-8", errors="replace")
    lines = text.splitlines()
    applicable = [r for r in rules if r.applies(ext)]
    for i, line in enumerate(lines, 1):
        allowed = re.findall(r"slop-allow\s*:?\s*([A-Z]\d+)", line)
        skip_all = "slop-allow" in line and not allowed
        for rule in applicable:
            if skip_all or rule.id in allowed:
                continue
            if rule.rx().search(line):
                findings.append(Finding(rule.id, rule.tier, rule.title, path, i,
                                        line.strip()[:160], rule.note))

    # H5 also covers a split block: `except ...:` on one line, bare `pass` after it.
    h5 = next((r for r in applicable if r.id == "H5"), None)
    if h5:
        for idx, line in enumerate(lines):
            if not EXCEPT_ONLY.match(line) or "slop-allow" in line:
                continue
            for j in range(idx + 1, min(idx + 4, len(lines))):
                nxt = lines[j].strip()
                if not nxt or nxt.startswith("#"):
                    continue
                if nxt in ("pass", "..."):
                    findings.append(Finding("H5", "hard", h5.title, path, idx + 1,
                                            f"{line.strip()[:60]} -> {nxt}", h5.note))
                break
    return findings, len(lines)


def main() -> int:
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("paths", nargs="*", default=["."])
    ap.add_argument("--staged", action="store_true", help="check git staged files only")
    ap.add_argument("--ci", action="store_true", help="exit 1 on HARD findings (default)")
    ap.add_argument("--strict", action="store_true", help="exit 1 on WARN findings too")
    ap.add_argument("--json", action="store_true", dest="as_json")
    args = ap.parse_args()

    root = os.getcwd()
    cfg = load_config(root)
    rules = [r for r in RULES if r.id not in cfg["disable"]]
    extra = cfg.get("em_dash_extra_exts") or []
    if extra:
        for r in rules:
            if r.id == "H6" and r.exts is not None:
                r.exts = set(r.exts) | {str(e).lower() for e in extra}

    files = staged_files() if args.staged else []
    targets = files if args.staged else [p for p in args.paths if os.path.exists(p)]
    if args.staged and not files:
        print("slop gate: no staged files")
        return 0

    findings: list[Finding] = []
    scanned = 0
    for f in iter_files(targets, cfg["exempt_globs"]):
        got, _lines = scan(f, rules)
        if got or True:
            scanned += 1
        findings.extend(got)

    hard = [f for f in findings if f.tier == "hard"]
    warn = [f for f in findings if f.tier == "warn"]
    verdict = "FAIL" if hard or (args.strict and warn) else "PASS"

    if args.as_json:
        print(json.dumps({
            "verdict": verdict,
            "files_scanned": scanned,
            "hard": len(hard),
            "warn": len(warn),
            "findings": [f.__dict__ for f in findings],
        }, indent=1))
    else:
        print(f"slop gate: {scanned} files, {len(hard)} hard, {len(warn)} warn")
        for label, group in (("HARD", hard), ("WARN", warn)):
            if not group:
                continue
            print(f"\n{label}")
            by_rule: dict[str, list[Finding]] = {}
            for f in group:
                by_rule.setdefault(f.rule, []).append(f)
            for rid in sorted(by_rule, key=lambda r: (r[0], int(r[1:]))):
                rows = sorted(by_rule[rid], key=lambda r: (r.path, r.line))
                print(f"  {rid}  {rows[0].title}  ({len(rows)})")
                if rows[0].note:
                    print(f"      {rows[0].note}")
                for r in rows[:8]:
                    print(f"      {r.path}:{r.line}  {r.snippet}")
                if len(rows) > 8:
                    print(f"      (+{len(rows) - 8} more)")
        print(f"\n{verdict}")
        if hard:
            print("hard findings block delivery. Fix, or argue in the diff; do not disable the rule.")

    return 1 if verdict == "FAIL" else 0


if __name__ == "__main__":
    sys.exit(main())
