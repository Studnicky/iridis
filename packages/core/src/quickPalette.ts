/**
 * One-liner convenience entry point: hex seeds in, four-role palette
 * out. Wraps a fresh `Engine` registered with every built-in math
 * primitive and core task, runs `intake:hex → resolve:roles`, and
 * returns the assigned hex strings. Drop back to `Engine.run(input)`
 * for any non-trivial use case.
 */

import { Engine }                  from './engine/Engine.ts';
import { coreTasks }               from './tasks/index.ts';
import { mathBuiltins }            from './math/index.ts';
import type { FramingType, RoleSchemaInterface } from './types/index.ts';

const SCHEMA_DARK: RoleSchemaInterface = {
  'name':  'quick-dark',
  'roles': [
    { 'name': 'background', 'required': true, 'intent': 'base',   'lightnessRange': [0.05, 0.12], 'chromaRange': [0, 0.04] },
    { 'name': 'foreground', 'required': true, 'intent': 'text',   'lightnessRange': [0.94, 0.99], 'chromaRange': [0, 0.03] },
    { 'name': 'accent',     'required': true, 'intent': 'accent', 'lightnessRange': [0.62, 0.78], 'chromaRange': [0.14, 0.28] },
    { 'name': 'muted',      'required': true, 'intent': 'muted',  'lightnessRange': [0.55, 0.70], 'chromaRange': [0, 0.05] },
  ],
};

const SCHEMA_LIGHT: RoleSchemaInterface = {
  'name':  'quick-light',
  'roles': [
    { 'name': 'background', 'required': true, 'intent': 'base',   'lightnessRange': [0.96, 1.0],  'chromaRange': [0, 0.02] },
    { 'name': 'foreground', 'required': true, 'intent': 'text',   'lightnessRange': [0.10, 0.20], 'chromaRange': [0, 0.03] },
    { 'name': 'accent',     'required': true, 'intent': 'accent', 'lightnessRange': [0.42, 0.55], 'chromaRange': [0.12, 0.24] },
    { 'name': 'muted',      'required': true, 'intent': 'muted',  'lightnessRange': [0.40, 0.55], 'chromaRange': [0, 0.04] },
  ],
};

/**
 * Output shape of {@link quickPalette}: the four canonical roles, each
 * resolved to a 6-digit hex string. Frozen by convention — callers
 * read; the engine writes.
 */
export interface QuickPaletteInterface {
  readonly background: string;
  readonly foreground: string;
  readonly accent:     string;
  readonly muted:      string;
}

const PIPELINE: readonly string[] = ['intake:hex', 'resolve:roles'];

/**
 * Resolves `seeds` into a four-role hex palette under the given framing
 * (`'dark'` by default). Constructs a throwaway engine each call, so
 * this is appropriate for one-shot use; prefer a long-lived `Engine`
 * for anything that runs more than a handful of times.
 */
export async function quickPalette(
  seeds: readonly string[],
  framing: FramingType = 'dark',
): Promise<QuickPaletteInterface> {
  const engine = new Engine();
  for (const m of mathBuiltins) engine.math.register(m);
  for (const t of coreTasks)    engine.tasks.register(t);
  engine.pipeline(PIPELINE);

  const schema = framing === 'light' ? SCHEMA_LIGHT : SCHEMA_DARK;
  const state = await engine.run({
    'colors':  seeds,
    'roles':   schema,
    'runtime': { 'framing': framing },
  });

  return {
    'background': state.roles['background']!.hex,
    'foreground': state.roles['foreground']!.hex,
    'accent':     state.roles['accent']!.hex,
    'muted':      state.roles['muted']!.hex,
  };
}
