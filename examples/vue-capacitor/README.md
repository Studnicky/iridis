# Vue + Capacitor Example

Demonstrates the iridis pipeline producing a W3C-conformant palette from a single seed hex colour and applying it to a Vue 3 component and Capacitor native chrome.

## Pipeline composition

```
seed hex (#8B5CF6)
  -> Engine.run({ colors, roles: categoryW3cRoleSchema, contrast: AA })
       |
    enforce:wcagAA           (validates contrast pairs; lifts lightness until every minRatio is met)
       |
    emit:cssVars             (serialises resolved roles into CSS custom properties)
       |
    emit:capacitorStatusBar  (writes StatusBar backgroundColor + style for Capacitor consumption)
       |
    emit:capacitorTheme      (writes theme map for native chrome)
```

## Role schema (`categoryW3cRoleSchema`)

Seven roles with WCAG 2.1 AA contrast enforcement:

| Role       | Intent  | Contrast requirement                   |
|------------|---------|----------------------------------------|
| `canvas`   | base    | (no constraint)                        |
| `surface`  | surface | (no constraint)                        |
| `accent`   | accent  | `onAccent` on `accent` >= 4.5:1        |
| `onAccent` | text    | on `accent` >= 4.5:1                   |
| `border`   | neutral | on `canvas` >= 3.0:1                   |
| `muted`    | muted   | (no constraint)                        |
| `text`     | text    | on `canvas` >= 4.5:1, `surface` >= 4.5:1 |

## CSS output

Properties are scoped to `[data-category="music"]`:

```css
[data-category="music"] {
  --c-canvas:    #f5f3ff;
  --c-surface:   #ede9fe;
  --c-accent:    #8B5CF6;
  --c-on-accent: #ffffff;
  --c-border:    #a78bfa;
  --c-muted:     #7c3aed;
  --c-text:      #1e1b4b;
}
```

## Usage

```vue
<MusicCategoryView>
  <h1>Music</h1>
</MusicCategoryView>
```

`MusicCategoryView` calls `categoryColorService.apply('music', '#8B5CF6')` on mount, populating all CSS variables and setting the Capacitor StatusBar tint automatically.

## Plugin wiring

`categoryColorService.ts` adopts three first-party plugins:

- `@studnicky/iridis-contrast` (`enforce:wcagAA`)
- `@studnicky/iridis-stylesheet` (`emit:cssVars`)
- `@studnicky/iridis-capacitor` (`emit:capacitorStatusBar`, `emit:capacitorTheme`)

Each is published independently. Install only what your consumer needs.
