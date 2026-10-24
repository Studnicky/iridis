---
"@studnicky/iridis": minor
"@studnicky/iridis-contrast": patch
---

Contrast repair, feasibility proofs, and the color-vision search measure candidates as plain numeric coordinates, build validated color records only for selected results, and skip CVD candidates outside the mover’s authored lightness and chroma ranges. `ColorCoordinate` is exported from `@studnicky/iridis/math`.

`HueIntervalBounds` is exported from `@studnicky/iridis/math` for conservative emitted-sRGB luminance and APCA bounds over non-wrapping OKLCH hue arcs, and `RoleGeometry` is exported from `@studnicky/iridis/tasks` for consumers that apply the engine’s canonical hue-target clamp.
