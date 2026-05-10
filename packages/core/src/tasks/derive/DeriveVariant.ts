import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

interface VariantConfig {
  'name':  string;
  'invertLightness': boolean;
  'lightnessOffset'?: number;
}

const DEFAULT_VARIANTS: readonly VariantConfig[] = [
  { 'name': 'dark',  'invertLightness': true  },
  { 'name': 'light', 'invertLightness': false },
];

function invertLightness(color: ColorRecordInterface): ColorRecordInterface {
  const { l, c, h } = color.oklch;
  const inverted = 1 - l;
  return colorRecordFactory.fromOklch(
    Math.max(0, Math.min(1, inverted)),
    Math.max(0, Math.min(0.5, c)),
    h,
    color.alpha,
  );
}

function offsetLightness(color: ColorRecordInterface, offset: number): ColorRecordInterface {
  const { l, c, h } = color.oklch;
  return colorRecordFactory.fromOklch(
    Math.max(0, Math.min(1, l + offset)),
    Math.max(0, Math.min(0.5, c)),
    h,
    color.alpha,
  );
}

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
    const configs: readonly VariantConfig[] = Array.isArray(configRaw)
      ? (configRaw as VariantConfig[])
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
      ctx.logger.debug(
        'DeriveVariant',
        'run',
        `Derived variant "${config.name}" with ${roleNames.length} roles`,
      );
    }
  }
}

export const deriveVariant = new DeriveVariant();
