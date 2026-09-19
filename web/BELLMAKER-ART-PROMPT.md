# BELLMAKER — Art generation brief (for agy / Antigravity)

Art for the **OFY voice landing page** (`web/src/components/LandingPage.tsx`).
Output goes to: `web/public/assets/art/` (this repo).

Style = **1-bit black-ink Bayer dither** — the Nous/Hermes etched register:
pure dots on warm paper, no grayscale, no color, monumental, calm.

---

## How to run (important)

agy `-p` (print mode) has a **5-minute default timeout** — long jobs get killed mid-flight.
Run **one image per job**, with a raised timeout. Ready-to-run prompt files sit next to
this brief in `web/art-prompts/`:

```bash
cd /home/knamant/orca/workspaces/smb-voice-agent/char

# 1) The Bell  (~4 min, produces bell2.png)
agy --dangerously-skip-permissions --print-timeout 10m -p "$(cat web/art-prompts/bell.prompt.txt)"

# 2) The Bellmaker  (produces bellmaker2.png)
agy --dangerously-skip-permissions --print-timeout 10m -p "$(cat web/art-prompts/bellmaker.prompt.txt)"
```

Either command works from any agy session — including the one already running on this
machine.

The agent **must** do the dithering **with the script below** (not "imagine dithering") —
otherwise the texture comes out as irregular hatching instead of a true dot matrix.

The prompt text itself also lives below (SECTIONS 1 and 2) so this file is self-contained.

---

## SECTION 1 — the prompt: "The Bell"

TASK — one image, efficiently. Do NOT search the web; go straight to the steps.

STEP 1 — generate the base image:
A single monumental BELL: a bronze bell with crown loops hanging from a heavy wooden
beam; a coiled rope beside it; a small anvil and one pair of tongs at the base.
NO humans. Strong simple shapes, generous negative space at the top, plain white
background.

STEP 2 — convert with the Bayer dither script (see bottom of this file):
exactly TWO tones — ink `#151412` on warm paper `#FBFAF8`. No grayscale.
8x8 ordered Bayer, visible regular dot matrix. Final size ~896x1200 vertical.

STEP 3 — save to `web/public/assets/art/bell2.png`, then verify: valid PNG,
print dimensions, confirm only the two allowed tones are present.
Then finish — do not start other work.

---

## SECTION 2 — the prompt: "The Bellmaker"

TASK — one image, efficiently. Do NOT search the web; go straight to the steps.

STEP 1 — generate the base image:
A BELLMAKER rendered as a dark SILHOUETTE — a solid black craftsman shape, no facial
detail, no interior linework — standing beside the bell, one hand resting on it,
seen from the side, calm monumental posture. Strong simple shapes, generous negative
space at the top, plain white background.

STEP 2 — same Bayer dither script: ink `#151412` on warm paper `#FBFAF8`, 8x8 ordered
Bayer, visible dot matrix, ~896x1200 vertical.

STEP 3 — save to `web/public/assets/art/bellmaker2.png`, verify (valid PNG, two tones
only, print dimensions), then finish.

---

## The dither script (reference implementation — run it, don't re-derive it)

```python
from PIL import Image

BAYER8 = [
    [ 0, 32,  8, 40,  2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44,  4, 36, 14, 46,  6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [ 3, 35, 11, 43,  1, 33,  9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47,  7, 39, 13, 45,  5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
]

def dither(src, dst, size=(896, 1200)):
    ink, paper = (0x15, 0x14, 0x12), (0xFB, 0xFA, 0xF8)
    im = Image.open(src).convert("L")
    im.thumbnail(size, Image.LANCZOS)
    canvas = Image.new("L", size, 255)
    canvas.paste(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
    px, out = canvas.load(), Image.new("RGB", size)
    op = out.load()
    for y in range(size[1]):
        for x in range(size[0]):
            v = (px[x, y] / 255.0) * 64.0
            op[x, y] = ink if v <= BAYER8[y % 8][x % 8] else paper
    out.save(dst)
    print("saved", dst, out.size)
```

(Run it once per image. Dark pixels → ink dots; light pixels → paper. The dot matrix
must be regular and repeating — that is the whole look.)

---

## Reference / fallback

- `web/public/assets/art/bellmaker-plate.v1.png` — first attempt (single figure scene).
  Verdict: the **figure** is unusable (AI-mush anatomy), but the **bell portion crops
  clean** (~6/10) — keep as fallback material, never ship the full frame.
- Landing page palette (must match): paper `#FBFAF8`, ink `#151412`, accent green `#1B5E3C`.
