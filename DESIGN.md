# Acoustic Machine Console — Design System & Philosophy (§v2.0)

> *"Eliminate AI slop. Build high-density, tactile hardware instruments for software operators."*

## 1. Core Philosophy: The Anti-Slop Manifesto

Most AI interfaces suffer from **AI Slop Syndrome**:
- Meaningless pastel purple gradients and floaty glassmorphism.
- Vast, barren whitespace pretending to be "clean minimalism."
- Generic circular avatars and generic icons filling arbitrary card grids.
- Lack of tactile feedback, zero domain relevance to audio/telephony, and zero technical density.

The **SMB Voice Agent Control Console** rejects this in favor of **Industrial Acoustic Telephony**:
Inspired by Teenage Engineering (OP-1, Field series, EP-133), Braun audio equipment (Dieter Rams), and modular synthesizer patchbays.

---

## 2. Aesthetic Pillars

### 2.1 Tactility & Mechanical Feel
- **Depress Mechanics:** Interactive buttons physically displace on click (`active:translate-y-[1.5px]` with micro `box-shadow` shifts).
- **Sonic Micro-Feedback:** Subtle, synthesized Web Audio API clicks (sine/noise transient bursts, zero network latency) when toggling switches or triggering actions.
- **Machined Bezels & Inset Displays:** Recessed displays with inner borders (`inset 0 1px 2px rgba(0,0,0,0.6)`), anodized matte finishes, and CNC-styled fastener accents.

### 2.2 Functional High-Density Information
- High-density bento rack layout: Every pixel conveys state, telemetry, or functional control.
- Clear technical hierarchies: Monospace metrics (`font-mono`), uppercase micro-labels (`tracking-widest text-[9px]`), and distinct operational zones.

### 2.3 Audio-Native Instrumentation
- **Oscilloscope & Spectrogram Waveform:** Live canvas visualizer reacting to caller and agent acoustic signals.
- **Signal Peak Meter (VU Meter):** Multi-segment LED bar graph indicating line levels and audio throughput.
- **Hardware Patch Architecture:** Visual SVG schematic showing the pipeline from Inbound SIP/OPUS to Local LLM (RTX 4060) to deterministic SQLite slot persistence.

---

## 3. Color & Materials Palette

| Token | Hex / Value | Purpose |
| :--- | :--- | :--- |
| **Chassis Obsidian** | `#0b0d13` | Deep non-reflective chassis backplate |
| **Module Slate** | `#141722` | Machined module faceplate |
| **Bezel Border** | `rgba(255, 255, 255, 0.08)` | Chamfered edge highlight |
| **Recessed Screen** | `#08090e` | High-contrast instrument display |
| **Signal Orange** | `#ff5722` | High-priority triggers, record/live states |
| **Phosphor Green** | `#10b981` | Certified gates, online telemetry, VU nominal |
| **Cyber Amber** | `#f59e0b` | Warnings, intermediate acoustic evaluation |
| **Signal Cobalt** | `#3b82f6` | Telephony channel, tool execution calls |
| **Ghost Monospace** | `rgba(255, 255, 255, 0.45)` | Secondary engineering metadata |

---

## 4. Typography & Display Standards

- **Numbers & Telemetry:** Monospaced (`font-mono`, tabular figures `tabular-nums`).
- **Section Headers:** Tight, mechanical grotesque typography (`tracking-tight font-bold`).
- **Engineering Badges:** Micro-labels with wide letter spacing (`text-[9px] uppercase tracking-[0.2em] font-semibold`).

---

## 5. Interaction Patterns

1. **Preset Matrix:** Instant acoustic stress scenarios with immediate pipeline stimulation.
2. **Deterministic Certification:** Seed-by-seed adversarial playback with real-time pass/fail LED arrays.
3. **Interactive Telephony Reel:** Audio simulator with real-time TTFA timer, tool-call trace inspection, and synthesized wave activity.
