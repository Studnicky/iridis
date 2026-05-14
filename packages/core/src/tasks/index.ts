import type { TaskInterface } from '../types/index.ts';

export { intakeHex,         IntakeHex }         from './intake/IntakeHex.ts';
export { intakeRgb,         IntakeRgb }         from './intake/IntakeRgb.ts';
export { intakeHsl,         IntakeHsl }         from './intake/IntakeHsl.ts';
export { intakeOklch,       IntakeOklch }       from './intake/IntakeOklch.ts';
export { intakeLab,         IntakeLab }         from './intake/IntakeLab.ts';
export { intakeNamed,       IntakeNamed }       from './intake/IntakeNamed.ts';
export { intakeImagePixels, IntakeImagePixels } from './intake/IntakeImagePixels.ts';
export { intakeP3,          IntakeP3 }          from './intake/IntakeP3.ts';
export { intakeAny,         IntakeAny }         from './intake/IntakeAny.ts';

export { clampCount, ClampCount } from './clamp/ClampCount.ts';
export { clampOklch, ClampOklch } from './clamp/ClampOklch.ts';

export { resolveRoles, ResolveRoles } from './resolve/ResolveRoles.ts';

export { expandFamily, ExpandFamily } from './expand/ExpandFamily.ts';

export { enforceContrast, EnforceContrast } from './enforce/EnforceContrast.ts';

export { deriveVariant, DeriveVariant } from './derive/DeriveVariant.ts';

export { emitJson, EmitJson } from './emit/EmitJson.ts';

import { intakeHex }         from './intake/IntakeHex.ts';
import { intakeRgb }         from './intake/IntakeRgb.ts';
import { intakeHsl }         from './intake/IntakeHsl.ts';
import { intakeOklch }       from './intake/IntakeOklch.ts';
import { intakeLab }         from './intake/IntakeLab.ts';
import { intakeNamed }       from './intake/IntakeNamed.ts';
import { intakeImagePixels } from './intake/IntakeImagePixels.ts';
import { intakeP3 }          from './intake/IntakeP3.ts';
import { intakeAny }         from './intake/IntakeAny.ts';
import { clampCount }        from './clamp/ClampCount.ts';
import { clampOklch }        from './clamp/ClampOklch.ts';
import { resolveRoles }      from './resolve/ResolveRoles.ts';
import { expandFamily }      from './expand/ExpandFamily.ts';
import { enforceContrast }   from './enforce/EnforceContrast.ts';
import { deriveVariant }     from './derive/DeriveVariant.ts';
import { emitJson }          from './emit/EmitJson.ts';

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
  emitJson,
];
