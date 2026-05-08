# @studnicky/iridis-capacitor

Emits StatusBar config, theme map, SplashScreen background, and Android `themes.xml` fragment for Capacitor apps.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-capacitor
```

## Usage

```ts
import { engine } from '@studnicky/iridis';
import { capacitorPlugin } from '@studnicky/iridis-capacitor';

engine.adopt(capacitorPlugin);
engine.pipeline(['intake:any', 'resolve:roles', 'emit:capacitor']);

const state = await engine.run({
  colors: ['#8B5CF6'],
  roles: yourRoleSchema,
});

const config = state.outputs.capacitor;
// config.statusBar: { style: 'dark', backgroundColor: '#...' }
// config.splashScreen: { backgroundColor: '#...' }
// config.android.themesXml: '<resources>...</resources>'
```

The plugin generates native configuration for Capacitor's StatusBar, theme color map, SplashScreen, and Android Material Themes. Write outputs to `capacitor.config.ts`, `themes.xml`, and app resources.

Part of [iridis](https://github.com/Studnicky/iridis).
