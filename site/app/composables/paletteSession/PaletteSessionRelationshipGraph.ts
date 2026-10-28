import { RoleRelationshipGraphEntity } from '@studnicky/iridis';

import type { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';

import { roleSchemaByName } from '../../theme/RoleSchemaByName.ts';
import { RelationshipModeSelectionEntity } from './entities/RelationshipModeSelectionEntity.ts';

/** The relationship graph a session input resolves against: the selected schema's own graph with the chosen mode of each group applied. */
export class PaletteSessionRelationshipGraph {
  /** The graph resolution and feasibility run against; absent when the schema declares none. */
  public static from(input: PaletteSessionInputEntity.Type): RoleRelationshipGraphEntity.Type | undefined {
    const base = PaletteSessionRelationshipGraph.base(input);
    let result: RoleRelationshipGraphEntity.Type | undefined;
    if (base !== undefined) {
      const selected = new Map(input.relationshipModes.map((entry) => {
        const pair = [entry.groupId, entry.modeId] as const;
        return pair;
      }));
      const groups = base.groups.map((group) => {
        const modeId = selected.get(group.id);
        const modeIds = new Set(group.modes.map((mode) => {
          const identifier = mode.id;
          return identifier;
        }));
        const next = modeId !== undefined && modeIds.has(modeId) ? { ...group, 'defaultMode': modeId } : group;
        return next;
      });
      result = RoleRelationshipGraphEntity.intake({ 'groups': groups });
    }
    return result;
  }

  /** The selection list with `groupId` set to `modeId`; throws when the schema's graph has no such group or mode. */
  public static select(input: PaletteSessionInputEntity.Type, groupId: string, modeId: string): PaletteSessionInputEntity.Type['relationshipModes'] {
    const base = PaletteSessionRelationshipGraph.base(input);
    if (base === undefined) {
      throw new RangeError('The selected schema has no relationship graph');
    }
    const group = base.groups.find((candidate) => {
      const found = candidate.id === groupId;
      return found;
    });
    if (group === undefined) {
      throw new RangeError(`Relationship graph has no group "${groupId}"`);
    }
    const mode = group.modes.find((candidate) => {
      const found = candidate.id === modeId;
      return found;
    });
    if (mode === undefined) {
      throw new RangeError(`Relationship group "${groupId}" has no mode "${modeId}"`);
    }
    const kept = input.relationshipModes.filter((entry) => {
      const other = entry.groupId !== groupId;
      return other;
    });
    const result = [...kept, RelationshipModeSelectionEntity.intake({ 'groupId': groupId, 'modeId': modeId })];
    return result;
  }

  private static base(input: PaletteSessionInputEntity.Type): RoleRelationshipGraphEntity.Type | undefined {
    const pair = roleSchemaByName[input.schemaName];
    const definition = input.framing === 'dark' ? pair.dark : pair.light;
    const graph = definition.relationshipGraph;
    const result = graph === undefined ? undefined : RoleRelationshipGraphEntity.intake(structuredClone(graph));
    return result;
  }
}
