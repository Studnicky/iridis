import type { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';

import { PaletteResolveRequestEntity } from '../entities/PaletteResolveRequestEntity.ts';
import { WorkerMessageEntity } from '../entities/WorkerMessageEntity.ts';
import { PaletteResolve } from '../paletteResolve.ts';
import { PaletteSessionInput } from './PaletteSessionInput.ts';
import { PaletteSessionRelationshipGraph } from './PaletteSessionRelationshipGraph.ts';

/** Builds worker lane messages from the session input; role relationships come from the selected schema's graph with the chosen modes applied. */
export class PaletteSessionRequest {
  public static combine(input: PaletteSessionInputEntity.Type, hexes: readonly string[]): WorkerMessageEntity.Type {
    const graph = PaletteSessionRelationshipGraph.from(input);
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

  public static feasibility(input: PaletteSessionInputEntity.Type): WorkerMessageEntity.Type {
    const result = WorkerMessageEntity.create({ 'kind': 'schema-feasibility', 'request': PaletteSessionRequest.resolveRequest(input) });
    return result;
  }

  public static palette(input: PaletteSessionInputEntity.Type): WorkerMessageEntity.Type {
    const result = WorkerMessageEntity.create({ 'kind': 'palette', 'request': PaletteSessionRequest.resolveRequest(input) });
    return result;
  }

  private static resolveRequest(input: PaletteSessionInputEntity.Type): PaletteResolveRequestEntity.Type {
    const graph = PaletteSessionRelationshipGraph.from(input);
    const result = PaletteResolveRequestEntity.create({
      'colorSpace': input.colorSpace,
      'cvdMode': input.cvdMode,
      'enableOutputs': true,
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
    return result;
  }
}
