import { writeFileSync } from 'node:fs';

import { DefaultThemeCss } from '../theme/DefaultThemeCss.ts';

/** Writes the optional static default-theme snapshot to its canonical site path. */
export class GenerateDefaultTheme {
  static run(destination: URL = new URL('../assets/css/theme-default.css', import.meta.url)): void {
    writeFileSync(destination, DefaultThemeCss.generate(), 'utf8');
  }
}

if (import.meta.main) {GenerateDefaultTheme.run();}
