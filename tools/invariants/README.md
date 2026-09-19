# Invariants

One file per rule this repo keeps having to repeat in review. A review comment
posted twice becomes an invariant here the same day. Each invariant is a small
runnable check (any language), exits non-zero on violation, and is called from
CI or from `tools/slop_gate.py --ci` via `run_invariants.py`.

Naming: `tools/invariants/<what-it-protects>.py`.
Content: the rule in one line, why it exists (the incident), the check.

This folder is how the standard stops being generic: everything here came out of
a real review on this repo.
