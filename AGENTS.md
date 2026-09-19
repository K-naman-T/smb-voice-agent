# AGENTS.md — <project>

Read `DESIGN.md` before touching UI. Read `DELIVERY-GATE.md` before saying done.

## Commands

- install: `<cmd>`
- dev: `<cmd>`
- test: `<cmd>`
- gate: `python tools/slop_gate.py --ci`

## Non-inferable gotchas

- <only what a reader cannot get from the code: env quirks, ordering rules, the
  one file that looks dead but is load-bearing>

## Hard rules (FAIL = do not ship)

1. No claim without a source: no invented numbers, testimonials, names, logos,
   badges. No data → show nothing.
2. No dead controls: every link/button/nav item resolves to something real.
3. Every data surface has empty, loading and error states.
4. Mobile is part of the design: no horizontal overflow, 44px targets.
5. Contrast measured, not eyeballed: 4.5:1 body, 3:1 large text.
6. It runs, and the click-through is recorded element by element.
7. No TODO/stub/`pass`/`NotImplemented` on a path you claim works.
8. No hallucinated dependencies: imports must exist in the lockfile and the registry.

## Defaults that need a written reason

Gradients/glow/glass, unchosen default type, decorative icons, three-equal-card
rows, bento as reflex, eyebrow chips and 01/02 markers, `transition-all`,
`hover:scale-105`, bounce easing, universal scroll fade-up. Allowed with a
reason naming what is specific to this product.

## Convention locks

- Match the surrounding code: naming, comment density, idiom.
- Smallest change that passes the acceptance test. No speculative abstraction.
- Reuse what exists; duplication is a defect.
- A review comment posted twice becomes `tools/invariants/<name>.py` the same day.
- Acceptance criteria + why live with the diff (PR body or `NOTES.md`).

Full doctrine, tier definitions and sourcing: `~/.hermes/skills/software-development/anti-slop-standards/SKILL.md`.

<!-- This file is symlinked as CLAUDE.md, GEMINI.md and .cursor/rules/standards.md.
     Keep it under 60 lines. Long material belongs in DESIGN.md or a skill. -->
