# @studnicky/iridis-capacitor

Emits Capacitor StatusBar configuration, Material colour map, SplashScreen
background, and an Android `colors.xml` resource fragment from resolved roles.
The plugin's StatusBar style picker reads `luminance` of the text/surface roles
so the bar icons stay legible in both framings.

Native Android / iOS surfaces are sRGB-only at the OS level — the platform
APIs do not accept CSS Color 4 `color(display-p3 ...)` strings. The plugin
therefore reads `record.rgb` / `record.hex` (the gamut-mapped sRGB
representation) everywhere it serialises. Wide-gamut input is preserved on
the record for other plugins (`@studnicky/iridis-stylesheet`,
`@studnicky/iridis-vscode`, `@studnicky/iridis-tailwind`,
`@studnicky/iridis-rdf`) but does not surface here.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-capacitor
```

## Usage

```ts
import { Engine, coreTasks } from '@studnicky/iridis';
import { capacitorPlugin }   from '@studnicky/iridis-capacitor';

const engine = new Engine();
for (const task of coreTasks) engine.tasks.register(task);
engine.adopt(capacitorPlugin);

engine.pipeline([
  'intake:any',
  'expand:family',
  'resolve:roles',
  'enforce:contrast',
  'derive:variant',
  'emit:capacitorStatusBar',
  'emit:capacitorTheme',
  'emit:capacitorSplashScreen',
  'emit:androidThemeXml',
]);

const state = await engine.run({
  'colors':   ['#8B5CF6'],
  'roles':    yourRoleSchema,
  'contrast': { 'level': 'AA' },
  'metadata': { 'themeName': 'music' },
});

const out = state.outputs['capacitor']!;
// out.statusBar       : { backgroundColor: '#...', style: 'DARK' | 'LIGHT', overlay: boolean }
// out.theme           : { primary, primaryDark, accent, background, surface, error, ... }
// out.splashScreen    : { backgroundColor: '#...', androidSplashResourceName?: string }
// out.androidThemeXml : '<?xml version="1.0" encoding="utf-8"?><resources>...</resources>'
```

## Tasks

| Name | Output slot | Notes |
|---|---|---|
| `emit:capacitorStatusBar` | `outputs.capacitor.statusBar` | Reads `roles.topBar` / `roles.surface`, picks `DARK` / `LIGHT` style from the text-or-bar luminance. Honors `metadata.capacitor.statusBarOverlay`. |
| `emit:capacitorTheme` | `outputs.capacitor.theme` | Material-style colour map: primary / primaryDark / accent / background / surface / error / warning / success / info / text / textOnPrimary / textOnAccent. |
| `emit:capacitorSplashScreen` | `outputs.capacitor.splashScreen` | Honors `metadata.capacitor.splashRole` and `metadata.capacitor.androidSplashResourceName`. |
| `emit:androidThemeXml` | `outputs.capacitor.androidThemeXml` | Ready-to-write XML for `android/app/src/main/res/values/colors.xml`. |

Write `out.statusBar.backgroundColor` and `out.statusBar.style` directly into
the Capacitor `StatusBar.setBackgroundColor` / `StatusBar.setStyle` calls.
Write `out.androidThemeXml` to disk to ship native Android theme tokens.

Part of [iridis](https://github.com/Studnicky/iridis).
