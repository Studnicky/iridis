# Vue + Capacitor Example

Demonstrates the iridis pipeline producing a W3C-conformant palette from a single seed hex colour and applying it to a Vue 3 component and Capacitor native chrome.

## Pipeline composition

```
seed hex (#8B5CF6)
  -> Engine.run({ colors, roles: categoryW3cRoleSchema, contrast: AAA + APCA + CVD correction })
       |
    enforce:wcagAA           (validates contrast pairs and reports any partial result)
       |
    enforce:wcagAAA / enforce:apca
       |
    enforce:cvdSimulate      (corrects CVD instability and reports unresolved warnings)
       |
    emit:cssVars             (writes state.outputs['stylesheet:cssVars'])
       |
    emit:capacitorStatusBar  (writes state.outputs['capacitor:statusBar'])
       |
    emit:capacitorTheme      (writes state.outputs['capacitor:theme'])
```

## Role schema (`categoryW3cRoleSchema`)

Seven roles with declared WCAG thresholds evaluated by the maximal contrast pipeline:

| Role       | Intent     | Contrast requirement                       |
|------------|------------|--------------------------------------------|
| `canvas`   | background | (no constraint)                            |
| `surface`  | background | (no constraint)                            |
| `accent`   | accent     | L 0.35–0.46, C 0.10–0.12; `onAccent` >= 7:1 |
| `onAccent` | text       | on `accent` >= 7:1                         |
| `border`   | generic    | on `canvas` >= 3.0:1                       |
| `muted`    | muted      | (no constraint)                            |
| `text`     | text       | L 0.10–0.23, C 0.08–0.09; on `canvas` and `surface` >= 7:1 |

## CSS output

Properties are scoped to `[data-category='music']`:

```css
[data-category='music'] {
  --c-canvas:    #e5e0fe;
  --c-surface:   #d2c9fb;
  --c-accent:    #5b4894;
  --c-on-accent: #fcfcfc;
  --c-border:    #8b5cf6;
  --c-muted:     #8b5cf6;
  --c-text:      #201042;
}
```

## Usage

```vue
<MusicCategoryView>
  <h1>Music</h1>
</MusicCategoryView>
```

`MusicCategoryView` calls `categoryColorService.apply('music', '#8B5CF6')` on mount. The AAA-strength schema resolves the accent to `#5b4894` and `onAccent` to `#fcfcfc`, producing approximately 7.31:1. The terminal `#201042` text reaches approximately 13.53:1 on canvas and 11.11:1 on surface. Final APCA magnitudes are Lc 86.50, 75.50, 83.71, and 50.58 for the four configured relations. The service reparses the emitted hex values and independently re-audits WCAG, APCA, and every CVD simulation, clamping each simulated linear channel before gamma encoding, before writing CSS. The returned `statusBar` value is ready for the Capacitor StatusBar API; `wcagAa`, `wcagAaa`, `apca`, and `cvd` expose terminal enforcement evidence.

Category names must be lowercase kebab-case identifiers. Invalid names and palettes that cannot meet every declared contrast threshold throw before a style element is created or updated.

## Plugin wiring

`categoryColorService.ts` adopts three first-party plugins:

- `@studnicky/iridis-contrast` (`enforce:wcagAA`, `enforce:wcagAAA`, `enforce:apca`, and corrective `enforce:cvdSimulate`)
- `@studnicky/iridis-stylesheet` (`emit:cssVars`)
- `@studnicky/iridis-capacitor` (`emit:capacitorStatusBar`, `emit:capacitorTheme`)

Each is published independently. Install only what your consumer needs.
