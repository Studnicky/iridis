/**
 * quickPalette.ts
 *
 * One-liner convenience: give it seed colors, get back a role-resolved
 * hex palette. Uses a sensible four-role default schema, framing-aware
 * lightness clamps, and the canonical pipeline. For full control, drop
 * back to `engine.run(input)`.
 *
 * Example
 *   import { quickPalette } from '@studnicky/iridis';
 *   const palette = await quickPalette(['#7c3aed', '#06b6d4'], 'dark');
 *   //   palette.background === '#0a0a14'
 *   //   palette.foreground === '#f0f0ff'
 *   //   palette.accent     === '#7c3aed'
 *   //   palette.muted      === '#7e7e95'
 */

import { Engine }                  from './engine/Engine.ts';
import { coreTasks }               from './tasks/index.ts';
import { mathBuiltins }            from './math/index.ts';
import type { FramingType, RoleSchemaInterface } from './model/types.ts';

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

export interface QuickPaletteInterface {
  readonly background: string;
  readonly foreground: string;
  readonly accent:     string;
  readonly muted:      string;
}

const PIPELINE: readonly string[] = ['intake:hex', 'resolve:roles'];

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
