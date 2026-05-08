# Vue + Capacitor Example

Demonstrates the iridis pipeline producing a W3C-conformant palette from a single seed hex colour and applying it to a Vue 3 component and Capacitor native chrome.

## Pipeline composition

```
seed hex (#8B5CF6)
  → Engine.run({ colors, roles: categoryW3cRoleSchema, contrast: AA })
      ↓
    wcag:enforce   — validates contrast pairs; adjusts lightness until all minRatio targets are met
      ↓
    emit:cssVars   — serialises resolved roles into CSS custom properties
      ↓
    emit:capacitor — calls Capacitor StatusBar.setBackgroundColorAsync with the accent role hex
```

## Role schema (`categoryW3cRoleSchema`)

Seven roles with WCAG 2.1 AA contrast enforcement:

| Role       | Intent  | Contrast requirement              |
|------------|---------|-----------------------------------|
| `canvas`   | base    | —                                 |
| `surface`  | surface | —                                 |
| `accent`   | accent  | `onAccent` on `accent` ≥ 4.5:1    |
| `onAccent` | text    | on `accent` ≥ 4.5:1               |
| `border`   | neutral | on `canvas` ≥ 3.0:1               |
| `muted`    | muted   | —                                 |
| `text`     | text    | on `canvas` ≥ 4.5:1, `surface` ≥ 4.5:1 |

## CSS output

Properties are scoped to `[data-category="music"]` and also written to `:root`:

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

## Pending plugin output

Three plugin imports in `categoryColorService.ts` are marked `@ts-expect-error` pending sibling agent delivery:

- `plugins/wcag` — contrast enforcement task
- `plugins/css-vars` — CSS variable emitter (task class exists at `plugins/css-vars/tasks/EmitCssVars.ts`, index.ts pending)
- `plugins/capacitor` — Capacitor native chrome adapter

Remove the `@ts-expect-error` directives once each plugin's `index.ts` is present.
