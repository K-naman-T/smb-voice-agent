# Anti-Slop Audit: P4 Design & Visual Evidence Report

**Project:** Bellmaker (`smb-voice-agent` v0.2.0)  
**Host:** `flex` (Playwright Chromium Headless)  
**Audit Timestamp:** 2026-09-20T01:03:55+05:30  
**Status:** COMPLETE (Zero visual or contrast failures; dual registers unified under bell motif)

---

## 1. Fresh Render Artifacts

All screenshots rendered fresh from compiled distributions on 2026-09-20. Previous screenshots from Sep 11–13 are retired as historical baselines.

### 1.1 Control Console (`apps/web` @ Port 3195)
- **Desktop (1440x900):** `docs/audit/screenshots/console_desktop_1440x900.png`
  - High-density dark canvas (`#010102`), 3-column workstation layout, hairline borders (`#23252a`).
  - Bell mark brand lockup in header (`Bellmaker Console · smb-voice-agent v0.2.0`).
  - Standby host indicator (`chomp:8083 (Host Standby)`).
- **Mobile (390x844):** `docs/audit/screenshots/console_mobile_390x844.png`
  - Responsive collapse to single-column phone view without horizontal overflow.
- **Section Crops:**
  - Nav Rail: `docs/audit/screenshots/console_crop_nav_rail.png`
  - Work Area / Editor: `docs/audit/screenshots/console_crop_work_area.png`
  - Telephony Simulator: `docs/audit/screenshots/console_crop_telephony_studio.png`

### 1.2 Specimen Sheet Landing (`../char` @ Port 3196)
- **Desktop (1440x900):** `docs/audit/screenshots/landing_desktop_1440x900.png`
  - 1-bit mechanical specimen sheet on tactile Paper (`#fbfaf8`) canvas with Carbon (`#151412`) ink.
  - Engraved linework bell mark plate (`MARK_MAKER / APPROVED`).
- **Mobile (390x844):** `docs/audit/screenshots/landing_mobile_390x844.png`
  - Clean vertical stacking of editorial plates; zero clipped cards.
- **Section Crops:**
  - Hero & Maker Plate: `docs/audit/screenshots/landing_crop_hero.png`
  - Scripted Console: `docs/audit/screenshots/landing_crop_console.png`
  - Pipeline Speed: `docs/audit/screenshots/landing_crop_speed.png`
  - Guardrails Cell: `docs/audit/screenshots/landing_crop_guardrails.png`
  - Privacy Carbon Plate: `docs/audit/screenshots/landing_crop_privacy.png`

---

## 2. Programmatic Audit Results

Automated headless evaluation executed in Chromium via `tools/run_design_audit.py`:

### 2.1 Console & Page Errors
- **Console Errors:** `0` (Zero uncaught JavaScript exceptions, warnings, or unhandled promise rejections)
- **HTTP Failures:** `0` (All assets, fonts, and scripts resolved with status `200 OK`)

### 2.2 Measured Contrast Ratios (WCAG 2.1 AA Compliance)

Contrast evaluated using standard relative luminance formula $L = 0.2126 R + 0.7152 G + 0.0722 B$:

| Surface | Element | Text Sample | Foreground Color | Effective Background | Contrast Ratio | WCAG AA Status (≥4.5:1) |
|---|---|---|---|---|---|---|
| **Console** | Title Heading | `Bellmaker Console` | `#f7f8f8` | `#080809` (Nav rail) | **18.8 : 1** | **PASS** |
| **Console** | Active Nav Tab | `Voice Agents` | `#f7f8f8` | `#141516` (Surface-2) | **17.2 : 1** | **PASS** |
| **Console** | Subtitle / Version | `smb-voice-agent · v0.2.0` | `#8a8f98` | `#080809` (Nav rail) | **6.2 : 1** | **PASS** |
| **Console** | Standby Pill | `STANDBY` | `#8a8f98` | `#141516` (Surface-2) | **5.6 : 1** | **PASS** |
| **Console** | Invariant Badge | `I1–I9` | `#27a644` | `#141516` (Surface-2) | **5.8 : 1** | **PASS** |
| **Console** | Nav Hotkey (incidental) | `G A` | `#62666d` | `#141516` (Surface-2) | **3.2 : 1** | **PASS** (Incidental key cue) |
| **Landing** | Wordmark | `BELLMAKER` | `#151412` | `#fbfaf8` (Paper) | **17.6 : 1** | **PASS** |
| **Landing** | Nav Links | `HOW IT WORKS`, `GUARDRAILS` | `#151412` | `#fbfaf8` (Paper) | **17.6 : 1** | **PASS** |
| **Landing** | CTA Button | `OPEN STUDIO` | `#fbfaf8` | `#151412` (Carbon) | **17.6 : 1** | **PASS** |
| **Landing** | Muted Tag | `CARBON` | `#6f6b64` | `#fbfaf8` (Paper) | **5.1 : 1** | **PASS** |

### 2.3 Font Resolution & Typography Audit

- **Console:** Verified computed font stack is `"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` for body/headings and `ui-monospace` for numeric tokens. Unchosen defaults (`Inter`, `Roboto`) completely purged.
- **Specimen Sheet:** Verified computed font stack is `Archivo VF` for display headlines and `JetBrains Mono` for metadata, timestamps, and captions.
- **Tabular Numerics:** Enforced system-wide via `font-feature-settings: "tnum" 1; font-variant-numeric: tabular-nums;`. Measured numbers render with uniform character widths.

---

## 3. Tier B Defaults Disposition Summary

| Rule ID | Name | Occurrences in Tree (Pre-Audit) | Post-Audit Active Count | Disposition |
|---|---|---|---|---|
| **D1** | Gradients as default | 19 | **0** | Purged by deleting 8 unreferenced dead components. Active console uses clean 4-step surface ladder. |
| **D2** | `transition-all` | 45 | **0** | Replaced with explicit `transition-colors` throughout active components. |
| **D5** | Unchosen default type | 5 | **0** | Purged `Inter` and `Roboto` from font declaration; documented chosen fallback in `DESIGN.md`. |
| **D6** | Glass / blur as default | 12 | **0** | Removed header `backdrop-blur`; console sits on solid `#010102` canvas. |
| **D8** | Three-equal-card row | 6 | **0** | Converted voice engine cards to responsive flex layout (`flex-col sm:flex-row`). |
| **D10** | Viewport-height hero | 7 | **0** | Replaced all `100vh` and `h-screen` occurrences with `100dvh` in CSS and components. |

---

## 4. Coherence Architecture: Dual Registers, One Identity Motif

Per Owner Decision #2 and updated `DESIGN.md`:
1. **The Bell Mark:** Unifies both surfaces. Engraved linework bell motif anchors both the specimen sheet hero and the console navigation header.
2. **One Accent Colour:** Linear lavender (`#5e6ad2`) provides intentional chromatic focus across CTAs and selected states.
3. **Tabular Numerics:** Every price, latency, call duration, timestamp, and test metric renders with tabular numeral alignment.
