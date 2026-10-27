import { RoleRelationshipGraphEntity } from '@studnicky/iridis';

import type { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';

import { roleSchemaByName } from '../../theme/RoleSchemaByName.ts';
import { PaletteResolveRequestEntity } from '../entities/PaletteResolveRequestEntity.ts';
import { WorkerMessageEntity } from '../entities/WorkerMessageEntity.ts';
import { PaletteResolve } from '../paletteResolve.ts';
import { PaletteSessionInput } from './PaletteSessionInput.ts';

/** Builds worker lane messages from the session input; role relationships come from the selected schema's own graph. */
export class PaletteSessionRequest {
  public static combine(input: PaletteSessionInputEntity.Type, hexes: readonly string[]): WorkerMessageEntity.Type {
    const graph = PaletteSessionRequest.graph(input);
    const result = WorkerMessageEntity.create({
      'colorSpace': input.colorSpace,
      'cvdMode': input.cvdMode,
      'enableStrictCompliance': input.enableStrictCompliance,
      'framing': input.framing,
      'hexes': [...hexes],
      'kind': 'combine',
      'nonMandatoryLevel': input.nonMandatoryLevel,
      ...(graph === undefined ? {} : { 'relationshipGraph': graph }),
      'schemaName': input.schemaName,
      'settings': input.imageTuning,
      'strictness': input.strictness
    });
    return result;
  }

  public static palette(input: PaletteSessionInputEntity.Type): WorkerMessageEntity.Type {
    const graph = PaletteSessionRequest.graph(input);
    const request = PaletteResolveRequestEntity.create({
      'colorSpace': input.colorSpace,
      'cvdMode': input.cvdMode,
      'enableStrictCompliance': input.enableStrictCompliance,
      'framing': input.framing,
      'nonMandatoryLevel': input.nonMandatoryLevel,
      ...(graph === undefined ? {} : { 'relationshipGraph': graph }),
      'schemaName': input.schemaName,
      'seeds': PaletteResolve.seeds(PaletteSessionInput.activeSeeds(input).map((seed) => {
        const picker = { 'hex': seed.hex, 'role': seed.role };
        return picker;
      })),
      'strictness': input.strictness
    });
    const result = WorkerMessageEntity.create({ 'kind': 'palette', 'request': request });
    return result;
  }

  private static graph(input: PaletteSessionInputEntity.Type): RoleRelationshipGraphEntity.Type | undefined {
    const pair = roleSchemaByName[input.schemaName];
    const definition = input.framing === 'dark' ? pair.dark : pair.light;
    const graph = definition.relationshipGraph;
    const result = graph === undefined ? undefined : RoleRelationshipGraphEntity.intake(structuredClone(graph));
    return result;
  }
}
