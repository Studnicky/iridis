import { coreTasks, Engine } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';

import { deriveRoleRelations } from '../theme/DeriveRoleRelations.ts';
import { deriveSemanticHues } from '../theme/DeriveSemanticHues.ts';
import { intakeHexHint } from '../theme/IntakeHexHint.ts';
import { pinDerivedRoles } from '../theme/PinDerivedRoles.ts';

/**
 * Bootstraps an Engine with the core tasks, the site's own role-resolution
 * tasks (hex-hint intake, semantic-hue derivation, derived-role pinning,
 * role-relation derivation), and the contrast plugin — the shared baseline
 * both the live palette pipeline (useIridis) and the export pipeline
 * (useMultiOutput) build on before adopting their own extra emit plugins.
 */
export function createColorEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks) {engine.tasks.register(t);}
  engine.tasks.register(intakeHexHint);
  engine.tasks.register(deriveSemanticHues);
  engine.tasks.register(pinDerivedRoles);
  engine.tasks.register(deriveRoleRelations);
  engine.adopt(contrastPlugin);
  return engine;
}
