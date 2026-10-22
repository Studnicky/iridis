import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorRecordEntity } from '../../entities/ColorRecordEntity.ts';
import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '../../types/index.ts';

import { TaskManifestEntity } from '../../entities/TaskManifestEntity.ts';
import { VariantConfigEntity } from '../../entities/VariantConfigEntity.ts';
import { PaletteRoleState } from '../../interfaces/PaletteStateInterface.ts';
import { clamp } from '../../math/Clamp.ts';
import { clamp01 } from '../../math/Clamp01.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

const DEFAULT_VARIANTS: readonly VariantConfigEntity.Type[] = [
  VariantConfigEntity.create({ 'invertLightness': true, 'name': 'dark' }),
  VariantConfigEntity.create({ 'invertLightness': false, 'name': 'light' })
];

class VariantLightness {
  static invert(color: ColorRecordEntity.Type): ColorRecordEntity.Type {
    const { c, h, l } = color.oklch;
    const inverted = 1 - l;
    const result = colorRecordFactory.fromOklch(
      clamp01.apply(inverted),
      clamp.apply(0, 0.5, c),
      h,
      { 'alpha': color.alpha }
    );
    return result;
  }

  static offset(color: ColorRecordEntity.Type, offset: number): ColorRecordEntity.Type {
    const { c, h, l } = color.oklch;
    const result = colorRecordFactory.fromOklch(
      clamp01.apply(l + offset),
      clamp.apply(0, 0.5, c),
      h,
      { 'alpha': color.alpha }
    );
    return result;
  }

  static target(color: ColorRecordEntity.Type, target: number): ColorRecordEntity.Type {
    const { c, h } = color.oklch;
    const result = colorRecordFactory.fromOklch(
      clamp01.apply(target),
      clamp.apply(0, 0.5, c),
      h,
      { 'alpha': color.alpha }
    );
    return result;
  }

  static apply(
    color: ColorRecordEntity.Type,
    config: VariantConfigEntity.Type
  ): ColorRecordEntity.Type {
    if (config.invertLightness) {
      const result = VariantLightness.invert(color);
      return result;
    }
    if (config.lightnessTarget !== undefined) {
      const result = VariantLightness.target(color, config.lightnessTarget);
      return result;
    }
    if (config.lightnessOffset !== undefined) {
      const result = VariantLightness.offset(color, config.lightnessOffset);
      return result;
    }
    return color;
  }
}

class VariantRecord {
  static fromEntries(entries: Iterable<readonly [string, ColorRecordEntity.Type]>): Record<string, ColorRecordEntity.Type> {
    const result: Record<string, ColorRecordEntity.Type> = {};
    for (const [name, color] of entries) {
      Object.defineProperty(result, name, { 'configurable': true, 'enumerable': true, 'value': color, 'writable': true });
    }
    return result;
  }

  static fromRoleNames(
    roleNames: readonly string[],
    source: PaletteRoleState,
    config: VariantConfigEntity.Type
  ): Map<string, ColorRecordEntity.Type> {
    const result = new Map<string, ColorRecordEntity.Type>();
    for (let index = 0; index < roleNames.length; index += 1) {
      const roleName = roleNames.at(index);
      if (roleName !== undefined) {
        const color = source.get(roleName);
        if (color !== undefined) {
          result.set(roleName, VariantLightness.apply(color, config));
        }
      }
    }
    return result;
  }

  static write(
    target: Record<string, Record<string, ColorRecordEntity.Type>>,
    name: string,
    roles: Map<string, ColorRecordEntity.Type>
  ): void {
    Object.defineProperty(target, name, {
      'configurable': true,
      'enumerable':   true,
      'value':        VariantRecord.fromEntries(roles),
      'writable':     true
    });
  }
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

  readonly 'manifest': TaskManifestEntity.Type = TaskManifestEntity.create({
    'description': 'Produces light/dark variants by transforming all roles. Reads variantConfig from metadata or uses light/dark defaults.',
    'name':        'derive:variant',
    'reads':       ['roles', 'metadata[\'core:variantConfig\']'],
    'writes':      ['variants']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const configRaw = state.metadata['core:variantConfig'];
    const configs: readonly VariantConfigEntity.Type[] = Array.isArray(configRaw)
      && configRaw.every(VariantConfigEntity.validate)
      ? configRaw.map(VariantConfigEntity.intake)
      : DEFAULT_VARIANTS;

    const roleNames = Object.keys(state.roles);

    if (roleNames.length === 0) {
      context.logger.debug(
        LogBody.create({
          'component': 'DeriveVariant',
          'context': {},
          'message': 'No roles assigned; skipping variant derivation',
          'operation': 'run',
          'status': LOG_STATUS.SKIPPED
        })
      );
      return;
    }

    const paletteRoles = PaletteRoleState.admit(state.roles);
    for (let configIndex = 0; configIndex < configs.length; configIndex += 1) {
      const config = configs.at(configIndex);
      if (config === undefined) {
        continue;
      }
      const variantRoles = VariantRecord.fromRoleNames(roleNames, paletteRoles, config);
      VariantRecord.write(state.variants, config.name, variantRoles);
      context.logger.debug(
        LogBody.create({
          'component': 'DeriveVariant',
          'context': {
            'roleCount': roleNames.length,
            'variant':   config.name
          },
          'message': 'Derived variant',
          'operation': 'run',
          'status': LOG_STATUS.SUCCESS
        })
      );
    }
  }
}

/** Singleton instance registered as the `derive:variant` pipeline task. */
export const deriveVariant = new DeriveVariant();
