import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

import { arcade } from './arcade.ts';
import { backroads } from './backroads.ts';
import { dayAtWork } from './dayAtWork.ts';
import { formal } from './formal.ts';
/**
 * Composition root — every theme adapter registers here, plain data, no
 * per-theme branching. Add a theme by writing its `.ts` (this file) and `.css`
 * (see ./presets.css) adapter pair and listing both here; nothing else
 * changes (the theme-switcher UI and font loading both derive from THEMES).
 */
import { futuristic } from './futuristic.ts';
import { gallery } from './gallery.ts';
import { girlypop } from './girlypop.ts';
import { hackerman } from './hackerman.ts';
import { restaurant } from './restaurant.ts';
import { romance } from './romance.ts';
import { startup } from './startup.ts';
import { streamer } from './streamer.ts';

export const THEMES: Record<string, ThemeDefinitionInterfaceType> = {};
THEMES[arcade.key] = arcade;
THEMES[backroads.key] = backroads;
THEMES[dayAtWork.key] = dayAtWork;
THEMES[formal.key] = formal;
THEMES[futuristic.key] = futuristic;
THEMES[gallery.key] = gallery;
THEMES[girlypop.key] = girlypop;
THEMES[hackerman.key] = hackerman;
THEMES[restaurant.key] = restaurant;
THEMES[romance.key] = romance;
THEMES[startup.key] = startup;
THEMES[streamer.key] = streamer;
