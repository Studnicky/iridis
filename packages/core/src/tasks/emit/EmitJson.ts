import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';

interface JsonOutput {
  'colors':   string[];
  'roles':    Record<string, string>;
  'variants': Record<string, Record<string, string>>;
}

function toHex(color: ColorRecordInterface): string {
  return color.hex;
}

/**
 * Pipeline task that flattens the rich `ColorRecord` state into a plain
 * `{colors, roles, variants}` object of hex strings at
 * `state.outputs.json`. The lowest-common-denominator output — anything
 * that can read JSON can consume it, with no knowledge of the OKLCH /
 * Display P3 enrichments still present on the original records.
 */
export class EmitJson implements TaskInterface {
  readonly 'name' = 'emit:json';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'emit:json',
    'reads':       ['colors', 'roles', 'variants'],
    'writes':      ['outputs.json'],
    'description': 'Writes state.outputs.json with {colors, roles, variants} flattened to hex strings.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const colors = state.colors.map(toHex);

    const roles: Record<string, string> = {};
    for (const [name, color] of Object.entries(state.roles)) {
      roles[name] = toHex(color);
    }

    const variants: Record<string, Record<string, string>> = {};
    for (const [variantName, variantRoles] of Object.entries(state.variants)) {
      const flat: Record<string, string> = {};
      for (const [roleName, color] of Object.entries(variantRoles)) {
        flat[roleName] = toHex(color);
      }
      variants[variantName] = flat;
    }

    const output: JsonOutput = { colors, roles, variants };
    state.outputs['json'] = output;

    ctx.logger.debug(
      'EmitJson',
      'run',
      `Wrote json output: ${colors.length} colors, ${Object.keys(roles).length} roles, ${Object.keys(variants).length} variants`,
    );
  }
}

/** Singleton instance registered as the `emit:json` pipeline task. */
export const emitJson = new EmitJson();
