import { coreTasks, Engine } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';

import { intakeHexHint } from '../theme/IntakeHexHint.ts';

/**
 * Bootstraps an Engine with the core tasks, the site's own role-resolution
 * hex-hint intake task and the contrast plugin — the shared baseline
 * every palette resolution builds on before adopting extra emit plugins.
 */
class CreateColorEngineOperation {
  static run(): Engine {
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      engine.tasks.register(coreTasks[index]!);
    }
    engine.tasks.register(intakeHexHint);
    engine.adopt(contrastPlugin);
    return engine;
  }
}

export const createColorEngine = CreateColorEngineOperation.run;
