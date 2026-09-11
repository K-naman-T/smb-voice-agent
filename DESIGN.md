---
name: Vaani — ElevenLabs-inspired voice workspace
source: https://designkit.sh/getdesign/elevenlabs
source_method: getdesign.md extraction
adaptation: Product dashboard for a local-private SMB voice receptionist
---

# Design direction

Vaani uses the restraint and audio-native character of the ElevenLabs design system: a near-white canvas, warm stone surfaces, whisper-light display typography, pill controls, and extremely subtle layered shadows. This is an adaptation for an operator dashboard, not a direct page copy.

The memorable element is the living voice object: a quiet circular microphone surrounded by soft rings and a monochrome waveform. It signals that the agent is present without turning the product into a sci-fi control room.

## Tokens

- Canvas: `#fbfaf8`
- Primary surface: `#ffffff`
- Warm surface: `#f3f0ec`
- Featured surface: `#eae4dc`
- Ink: `#151412`
- Muted ink: `#716d67`
- Hairline: `rgba(45, 39, 32, 0.11)`
- Success: `#267358`
- Display: Archivo, condensed width, weight 300–400
- Interface: Manrope, weight 400–700
- Card radius: 18px; featured radius: 24px; actions: full pills
- Shadow: multiple warm layers below 0.1 opacity

## Hierarchy

1. Business outcome and live-agent status
2. Test-call action
3. Call outcomes and readiness
4. Configuration and technical detail

## Component rules

- One black primary action per local region; secondary actions are warm-white or outline pills.
- Cards are defined by hairlines and warm low-opacity shadows, never heavy elevation.
- Large headings are light, condensed, and tightly tracked. UI copy stays compact and plain.
- Green is reserved for live, safe, complete, and private states.
- Avoid gradients, neon glows, glass panels, and dense telemetry on primary workflows.
- Engineering detail remains available but does not compete with the business-owner view.

## Responsive behavior

- Desktop: fixed 248px navigation, broad content canvas, two-column configuration with sticky preview.
- Tablet: off-canvas navigation and single-column editor.
- Mobile: compact top bar, stacked metrics, simplified call rows, full-width controls.

## Attribution

Derived from the public ElevenLabs DESIGN.md extraction published by designkit/getdesign. Original design-system analysis is attributed in that source to `VoltAgent/awesome-design-md` under MIT. Product structure, copy, hierarchy, and implementation are original to this project.
