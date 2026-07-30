# @studnicky/iridis-capacitor

Emits Capacitor StatusBar configuration, Material colour map, SplashScreen
background, and an Android `colors.xml` resource fragment from resolved roles.
The plugin's StatusBar style picker reads `luminance` of the text/surface roles
so the bar icons stay legible in both framings.

Native Android / iOS surfaces are sRGB-only at the OS level. The platform
APIs do not accept CSS Color 4 `color(display-p3 ...)` strings. The plugin
therefore reads `record.rgb` / `record.hex` (the gamut-mapped sRGB
representation) everywhere it serialises. Wide-gamut input is preserved on
the record for other plugins (`@studnicky/iridis-stylesheet`,
`@studnicky/iridis-vscode`, `@studnicky/iridis-tailwind`,
`@studnicky/iridis-rdf`) but does not surface here.

## Install

GitHub Packages requires a personal access token (classic) with
`read:packages`; the token's account must also have read access to this
package's repository. Expose the token as `NODE_AUTH_TOKEN`, then configure
the `@studnicky` scope before installing:

```ini
# ~/.npmrc
@studnicky:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
npm install @studnicky/iridis @studnicky/iridis-capacitor
```

## Usage

```ts
import type { RoleSchemaInterfaceType } from '@studnicky/iridis';

import { Engine, coreTasks } from '@studnicky/iridis';
import { capacitorPlugin }   from '@studnicky/iridis-capacitor';

export function generateCapacitorTheme(roleSchema: RoleSchemaInterfaceType) {
  const engine = new Engine();
  for (const task of coreTasks) engine.tasks.register(task);
  engine.adopt(capacitorPlugin);

  engine.pipeline([
    'intake:any',
    'resolve:roles',
    'expand:family',
    'enforce:contrast',
    'derive:variant',
    'emit:capacitorStatusBar',
    'emit:capacitorTheme',
    'emit:capacitorSplashScreen',
    'emit:androidThemeXml',
  ]);

  const state = engine.run({
    'bypass':   undefined,
    'colors':   ['#8B5CF6'],
    'contrast': {
      'algorithm':  'wcag21',
      'cvdCorrect': undefined,
      'extra':      undefined,
      'level':      'AA',
    },
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  { 'themeName': 'music' },
    'roles':     roleSchema,
    'runtime':   undefined,
  });

  const statusBar       = state.outputs['capacitor:statusBar']!;
  const theme           = state.outputs['capacitor:theme']!;
  const splashScreen    = state.outputs['capacitor:splashScreen']!;
  const androidThemeXml = state.outputs['capacitor:androidThemeXml']!;
  // statusBar       : { backgroundColor: '#...', style: 'DARK' | 'LIGHT', overlay: boolean }
  // theme           : { primary, primaryDark, accent, background, surface, error, ... }
  // splashScreen    : { backgroundColor: '#...', androidSplashResourceName?: string }
  // androidThemeXml : '<?xml version="1.0" encoding="utf-8"?><resources>...</resources>'

  return { androidThemeXml, splashScreen, statusBar, theme };
}
```

## Tasks

| Name | Output slot | Notes |
|---|---|---|
| `emit:capacitorStatusBar` | `outputs['capacitor:statusBar']` | Reads `roles.topBar` / `roles.surface`, picks `DARK` / `LIGHT` style from the text-or-bar luminance. Honors `metadata.capacitor.statusBarOverlay`. |
| `emit:capacitorTheme` | `outputs['capacitor:theme']` | Material-style colour map: primary / primaryDark / accent / background / surface / error / warning / success / info / text / textOnPrimary / textOnAccent. |
| `emit:capacitorSplashScreen` | `outputs['capacitor:splashScreen']` | Honors `metadata.capacitor.splashRole` and `metadata.capacitor.androidSplashResourceName`. |
| `emit:androidThemeXml` | `outputs['capacitor:androidThemeXml']` | Ready-to-write XML for `android/app/src/main/res/values/colors.xml`. |

Write `statusBar.backgroundColor` and `statusBar.style` directly into
the Capacitor `StatusBar.setBackgroundColor` / `StatusBar.setStyle` calls.
Write `androidThemeXml` to disk to ship native Android theme tokens.

Part of [iridis](https://github.com/Studnicky/iridis).
