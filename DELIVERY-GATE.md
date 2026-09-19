# DELIVERY-GATE.md — run before saying done

Copy this into the handover message. One line per item, every PASS backed by an
artifact: command output, screenshot path, or the named click-through result.
A PASS with no artifact is a FAIL. Any FAIL means do not ship; fix, then re-run.

## Block 1 — Hard gate (all answers must be NO)

- [ ] Any number, uptime, user count, rating, logo or testimonial without a real source?
- [ ] Any control that does nothing, or nav pointing at something unbuilt?
- [ ] Any data surface missing empty / loading / error state?
- [ ] Horizontal overflow, text escaping its container, or <44px tap targets on mobile?
- [ ] Contrast below 4.5:1 body / 3:1 large text (measured, not eyeballed)?
- [ ] Keyboard path broken, invisible focus, or overlay that will not close on Escape?
- [ ] Delivered without running it, or without a recorded click-through per control?
- [ ] Any feature injected by a script rewriting source or CSS?
- [ ] Any TODO / stub / `pass` / NotImplemented on a path claimed to work?
- [ ] Any import that is not in the lockfile and not in its registry?
- [ ] Em dash in copy we ship, or in agent-written prose for this deliverable?

## Block 2 — Defaults (technique allowed, reason required)

- [ ] Gradients, glow, glass or blur used as a default with no stated purpose?
- [ ] A typeface that was never chosen (Inter/Geist/Roboto), or one family at one weight?
- [ ] Decorative icons (sparkle/zap/shield/check/arrow-on-every-CTA) or emoji as feature icons?
- [ ] Three-equal-card row, bento-as-reflex, eyebrow on every section, 01/02/03 markers?
- [ ] `transition-all`, `hover:scale-105`, bounce easing, or universal scroll fade-up?
- [ ] Any Tier B pattern used without naming the identity motif that makes it ours?

## Block 3 — Convention locks

- [ ] Does the diff match the surrounding code: naming, comments, idiom?
- [ ] Is this the smallest change that passes the acceptance test?
- [ ] Did anything get written twice instead of reused?
- [ ] Did a repeated review comment become an invariant in `tools/invariants/`?
- [ ] Are the acceptance criteria and the why recorded with the diff?

## Block 4 — Gate output

```
$ python tools/slop_gate.py --ci
<paste: PASS/FAIL + counts>
$ python tools/registry_audit.py --ci
<paste: PASS/FAIL + counts>
```
