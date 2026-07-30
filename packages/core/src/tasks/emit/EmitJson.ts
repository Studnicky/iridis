import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { JsonOutputEntity } from '../../entities/JsonOutputEntity.ts';
import type { PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';
import type { ColorRecordInterfaceType } from '../../types/color.ts';
import type { TaskManifestInterfaceType } from '../../types/pipeline.ts';

class Hex {
  static to(color: ColorRecordInterfaceType): string {
    const result = color.hex;
    return result;
  }
}

/**
 * Pipeline task that flattens the rich `ColorRecord` state into a plain
 * `{colors, roles, variants}` object of hex strings at
 * `state.outputs['core:json']`. The lowest-common-denominator output: anything
 * that can read JSON can consume it, with no knowledge of the OKLCH /
 * Display P3 enrichments still present on the original records.
 */
class EmitJson implements TaskInterface {
  readonly 'name' = 'emit:json';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Writes state.outputs[\'core:json\'] with {colors, roles, variants} flattened to hex strings.',
    'name':        'emit:json',
    'phase':       undefined,
    'reads':       ['colors', 'roles', 'variants'],
    'requires':    undefined,
    'writes':      ['outputs[\'core:json\']']
  };

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const colors = state.colors.map(Hex.to);

    const roles: Record<string, string> = {};
    for (const [name, color] of Object.entries(state.roles)) {
      roles[name] = Hex.to(color);
    }

    const variants: Record<string, Record<string, string>> = {};
    for (const [variantName, variantRoles] of Object.entries(state.variants)) {
      const flat: Record<string, string> = {};
      for (const [roleName, color] of Object.entries(variantRoles)) {
        flat[roleName] = Hex.to(color);
      }
      variants[variantName] = flat;
    }

    const output: JsonOutputEntity.Type = { 'colors': colors, 'roles': roles, 'variants': variants };
    state.outputs['core:json'] = output;

    context.logger.debug(
      LogBody.create()
        .component('EmitJson')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Wrote json output')
        .context({
          'colors':   colors.length,
          'roles':    Object.keys(roles).length,
          'variants': Object.keys(variants).length
        })
        .build()
    );
  }
}

/** Singleton instance registered as the `emit:json` pipeline task. */
export const emitJson = new EmitJson();
