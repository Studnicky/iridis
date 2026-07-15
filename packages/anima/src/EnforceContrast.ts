import type {
  ColorRecordInterfaceType,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface
} from '@studnicky/iridis';
import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { colorRecordFactory, consoleLogger, Engine } from '@studnicky/iridis';
import { enforceWcagAa, enforceWcagAaa } from '@studnicky/iridis-contrast';

import type { ContrastPairInputInterfaceType, EnforceLevelType } from './types/index.ts';

const enforceTaskByLevel = { 'aa': enforceWcagAa, 'aaa': enforceWcagAaa } as const;

/**
 * Shared placeholder engine for `ctx.engine`/`ctx.tasks`. The enforce tasks
 * invoked below only read `ctx.logger`, never engine state, so one instance
 * is safe to reuse across every call instead of allocating a fresh
 * `TaskRegistry` + json-tology-backed `Validator` on every animation frame.
 */
const engine = new Engine();

/** Builds a {@link PaletteStateInterface} pipeline frame for the enforce tasks below. */
class State {
  static build(
    palette: PaletteInterfaceType,
    pairs: readonly ContrastPairInputInterfaceType[]
  ): PaletteStateInterface {
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
      'bypass':    undefined,
      'colors':    [],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles': {
        'contrastPairs': pairs.map((pair) => {return {
          'algorithm':  pair.algorithm ?? 'wcag21',
          'background': pair.background,
          'foreground': pair.foreground,
          'minRatio':   pair.minRatio ?? 4.5
        };}),
        'description': undefined,
        'name':  'anima:frame',
        'roles': [...roleNames].map((name) => {return {
          'chromaRange':    undefined,
          'derivedFrom':    undefined,
          'description':    undefined,
          'hue':            undefined,
          'hueClamp':       undefined,
          'hueOffset':      undefined,
          'intent':         undefined,
          'lightnessRange': undefined,
          'name':           name,
          'required':       true
        };})
      },
      'runtime':   undefined
    };

    return {
      'colors':   [],
      'input':    input,
      'metadata': {},
      'outputs':  {},
      'roles':    roles,
      'runtime':  { 'colorSpace': undefined, 'extra': undefined, 'framing': undefined },
      'variants': {}
    };
  }
}

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
  if (pairs.length === 0) {return palette;}

  const state = State.build(palette, pairs);
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
    if (record === undefined) {continue;}
    result[role] = { 'c': record.oklch.c, 'h': record.oklch.h, 'l': record.oklch.l };
  }
  return result;
};
