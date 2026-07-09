import type { TaskInterface } from '../types/index.ts';

export { clampCount }        from './clamp/ClampCount.ts';
export { clampOklch }        from './clamp/ClampOklch.ts';
export { deriveVariant }     from './derive/DeriveVariant.ts';
export { emitJson }          from './emit/EmitJson.ts';
export { enforceContrast }   from './enforce/EnforceContrast.ts';
export { expandFamily }      from './expand/ExpandFamily.ts';
export { intakeAny }         from './intake/IntakeAny.ts';
export { intakeHex }         from './intake/IntakeHex.ts';
export { intakeHsl }         from './intake/IntakeHsl.ts';
export { intakeImagePixels } from './intake/IntakeImagePixels.ts';
export { intakeLab }         from './intake/IntakeLab.ts';
export { intakeNamed }       from './intake/IntakeNamed.ts';
export { intakeOklch }       from './intake/IntakeOklch.ts';
export { intakeP3 }          from './intake/IntakeP3.ts';
export { intakeRgb }         from './intake/IntakeRgb.ts';
export { resolveRoles }      from './resolve/ResolveRoles.ts';

import { clampCount }        from './clamp/ClampCount.ts';
import { clampOklch }        from './clamp/ClampOklch.ts';
import { deriveVariant }     from './derive/DeriveVariant.ts';
import { emitJson }          from './emit/EmitJson.ts';
import { enforceContrast }   from './enforce/EnforceContrast.ts';
import { expandFamily }      from './expand/ExpandFamily.ts';
import { intakeAny }         from './intake/IntakeAny.ts';
import { intakeHex }         from './intake/IntakeHex.ts';
import { intakeHsl }         from './intake/IntakeHsl.ts';
import { intakeImagePixels } from './intake/IntakeImagePixels.ts';
import { intakeLab }         from './intake/IntakeLab.ts';
import { intakeNamed }       from './intake/IntakeNamed.ts';
import { intakeOklch }       from './intake/IntakeOklch.ts';
import { intakeP3 }          from './intake/IntakeP3.ts';
import { intakeRgb }         from './intake/IntakeRgb.ts';
import { resolveRoles }      from './resolve/ResolveRoles.ts';

/**
 * Every core pipeline task shipped with `@studnicky/iridis`, ordered
 * `intake → clamp → resolve → expand → enforce → derive → emit` so a
 * caller that just wants "the canonical pipeline" can register and
 * `engine.pipeline(coreTasks.map(t => t.name))` without thinking about
 * dependencies between phases.
 */
export const coreTasks: readonly TaskInterface[] = [
  intakeHex,
  intakeRgb,
  intakeHsl,
  intakeOklch,
  intakeLab,
  intakeNamed,
  intakeImagePixels,
  intakeP3,
  intakeAny,
  clampCount,
  clampOklch,
  resolveRoles,
  expandFamily,
  enforceContrast,
  deriveVariant,
  emitJson
];
