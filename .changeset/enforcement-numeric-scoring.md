---
"@studnicky/iridis": minor
"@studnicky/iridis-contrast": patch
---

Contrast repair, feasibility proofs and the color-vision search measure candidates as plain numeric coordinates and build a validated color record only for the selected result, and the CVD search skips candidates outside the mover's authored lightness and chroma range before scoring them. The resolved palette and report are identical; the slowest solves run in a fraction of the time, and `ColorCoordinate` is exported from `@studnicky/iridis/math`.

``HueIntervalBounds`is exported from`@studnicky/iridis/math` for conservative emitted-sRGB luminance bounds over non-wrapping OKLCH hue arcs.

RoleGeometry`is exported from`@studnicky/iridis/tasks` for consumers that must apply the engine's canonical hue-target clamp.
