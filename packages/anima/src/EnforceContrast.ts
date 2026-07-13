import { Engine, colorRecordFactory, consoleLogger } from '@studnicky/iridis';
import type {
  ColorRecordInterfaceType,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface
} from '@studnicky/iridis';
import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';
import { enforceWcagAa, enforceWcagAaa } from '@studnicky/iridis-contrast';

import type { ContrastPairInputInterfaceType, EnforceLevelType } from './types/index.ts';

const enforceTaskByLevel = { 'aa': enforceWcagAa, 'aaa': enforceWcagAaa } as const;

const buildState = (
  palette: PaletteInterfaceType,
  pairs: readonly ContrastPairInputInterfaceType[]
): PaletteStateInterface => {
  const roles: Record<string, ColorRecordInterfaceType> = {};
  for (const [role, oklch] of Object.entries(palette)) {
    roles[role] = colorRecordFactory.fromOklch(oklch.l, oklch.c, oklch.h);
  }

  const roleNames = new Set<string>();
  for (const pair of pairs) {
    roleNames.add(pair.foreground);
    roleNames.add(pair.background);
  }

  const input: InputInterface = {
    'colors': [],
    'roles': {
      'contrastPairs': pairs.map((pair) => ({
        'algorithm':  pair.algorithm ?? 'wcag21',
        'background': pair.background,
        'foreground': pair.foreground,
        'minRatio':   pair.minRatio ?? 4.5
      })),
      'name':  'anima:frame',
      'roles': [...roleNames].map((name) => ({ 'name': name, 'required': true }))
    }
  };

  return {
    'colors':   [],
    'input':    input,
    'metadata': {},
    'outputs':  {},
    'roles':    roles,
    'runtime':  {},
    'variants': {}
  };
};

/**
 * Re-validates one evaluated palette frame against WCAG contrast pairs by
 * calling the real `@studnicky/iridis-contrast` enforce task (which both
 * checks and corrects in place), rather than reimplementing contrast
 * correction math. Roles not named in any pair pass through unchanged.
 */
export const enforceContrast = (
  palette: PaletteInterfaceType,
  pairs: readonly ContrastPairInputInterfaceType[],
  level: EnforceLevelType = 'aa'
): PaletteInterfaceType => {
  if (pairs.length === 0) return palette;

  const state  = buildState(palette, pairs);
  const engine = new Engine();
  const ctx: PipelineContextInterface = {
    'engine':    engine,
    'logger':    consoleLogger,
    'startedAt': Date.now(),
    'tasks':     engine.tasks
  };

  enforceTaskByLevel[level].run(state, ctx);

  const result: PaletteInterfaceType = { ...palette };
  for (const role of Object.keys(palette)) {
    const record = state.roles[role];
    if (record === undefined) continue;
    result[role] = { 'c': record.oklch.c, 'h': record.oklch.h, 'l': record.oklch.l };
  }
  return result;
};
