/**
 * One-liner convenience entry point: hex seeds in, four-role palette
 * out. Wraps a fresh `Engine` registered with every built-in math
 * primitive and core task, runs `intake:hex → resolve:roles`, and
 * returns the assigned hex strings. Drop back to `Engine.run(input)`
 * for any non-trivial use case.
 */

import type { FramingType, QuickPaletteInterfaceType } from './types/index.ts';

import { QUICK_PALETTE_DEFAULTS } from './constants/QuickPaletteDefaults.ts';
import { Engine }                 from './engine/Engine.ts';
import { coreTasks }              from './tasks/index.ts';

class QuickPalette {
  /**
   * Resolves `seeds` into a four-role hex palette under the given framing
   * (`'dark'` by default). Constructs a throwaway engine each call, so
   * this is appropriate for one-shot use; prefer a long-lived `Engine`
   * for anything that runs more than a handful of times.
   */
  static resolve(
    seeds: readonly string[],
    framing: FramingType = 'dark'
  ): QuickPaletteInterfaceType {
    const engine = new Engine();
    for (const task of coreTasks) { engine.tasks.register(task); }
    engine.pipeline(QUICK_PALETTE_DEFAULTS.PIPELINE);

    const schema = framing === 'light' ? QUICK_PALETTE_DEFAULTS.SCHEMA_LIGHT : QUICK_PALETTE_DEFAULTS.SCHEMA_DARK;
    const state = engine.run({
      'bypass':    undefined,
      'colors':    seeds,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     schema,
      'runtime':   { 'colorSpace': undefined, 'extra': undefined, 'framing': framing }
    });

    return {
      'accent':     state.roles.accent!.hex,
      'background': state.roles.background!.hex,
      'foreground': state.roles.foreground!.hex,
      'muted':      state.roles.muted!.hex
    };
  }
}

export { QuickPalette };
