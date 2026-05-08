import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../model/types.ts';

interface JsonOutput {
  'colors':   string[];
  'roles':    Record<string, string>;
  'variants': Record<string, Record<string, string>>;
}

function toHex(color: ColorRecordInterface): string {
  return color.hex;
}

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

export const emitJson = new EmitJson();
