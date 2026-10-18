import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorRecordInterfaceTypeEntity } from '../../entities/ColorRecordInterfaceTypeEntity.ts';
import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '../../types/index.ts';

import { TaskManifestInterfaceTypeEntity } from '../../entities/TaskManifestInterfaceTypeEntity.ts';
import { VariantConfigInterfaceTypeEntity } from '../../entities/VariantConfigInterfaceTypeEntity.ts';
import { PaletteRoleState } from '../../interfaces/PaletteStateInterface.ts';
import { clamp } from '../../math/Clamp.ts';
import { clamp01 } from '../../math/Clamp01.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

const DEFAULT_VARIANTS: readonly VariantConfigInterfaceTypeEntity.Type[] = [
  VariantConfigInterfaceTypeEntity.create({ 'invertLightness': true, 'name': 'dark' }),
  VariantConfigInterfaceTypeEntity.create({ 'invertLightness': false, 'name': 'light' })
];

class VariantLightness {
  static invert(color: ColorRecordInterfaceTypeEntity.Type): ColorRecordInterfaceTypeEntity.Type {
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

  static offset(color: ColorRecordInterfaceTypeEntity.Type, offset: number): ColorRecordInterfaceTypeEntity.Type {
    const { c, h, l } = color.oklch;
    const result = colorRecordFactory.fromOklch(
      clamp01.apply(l + offset),
      clamp.apply(0, 0.5, c),
      h,
      { 'alpha': color.alpha }
    );
    return result;
  }

  static target(color: ColorRecordInterfaceTypeEntity.Type, target: number): ColorRecordInterfaceTypeEntity.Type {
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
    color: ColorRecordInterfaceTypeEntity.Type,
    config: VariantConfigInterfaceTypeEntity.Type
  ): ColorRecordInterfaceTypeEntity.Type {
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
  static fromEntries(entries: Iterable<readonly [string, ColorRecordInterfaceTypeEntity.Type]>): Record<string, ColorRecordInterfaceTypeEntity.Type> {
    const result: Record<string, ColorRecordInterfaceTypeEntity.Type> = {};
    for (const [name, color] of entries) {
      Object.defineProperty(result, name, { 'configurable': true, 'enumerable': true, 'value': color, 'writable': true });
    }
    return result;
  }

  static fromRoleNames(
    roleNames: readonly string[],
    source: PaletteRoleState,
    config: VariantConfigInterfaceTypeEntity.Type
  ): Map<string, ColorRecordInterfaceTypeEntity.Type> {
    const result = new Map<string, ColorRecordInterfaceTypeEntity.Type>();
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
    target: Record<string, Record<string, ColorRecordInterfaceTypeEntity.Type>>,
    name: string,
    roles: Map<string, ColorRecordInterfaceTypeEntity.Type>
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

  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({
    'description': 'Produces light/dark variants by transforming all roles. Reads variantConfig from metadata or uses light/dark defaults.',
    'name':        'derive:variant',
    'reads':       ['roles', 'metadata[\'core:variantConfig\']'],
    'writes':      ['variants']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const configRaw = state.metadata['core:variantConfig'];
    const configs: readonly VariantConfigInterfaceTypeEntity.Type[] = Array.isArray(configRaw)
      && configRaw.every(VariantConfigInterfaceTypeEntity.validate)
      ? configRaw.map(VariantConfigInterfaceTypeEntity.intake)
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
