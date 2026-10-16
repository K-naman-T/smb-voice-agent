# P2 acoustic call-path measurement — real numbers

Generated 2026-09-25T18:11:56.228236+00:00 from artifacts pulled from `chomp` (`/home/knamant/p2-probe/artifacts`). Every value below is copied out of a `summary.json` produced by a probe run on that host. No value is estimated, extrapolated or carried over from any document.

## The number that was asked for

| configuration | calls | ttfa_stream p50 / p95 | ttfa_tools p50 / p95 | warm llm_ttft p50 / p95 |
|---|---|---|---|---|
| A · CUDA STT + Piper CLI (as implemented today) | 10 + 6 | 1,843ms / 2,040ms | 3,533ms / 3,740ms | 306ms / 320ms |
| B · CUDA STT + Piper in-process (proposed fix) | 10 + 6 | 1,077ms / 1,327ms | 2,559ms / 2,659ms | 338ms / 416ms |
| C · CPU STT + Piper CLI (no GPU for STT) | 10 + 6 | 2,600ms / 2,810ms | 4,221ms / 4,359ms | 305ms / 317ms |

SLO ceilings from `docs/ENGINEERING_PLAN_v2.md` §2.13: ttfa_stream p50 ≤ 1600 ms, p95 ≤ 2800 ms · ttfa_tools p50 ≤ 2500 ms, p95 ≤ 4500 ms · warm llm_ttft p50 ≤ 500 ms, p95 ≤ 800 ms.

## Component breakdown (where the time actually goes)

| configuration | STT p50 | llm_ttft p50 | first sentence ready @EOU p50 | TTS first PCM p50 | ttfa p50 |
|---|---|---|---|---|---|
| A · CUDA STT + Piper CLI (as implemented today) | 176ms | 306ms | 846ms | 970ms | 1,843ms |
| B · CUDA STT + Piper in-process (proposed fix) | 234ms | 338ms | 955ms | 136ms | 1,077ms |
| C · CPU STT + Piper CLI (no GPU for STT) | 973ms | 305ms | 1,628ms | 980ms | 2,600ms |

## SLO verdicts, per configuration

| configuration | stream p50 ≤1600 | stream p95 ≤2800 | tools p50 ≤2500 | tools p95 ≤4500 | llm_ttft ≤500/≤800 | VRAM ≤7.2 GB |
|---|---|---|---|---|---|---|
| A · CUDA STT + Piper CLI (as implemented today) | FAIL | PASS | FAIL | PASS | PASS / PASS | 5,695 MiB PASS |
| B · CUDA STT + Piper in-process (proposed fix) | PASS | PASS | FAIL | PASS | PASS / PASS | 5,695 MiB PASS |
| C · CPU STT + Piper CLI (no GPU for STT) | FAIL | FAIL | FAIL | PASS | PASS / PASS | 5,226 MiB PASS |

## TTS leg: the single biggest cost, measured three ways

| path | time to first audio |
|---|---|
| A · CUDA STT + Piper CLI (as implemented today): Piper CLI, whole file | 966ms |
| A · CUDA STT + Piper CLI (as implemented today): Piper CLI, first PCM byte | 950ms |
| B · CUDA STT + Piper in-process (proposed fix): Piper CLI, whole file | 1,168ms |
| B · CUDA STT + Piper in-process (proposed fix): Piper CLI, first PCM byte | 1,138ms |
| B · CUDA STT + Piper in-process (proposed fix): in-process PiperVoice, first PCM (after 892ms one-time load) | 105ms |
| C · CPU STT + Piper CLI (no GPU for STT): Piper CLI, whole file | 984ms |
| C · CPU STT + Piper CLI (no GPU for STT): Piper CLI, first PCM byte | 953ms |

## Real human speech through the STT leg (grounding, not synthetic)

| configuration | utterance audio | STT | transcript |
|---|---|---|---|
| A | 6,784ms | 210ms | I have been actually thinking about this a lot quite actua |
| A | 6,379ms | 186ms | What are you even trying to say my boy? |
| A | 6,848ms | 168ms | What is even going on? |
| A | 5,376ms | 188ms | Tomorrow is a new day, right? |
| A | 3,349ms | 177ms | I've been thinking very much about this |
| A | 4,053ms | 202ms | If you would have told him yesterday, it wouldn't have hap |
| B | 6,784ms | 223ms | I have been actually thinking about this a lot quite actua |
| B | 6,379ms | 220ms | What are you even trying to say my boy? |
| B | 6,848ms | 186ms | What is even going on? |
| B | 5,376ms | 193ms | Tomorrow is a new day, right? |
| B | 3,349ms | 199ms | I've been thinking very much about this |
| B | 4,053ms | 214ms | If you would have told him yesterday, it wouldn't have hap |
| C | 6,784ms | 1,031ms | I have been actually thinking about this a lot quite actua |
| C | 6,379ms | 999ms | What are you even trying to say my boy? |
| C | 6,848ms | 943ms | What is even going on? |
| C | 5,376ms | 962ms | Tomorrow is a new day, right? |
| C | 3,349ms | 972ms | I have been thinking very much about this. |
| C | 4,053ms | 1,065ms | If you would have told him yesterday, it wouldn't have hap |

## Cold start, EOU window, barge-in, VRAM

**A · CUDA STT + Piper CLI (as implemented today)**
- cold: llm warmup 105ms → warm 70ms; STT cold 2,344ms → warm 156ms
- EOU silence window applied per turn: 450ms (silence_ms balanced, §2.13)
- barge: llama-server abort-close 0ms, slot reusable after 179ms
- peak VRAM 5,695 MiB of 8188 MiB
- sentence-aggregator sweep (ttfa p50/p95): 100_400: 1,722ms/1,867ms · 60_200: 1,690ms/1,780ms · 40_120: 1,598ms/1,661ms

**B · CUDA STT + Piper in-process (proposed fix)**
- cold: llm warmup 151ms → warm 85ms; STT cold 3,137ms → warm 163ms
- EOU silence window applied per turn: 450ms (silence_ms balanced, §2.13)
- barge: llama-server abort-close 0ms, slot reusable after 199ms
- peak VRAM 5,695 MiB of 8188 MiB
- sentence-aggregator sweep (ttfa p50/p95): 100_400: 1,033ms/1,116ms · 60_200: 911ms/962ms · 40_120: 772ms/898ms

**C · CPU STT + Piper CLI (no GPU for STT)**
- cold: llm warmup 102ms → warm 64ms; STT cold 2,764ms → warm 884ms
- EOU silence window applied per turn: 450ms (silence_ms balanced, §2.13)
- barge: llama-server abort-close 0ms, slot reusable after 183ms
- peak VRAM 5,226 MiB of 8188 MiB
