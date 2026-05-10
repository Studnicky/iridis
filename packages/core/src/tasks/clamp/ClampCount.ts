import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';

const DEFAULT_MAX = 64;

export class ClampCount implements TaskInterface {
  readonly 'name' = 'clamp:count';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'clamp:count',
    'reads':       ['colors', 'input.maxColors', 'input.bypass'],
    'writes':      ['colors'],
    'requires':    ['clusterMedianCut'],
    'description': 'Reduces state.colors to maxColors (default 64) via median-cut clustering when the limit is exceeded and bypass is not set.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    if (state.input.bypass) {
      return;
    }

    const max = state.input.maxColors ?? DEFAULT_MAX;

    if (state.colors.length <= max) {
      return;
    }

    ctx.logger.info(
      'ClampCount',
      'run',
      `Reducing ${state.colors.length} colors → ${max} via clusterMedianCut`,
    );

    const clustered = ctx.math.invoke<ColorRecordInterface[]>(
      'clusterMedianCut',
      state.colors,
      max,
    );

    state.colors.length = 0;
    for (const c of clustered) {
      state.colors.push(c);
    }
  }
}

export const clampCount = new ClampCount();
