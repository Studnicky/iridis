import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
  VariantConfigInterface,
} from '../../types/index.ts';
import { clamp } from '../../math/Clamp.ts';
import { clamp01 } from '../../math/Clamp01.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

const DEFAULT_VARIANTS: readonly VariantConfigInterface[] = [
  { 'name': 'dark',  'invertLightness': true  },
  { 'name': 'light', 'invertLightness': false },
];

function invertLightness(color: ColorRecordInterface): ColorRecordInterface {
  const { l, c, h } = color.oklch;
  const inverted = 1 - l;
  return colorRecordFactory.fromOklch(
    clamp01.apply(inverted),
    clamp.apply(0, 0.5, c),
    h,
    color.alpha,
  );
}

function offsetLightness(color: ColorRecordInterface, offset: number): ColorRecordInterface {
  const { l, c, h } = color.oklch;
  return colorRecordFactory.fromOklch(
    clamp01.apply(l + offset),
    clamp.apply(0, 0.5, c),
    h,
    color.alpha,
  );
}

/**
 * Pipeline task that produces alternative framings of every assigned
 * role. With the default config it emits `dark` (lightness inverted)
 * and `light` (lightness untouched) variants; callers can override by
 * setting `state.metadata.variantConfig` to an array of named configs
 * with `invertLightness` and/or `lightnessOffset`.
 *
 * Variants live in `state.variants[name]` keyed by role, parallel to
 * `state.roles`. Emitters consume both surfaces — the canonical role
 * set for the active framing and the variants for the inverse.
 */
export class DeriveVariant implements TaskInterface {
  readonly 'name' = 'derive:variant';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'derive:variant',
    'reads':       ['roles', 'metadata.variantConfig'],
    'writes':      ['variants'],
    'description': 'Produces light/dark variants by transforming all roles. Reads variantConfig from metadata or uses light/dark defaults.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const configRaw = state.metadata['variantConfig'];
    const configs: readonly VariantConfigInterface[] = Array.isArray(configRaw)
      ? configRaw
      : DEFAULT_VARIANTS;

    const roleNames = Object.keys(state.roles);

    if (roleNames.length === 0) {
      ctx.logger.debug('DeriveVariant', 'run', 'No roles assigned — skipping variant derivation');
      return;
    }

    for (const config of configs) {
      const variantRoles: Record<string, ColorRecordInterface> = {};

      for (const roleName of roleNames) {
        const color = state.roles[roleName];
        if (!color) continue;

        if (config.invertLightness) {
          variantRoles[roleName] = invertLightness(color);
        } else if (config.lightnessOffset !== undefined) {
          variantRoles[roleName] = offsetLightness(color, config.lightnessOffset);
        } else {
          variantRoles[roleName] = color;
        }
      }

      state.variants[config.name] = variantRoles;
      ctx.logger.debug('DeriveVariant', 'run', 'Derived variant', {
        'variant':   config.name,
        'roleCount': roleNames.length,
      });
    }
  }
}

/** Singleton instance registered as the `derive:variant` pipeline task. */
export const deriveVariant = new DeriveVariant();
