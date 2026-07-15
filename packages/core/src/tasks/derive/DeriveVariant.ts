import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType,
  VariantConfigInterfaceType
} from '../../types/index.ts';

import { clamp } from '../../math/Clamp.ts';
import { clamp01 } from '../../math/Clamp01.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

const DEFAULT_VARIANTS: readonly VariantConfigInterfaceType[] = [
  { 'invertLightness': true,  'lightnessOffset': undefined, 'lightnessTarget': undefined, 'name': 'dark'  },
  { 'invertLightness': false, 'lightnessOffset': undefined, 'lightnessTarget': undefined, 'name': 'light' }
];

function invertLightness(color: ColorRecordInterfaceType): ColorRecordInterfaceType {
  const { c, h, l } = color.oklch;
  const inverted = 1 - l;
  return colorRecordFactory.fromOklch(
    clamp01.apply(inverted),
    clamp.apply(0, 0.5, c),
    h,
    { 'alpha': color.alpha }
  );
}

function offsetLightness(color: ColorRecordInterfaceType, offset: number): ColorRecordInterfaceType {
  const { c, h, l } = color.oklch;
  return colorRecordFactory.fromOklch(
    clamp01.apply(l + offset),
    clamp.apply(0, 0.5, c),
    h,
    { 'alpha': color.alpha }
  );
}

function targetLightness(color: ColorRecordInterfaceType, target: number): ColorRecordInterfaceType {
  const { c, h } = color.oklch;
  return colorRecordFactory.fromOklch(
    clamp01.apply(target),
    clamp.apply(0, 0.5, c),
    h,
    { 'alpha': color.alpha }
  );
}

/**
 * Pipeline task that produces alternative framings of every assigned
 * role. With the default config it emits `dark` (lightness inverted)
 * and `light` (lightness untouched) variants; callers can override by
 * setting `state.metadata['core:variantConfig']` to an array of named configs
 * with `invertLightness` and/or `lightnessOffset`.
 *
 * Variants live in `state.variants[name]` keyed by role, parallel to
 * `state.roles`. Emitters consume both surfaces: the canonical role
 * set for the active framing and the variants for the inverse.
 */
class DeriveVariant implements TaskInterface {
  readonly 'name' = 'derive:variant';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Produces light/dark variants by transforming all roles. Reads variantConfig from metadata or uses light/dark defaults.',
    'name':        'derive:variant',
    'phase':       undefined,
    'reads':       ['roles', 'metadata[\'core:variantConfig\']'],
    'requires':    undefined,
    'writes':      ['variants']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const configRaw = state.metadata['core:variantConfig'];
    const configs: readonly VariantConfigInterfaceType[] = Array.isArray(configRaw)
      ? configRaw
      : DEFAULT_VARIANTS;

    const roleNames = Object.keys(state.roles);

    if (roleNames.length === 0) {
      ctx.logger.debug(
        LogBody.create()
          .component('DeriveVariant')
          .operation('run')
          .status(LOG_STATUS.SKIPPED)
          .message('No roles assigned; skipping variant derivation')
          .context({})
          .build()
      );
      return;
    }

    for (const config of configs) {
      const variantRoles: Record<string, ColorRecordInterfaceType> = {};

      for (const roleName of roleNames) {
        const color = state.roles[roleName];
        if (color === undefined) {continue;}

        if (config.invertLightness) {
          variantRoles[roleName] = invertLightness(color);
        } else if (config.lightnessTarget !== undefined) {
          variantRoles[roleName] = targetLightness(color, config.lightnessTarget);
        } else if (config.lightnessOffset !== undefined) {
          variantRoles[roleName] = offsetLightness(color, config.lightnessOffset);
        } else {
          variantRoles[roleName] = color;
        }
      }

      state.variants[config.name] = variantRoles;
      ctx.logger.debug(
        LogBody.create()
          .component('DeriveVariant')
          .operation('run')
          .status(LOG_STATUS.SUCCESS)
          .message('Derived variant')
          .context({
            'roleCount': roleNames.length,
            'variant':   config.name
          })
          .build()
      );
    }
  }
}

/** Singleton instance registered as the `derive:variant` pipeline task. */
export const deriveVariant = new DeriveVariant();
