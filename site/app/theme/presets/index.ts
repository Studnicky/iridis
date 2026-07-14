/**
 * Composition root — every theme adapter registers here, plain data, no
 * per-theme branching. Add a theme by writing its `.ts` (this file) and `.css`
 * (see ./presets.css) adapter pair and listing both here; nothing else
 * changes (the theme-switcher UI and font loading both derive from THEMES).
 */
import { futuristic } from './futuristic.ts';
import { dayAtWork } from './dayAtWork.ts';
import { startup } from './startup.ts';
import { formal } from './formal.ts';
import { backroads } from './backroads.ts';
import { arcade } from './arcade.ts';
import { hackerman } from './hackerman.ts';
import { girlypop } from './girlypop.ts';
import { romance } from './romance.ts';
import { streamer } from './streamer.ts';
import { gallery } from './gallery.ts';
import { restaurant } from './restaurant.ts';

import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

export const THEMES: Record<string, ThemeDefinitionInterfaceType> = {
  [futuristic.key]: futuristic,
  [dayAtWork.key]:  dayAtWork,
  [startup.key]:    startup,
  [formal.key]:     formal,
  [backroads.key]:  backroads,
  [arcade.key]:     arcade,
  [hackerman.key]:  hackerman,
  [girlypop.key]:   girlypop,
  [romance.key]:    romance,
  [streamer.key]:   streamer,
  [gallery.key]:    gallery,
  [restaurant.key]: restaurant
};
