/**
 * One-liner convenience entry point: hex seeds in, four-role palette
 * out. Wraps a fresh `Engine` registered with every built-in math
 * primitive and core task, runs `intake:hex → resolve:roles`, and
 * returns the assigned hex strings. Drop back to `Engine.run(input)`
 * for any non-trivial use case.
 */

import type { FramingType, QuickPaletteInterfaceType, RoleSchemaInterfaceType } from './types/index.ts';

import { Engine }                  from './engine/Engine.ts';
import { coreTasks }               from './tasks/index.ts';

const SCHEMA_DARK: RoleSchemaInterfaceType = {
  'name':  'quick-dark',
  'roles': [
    { 'chromaRange': [0, 0.04], 'intent': 'background', 'lightnessRange': [0.05, 0.12],   'name': 'background', 'required': true },
    { 'chromaRange': [0, 0.03], 'intent': 'text', 'lightnessRange': [0.94, 0.99],   'name': 'foreground', 'required': true },
    { 'chromaRange': [0.14, 0.28],     'intent': 'accent', 'lightnessRange': [0.62, 0.78], 'name': 'accent', 'required': true },
    { 'chromaRange': [0, 0.05],      'intent': 'muted', 'lightnessRange': [0.55, 0.70],  'name': 'muted', 'required': true }
  ]
};

const SCHEMA_LIGHT: RoleSchemaInterfaceType = {
  'name':  'quick-light',
  'roles': [
    { 'chromaRange': [0, 0.02], 'intent': 'background', 'lightnessRange': [0.96, 1.0],   'name': 'background',  'required': true },
    { 'chromaRange': [0, 0.03], 'intent': 'text', 'lightnessRange': [0.10, 0.20],   'name': 'foreground', 'required': true },
    { 'chromaRange': [0.12, 0.24],     'intent': 'accent', 'lightnessRange': [0.42, 0.55], 'name': 'accent', 'required': true },
    { 'chromaRange': [0, 0.04],      'intent': 'muted', 'lightnessRange': [0.40, 0.55],  'name': 'muted', 'required': true }
  ]
};

const PIPELINE: readonly string[] = ['intake:hex', 'resolve:roles'];

/**
 * Resolves `seeds` into a four-role hex palette under the given framing
 * (`'dark'` by default). Constructs a throwaway engine each call, so
 * this is appropriate for one-shot use; prefer a long-lived `Engine`
 * for anything that runs more than a handful of times.
 */
export function quickPalette(
  seeds: readonly string[],
  framing: FramingType = 'dark'
): QuickPaletteInterfaceType {
  const engine = new Engine();
  for (const t of coreTasks)    {engine.tasks.register(t);}
  engine.pipeline(PIPELINE);

  const schema = framing === 'light' ? SCHEMA_LIGHT : SCHEMA_DARK;
  const state = engine.run({
    'colors':  seeds,
    'roles':   schema,
    'runtime': { 'framing': framing }
  });

  return {
    'accent':     state.roles.accent!.hex,
    'background': state.roles.background!.hex,
    'foreground': state.roles.foreground!.hex,
    'muted':      state.roles.muted!.hex
  };
}
